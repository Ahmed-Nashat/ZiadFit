import { test } from "node:test";
import assert from "node:assert/strict";
import { Types } from "mongoose";
import { workoutService } from "../dist/src/modules/workouts/workout.service.js";
import { startWorkoutSchema } from "../dist/src/modules/workouts/workout.validation.js";
import { workoutRepo } from "../dist/src/common/repo/workout.repo.js";
import { trainingPlanRepo } from "../dist/src/common/repo/training-plan.repo.js";
import { exerciseRepo } from "../dist/src/common/repo/exercise.repo.js";
import { workoutModel } from "../dist/src/database/models/workout.model.js";
import { roleBasedAccessMiddleware } from "../dist/src/common/middleware/authorization.js";
import { roleEnum } from "../dist/src/common/enums/role.enum.js";

const clientId = "507f1f77bcf86cd799439011";
const planId = new Types.ObjectId("507f1f77bcf86cd799439012");
const exerciseId = new Types.ObjectId("507f1f77bcf86cd799439013");

test("start input and client-only authorization", () => {
  const schema = startWorkoutSchema();
  assert.equal(schema.safeParse({body:{dayName:'Day 1'}}).success, true);
  assert.equal(schema.safeParse({body:{dayName:' '}}).success, false);
  assert.equal(schema.safeParse({body:{dayName:'Day 1',clientId}}).success, false);
  const authorize = roleBasedAccessMiddleware([roleEnum.client]);
  let next = false;
  authorize({user:{role:roleEnum.client}}, {}, () => { next = true; });
  assert.equal(next, true);
  assert.throws(() => authorize({user:{role:roleEnum.coach}}, {}, () => {}), {status:403});
});

test("start snapshots the client's chosen day and returns exercise names", async () => {
  const findWorkout = workoutRepo.findOne, create = workoutRepo.create, findPlan = trainingPlanRepo.findOne, findExercises = exerciseRepo.findMany;
  try {
    workoutRepo.findOne = async ({filter}) => { assert.equal(String(filter.clientId),clientId); return null; };
    trainingPlanRepo.findOne = async ({filter}) => {
      assert.equal(String(filter.clientId),clientId);
      return {_id:planId, days:[{name:'Day 1',exercises:[{exerciseId,sets:3,reps:10,notes:'Slow'}]}]};
    };
    exerciseRepo.findMany = async () => [{_id:exerciseId,name:'Barbell Squat'}];
    workoutRepo.create = async ({data}) => new workoutModel(data);
    const workout = await workoutService.startWorkout(clientId,'day 1');
    assert.equal(workout.status,'inProgress');
    assert.equal(workout.dayName,'Day 1');
    assert.equal(workout.exercises[0].exerciseName,'Barbell Squat');
    assert.equal(workout.exercises[0].targetSets,3);
    assert.deepEqual(workout.exercises[0].sets,[]);
    assert.equal('clientId' in workout,false);
    assert.equal('exerciseId' in workout.exercises[0],false);
  } finally { workoutRepo.findOne=findWorkout; workoutRepo.create=create; trainingPlanRepo.findOne=findPlan; exerciseRepo.findMany=findExercises; }
});

test("duplicate starts, missing plans and missing days are rejected", async () => {
  const findWorkout = workoutRepo.findOne, findPlan = trainingPlanRepo.findOne, findExercises = exerciseRepo.findMany, create = workoutRepo.create;
  try {
    workoutRepo.findOne = async () => ({});
    await assert.rejects(workoutService.startWorkout(clientId,'Day 1'),{status:409});
    workoutRepo.findOne = async () => null;
    trainingPlanRepo.findOne = async () => null;
    await assert.rejects(workoutService.startWorkout(clientId,'Day 1'),{status:404});
    trainingPlanRepo.findOne = async () => ({_id:planId,days:[]});
    await assert.rejects(workoutService.startWorkout(clientId,'Day 1'),{status:404});
    trainingPlanRepo.findOne = async () => ({_id:planId,days:[{name:'Day 1',exercises:[{exerciseId,sets:3,reps:10}]}]});
    exerciseRepo.findMany = async () => [{_id:exerciseId,name:'Squat'}];
    workoutRepo.create = async () => {throw {code:11000,keyPattern:{clientId:1}};};
    await assert.rejects(workoutService.startWorkout(clientId,'Day 1'),{status:409});
  } finally { workoutRepo.findOne=findWorkout; trainingPlanRepo.findOne=findPlan; exerciseRepo.findMany=findExercises; workoutRepo.create=create; }
});

test("active workout retrieval is scoped to the client", async () => {
  const original = workoutRepo.findOne;
  try {
    workoutRepo.findOne = async ({filter}) => { assert.equal(String(filter.clientId),clientId); assert.equal(filter.status,'inProgress'); return null; };
    await assert.rejects(workoutService.getActiveWorkout(clientId),{status:404});
    workoutRepo.findOne = async () => new workoutModel({clientId,planId,dayName:'Day 1',exercises:[{exerciseId,exerciseName:'Squat',targetSets:3,targetReps:10}]});
    assert.equal((await workoutService.getActiveWorkout(clientId)).exercises[0].exerciseName,'Squat');
  } finally { workoutRepo.findOne=original; }
});
