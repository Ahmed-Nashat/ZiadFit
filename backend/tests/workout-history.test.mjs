import { test } from "node:test";
import assert from "node:assert/strict";
import { Types } from "mongoose";
import { workoutService } from "../dist/src/modules/workouts/workout.service.js";
import { workoutHistorySchema } from "../dist/src/modules/workouts/workout.validation.js";
import { workoutRepo } from "../dist/src/common/repo/workout.repo.js";
import { workoutModel } from "../dist/src/database/models/workout.model.js";
import { roleBasedAccessMiddleware } from "../dist/src/common/middleware/authorization.js";
import { roleEnum } from "../dist/src/common/enums/role.enum.js";

const clientId = "507f1f77bcf86cd799439011";
const ref = new Types.ObjectId("507f1f77bcf86cd799439012");

test("history pagination validates and defaults", () => {
  const schema = workoutHistorySchema();
  assert.deepEqual(schema.parse({query:{}}).query,{page:1,limit:10});
  assert.equal(schema.safeParse({query:{page:'0'}}).success,false);
  assert.equal(schema.safeParse({query:{limit:'101'}}).success,false);
});

test("history is client-only and reads only that client's completed workouts", async () => {
  const authorize=roleBasedAccessMiddleware([roleEnum.client]);
  assert.throws(()=>authorize({user:{role:roleEnum.coach}},{},()=>{}),{status:403});
  assert.throws(()=>authorize({}, {},()=>{}),{status:401});
  let allowed=false;
  authorize({user:{role:roleEnum.client}},{},()=>{allowed=true;});
  assert.equal(allowed,true);
  const original=workoutRepo.paggination;
  try {
    workoutRepo.paggination=async ({filter,page,limit,options})=>{
      assert.equal(String(filter.clientId),clientId);
      assert.equal(filter.status,'completed');
      assert.equal(page,2);
      assert.equal(limit,5);
      assert.deepEqual(options.sort,{finishedAt:-1,_id:-1});
      return {data:[new workoutModel({clientId,planId:ref,dayName:'Day 1',status:'completed',finishedAt:new Date(),exercises:[{exerciseId:ref,exerciseName:'Squat',targetSets:3,targetReps:10,sets:[{setNumber:1,reps:10,weightKg:40}]}]})],meta:{count:1}};
    };
    const result=await workoutService.getWorkoutHistory(clientId,2,5);
    assert.equal(result.data[0].exercises[0].exerciseName,'Squat');
    assert.equal(result.data[0].exercises[0].sets[0].weightKg,40);
    assert.equal('clientId' in result.data[0],false);
    assert.equal('exerciseId' in result.data[0].exercises[0],false);
    assert.equal(result.meta.count,1);
  } finally {workoutRepo.paggination=original;}
});
