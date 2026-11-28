import { test } from "node:test";
import assert from "node:assert/strict";
import { Types } from "mongoose";
import { workoutService } from "../dist/src/modules/workouts/workout.service.js";
import { previousPerformanceSchema } from "../dist/src/modules/workouts/workout.validation.js";
import { workoutRepo } from "../dist/src/common/repo/workout.repo.js";
import { workoutModel } from "../dist/src/database/models/workout.model.js";
import { roleBasedAccessMiddleware } from "../dist/src/common/middleware/authorization.js";
import { roleEnum } from "../dist/src/common/enums/role.enum.js";

const clientId = "507f1f77bcf86cd799439011";
const ref = new Types.ObjectId("507f1f77bcf86cd799439012");

test("previous performance validates exercise name and requires client role", () => {
  const schema = previousPerformanceSchema();
  assert.equal(schema.parse({query:{exerciseName:' squat '}}).query.exerciseName,'squat');
  assert.equal(schema.safeParse({query:{exerciseName:' '}}).success,false);
  const authorize = roleBasedAccessMiddleware([roleEnum.client]);
  assert.throws(()=>authorize({user:{role:roleEnum.coach}}, {},()=>{}),{status:403});
  assert.throws(()=>authorize({}, {},()=>{}),{status:401});
});

test("previous performance searches only the client's completed workouts with logged sets", async () => {
  const original = workoutRepo.findOne;
  try {
    workoutRepo.findOne = async ({filter,options}) => {
      assert.equal(String(filter.clientId),clientId);
      assert.equal(filter.status,'completed');
      assert.equal(filter.exercises.$elemMatch.exerciseName.test('Squat'),true);
      assert.equal(filter.exercises.$elemMatch.exerciseName.test('Squat Jump'),false);
      assert.deepEqual(filter.exercises.$elemMatch['sets.0'],{$exists:true});
      assert.deepEqual(options.sort,{finishedAt:-1,_id:-1});
      workoutModel.findOne(filter).cast(workoutModel);
      return new workoutModel({clientId,planId:ref,dayName:'Day 1',status:'completed',finishedAt:new Date('2026-01-01'),exercises:[{exerciseId:ref,exerciseName:'Squat',targetSets:3,targetReps:10,sets:[{setNumber:1,reps:10,weightKg:40}]}]});
    };
    const result = await workoutService.getPreviousPerformance(clientId,'squat');
    assert.equal(result.exerciseName,'Squat');
    assert.deepEqual(result.previous.sets,[{setNumber:1,reps:10,weightKg:40}]);
    assert.equal(result.previous.dayName,'Day 1');
    workoutRepo.findOne = async () => null;
    assert.deepEqual(await workoutService.getPreviousPerformance(clientId,'Squat'),{exerciseName:'Squat',previous:null});
  } finally { workoutRepo.findOne = original; }
});

test("exercise names are treated as literal text", async () => {
  const original = workoutRepo.findOne;
  try {
    workoutRepo.findOne = async ({filter}) => {assert.equal(filter.exercises.$elemMatch.exerciseName.test('Squat'),false);return null;};
    await workoutService.getPreviousPerformance(clientId,'.*');
  } finally { workoutRepo.findOne = original; }
});
