import { test } from "node:test";
import assert from "node:assert/strict";
import { Types } from "mongoose";
import { workoutService } from "../dist/src/modules/workouts/workout.service.js";
import { logWorkoutSetSchema } from "../dist/src/modules/workouts/workout.validation.js";
import { workoutModel } from "../dist/src/database/models/workout.model.js";
import { workoutRepo } from "../dist/src/common/repo/workout.repo.js";
import { roleBasedAccessMiddleware } from "../dist/src/common/middleware/authorization.js";
import { roleEnum } from "../dist/src/common/enums/role.enum.js";

const clientId = "507f1f77bcf86cd799439011";
const planId = new Types.ObjectId("507f1f77bcf86cd799439012");
const exerciseId = new Types.ObjectId("507f1f77bcf86cd799439013");
const set = { exerciseName: "squat", setNumber: 1, reps: 10, weightKg: 0 };
const makeWorkout = () => new workoutModel({clientId, planId, dayName:'Day 1', exercises:[{exerciseId, exerciseName:'Squat', targetSets:3, targetReps:10, sets:[{setNumber:1,reps:8,weightKg:10}]}]});

test("set validation and client authorization", () => {
  const schema = logWorkoutSetSchema();
  assert.equal(schema.safeParse({body:set}).success,true);
  assert.equal(schema.safeParse({body:{...set,reps:0}}).success,false);
  assert.equal(schema.safeParse({body:{...set,weightKg:-1}}).success,false);
  assert.equal(schema.safeParse({body:{...set,clientId}}).success,false);
  const authorize = roleBasedAccessMiddleware([roleEnum.client]);
  assert.throws(() => authorize({user:{role:roleEnum.coach}}, {}, () => {}),{status:403});
});

test("logging and correcting a set is scoped and uses optimistic locking", async () => {
  const find = workoutRepo.findOne, update = workoutRepo.findOneAndUpdate;
  try {
    const workout = makeWorkout(); workout.__v = 2;
    workoutRepo.findOne = async ({filter}) => {assert.equal(String(filter.clientId),clientId);assert.equal(filter.status,'inProgress');return workout;};
    workoutRepo.findOneAndUpdate = async ({filter,update}) => {
      assert.equal(String(filter.clientId),clientId);
      assert.equal(filter.status,'inProgress');
      assert.equal(filter.__v,2);
      assert.equal(update.$inc.__v,1);
      assert.deepEqual(update.$set.exercises[0].sets,[{setNumber:1,reps:10,weightKg:0}]);
      return new workoutModel({...workout.toObject(),...update.$set});
    };
    const result = await workoutService.logSet(clientId,set);
    assert.equal(result.exercises[0].exerciseName,'Squat');
    assert.equal(result.exercises[0].sets[0].weightKg,0);
    assert.equal('clientId' in result,false);
  } finally { workoutRepo.findOne=find; workoutRepo.findOneAndUpdate=update; }
});

test("missing workouts, exercises and conflicting updates are rejected", async () => {
  const find = workoutRepo.findOne, update = workoutRepo.findOneAndUpdate;
  try {
    workoutRepo.findOne = async () => null;
    await assert.rejects(workoutService.logSet(clientId,set),{status:404});
    workoutRepo.findOne = async () => makeWorkout();
    await assert.rejects(workoutService.logSet(clientId,{...set,exerciseName:'Bench'}),{status:404});
    workoutRepo.findOneAndUpdate = async () => null;
    await assert.rejects(workoutService.logSet(clientId,set),{status:409});
  } finally { workoutRepo.findOne=find; workoutRepo.findOneAndUpdate=update; }
});
