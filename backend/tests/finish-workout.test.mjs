import { test } from "node:test";
import assert from "node:assert/strict";
import { Types } from "mongoose";
import { workoutService } from "../dist/src/modules/workouts/workout.service.js";
import { finishWorkoutSchema } from "../dist/src/modules/workouts/workout.validation.js";
import { workoutRepo } from "../dist/src/common/repo/workout.repo.js";
import { workoutModel } from "../dist/src/database/models/workout.model.js";
import { roleBasedAccessMiddleware } from "../dist/src/common/middleware/authorization.js";
import { roleEnum } from "../dist/src/common/enums/role.enum.js";

const clientId = "507f1f77bcf86cd799439011";
const workoutId = "507f1f77bcf86cd799439012";
const planId = new Types.ObjectId("507f1f77bcf86cd799439013");

test("finish validates the workout ID and is client-only", () => {
  assert.equal(finishWorkoutSchema().safeParse({params:{workoutId}}).success,true);
  assert.equal(finishWorkoutSchema().safeParse({params:{workoutId:'invalid'}}).success,false);
  const authorize=roleBasedAccessMiddleware([roleEnum.client]);
  assert.throws(()=>authorize({user:{role:roleEnum.coach}},{},()=>{}),{status:403});
  assert.throws(()=>authorize({}, {},()=>{}),{status:401});
});

test("finish updates only the client's in-progress workout", async () => {
  const update=workoutRepo.findOneAndUpdate;
  try {
    workoutRepo.findOneAndUpdate=async ({filter,update,options})=>{
      assert.equal(String(filter._id),workoutId);
      assert.equal(String(filter.clientId),clientId);
      assert.equal(filter.status,'inProgress');
      assert.equal(update.$set.status,'completed');
      assert.ok(update.$set.finishedAt instanceof Date);
      assert.equal(update.$inc.__v,1);
      assert.equal(options.runValidators,true);
      return new workoutModel({_id:workoutId,clientId,planId,dayName:'Day 1',...update.$set,exercises:[{exerciseId:planId,exerciseName:'Squat',targetSets:3,targetReps:10,sets:[{setNumber:1,reps:10}]}]});
    };
    const workout=await workoutService.finishWorkout(clientId,workoutId);
    assert.equal(workout.status,'completed');
    assert.equal(workout.exercises[0].sets[0].reps,10);
    assert.equal('clientId' in workout,false);
  } finally {workoutRepo.findOneAndUpdate=update;}
});

test("missing or already completed workouts are rejected", async () => {
  const update=workoutRepo.findOneAndUpdate, find=workoutRepo.findOne;
  try {
    workoutRepo.findOneAndUpdate=async()=>null;
    workoutRepo.findOne=async ({filter})=>{assert.equal(String(filter.clientId),clientId);return null;};
    await assert.rejects(workoutService.finishWorkout(clientId,workoutId),{status:404});
    workoutRepo.findOne=async()=>({status:'completed'});
    await assert.rejects(workoutService.finishWorkout(clientId,workoutId),{status:409});
  } finally {workoutRepo.findOneAndUpdate=update;workoutRepo.findOne=find;}
});
