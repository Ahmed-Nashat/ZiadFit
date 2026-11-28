import { test } from "node:test";
import assert from "node:assert/strict";
import { Types } from "mongoose";
import { workoutService } from "../dist/src/modules/workouts/workout.service.js";
import { coachWorkoutHistorySchema } from "../dist/src/modules/workouts/workout.validation.js";
import { workoutRepo } from "../dist/src/common/repo/workout.repo.js";
import { userRepo } from "../dist/src/common/repo/user.repo.js";
import { workoutModel } from "../dist/src/database/models/workout.model.js";
import { roleBasedAccessMiddleware } from "../dist/src/common/middleware/authorization.js";
import { roleEnum } from "../dist/src/common/enums/role.enum.js";

const clientId = "507f1f77bcf86cd799439011";
const ref = new Types.ObjectId("507f1f77bcf86cd799439012");

test("coach history validates client ID and pagination", () => {
  const schema = coachWorkoutHistorySchema();
  assert.deepEqual(schema.parse({params:{clientId},query:{}}).query,{page:1,limit:10});
  assert.equal(schema.safeParse({params:{clientId:'invalid'},query:{}}).success,false);
  assert.equal(schema.safeParse({params:{clientId},query:{limit:'101'}}).success,false);
});

test("coach authorization is required", () => {
  const middleware = roleBasedAccessMiddleware([roleEnum.coach]);
  let allowed = false;
  middleware({user:{role:roleEnum.coach}}, {}, () => {allowed=true;});
  assert.equal(allowed,true);
  assert.throws(()=>middleware({user:{role:roleEnum.client}}, {},()=>{}),{status:403});
  assert.throws(()=>middleware({}, {},()=>{}),{status:401});
});

test("coach sees only the selected client's completed workouts", async () => {
  const find = userRepo.findOne, pagination = workoutRepo.paggination;
  try {
    userRepo.findOne = async ({filter}) => {assert.equal(String(filter._id),clientId);assert.equal(filter.role,roleEnum.client);return null;};
    await assert.rejects(workoutService.getClientWorkoutHistory(clientId,1,10),{status:404});
    userRepo.findOne = async () => ({firstName:'Ahmed',lastName:'Ali'});
    workoutRepo.paggination = async ({filter,page,limit,options}) => {
      assert.equal(String(filter.clientId),clientId);
      assert.equal(filter.status,'completed');
      assert.equal(page,2); assert.equal(limit,5);
      assert.deepEqual(options.sort,{finishedAt:-1,_id:-1});
      return {data:[new workoutModel({clientId,planId:ref,dayName:'Day 1',status:'completed',exercises:[{exerciseId:ref,exerciseName:'Squat',targetSets:3,targetReps:10,sets:[{setNumber:1,reps:8,weightKg:40}]}]})],meta:{count:1}};
    };
    const result = await workoutService.getClientWorkoutHistory(clientId,2,5);
    assert.equal(result.clientName,'Ahmed Ali');
    assert.equal(result.data[0].exercises[0].sets[0].weightKg,40);
    assert.equal('clientId' in result.data[0],false);
    assert.equal('exerciseId' in result.data[0].exercises[0],false);
  } finally {userRepo.findOne=find;workoutRepo.paggination=pagination;}
});
