import { test } from "node:test";
import assert from "node:assert/strict";
import { Types } from "mongoose";
import { progressService } from "../dist/src/modules/progress/progress.service.js";
import { submitCheckInSchema, coachCheckInListSchema, exerciseProgressSchema } from "../dist/src/modules/progress/progress.validation.js";
import { checkInRepo } from "../dist/src/common/repo/check-in.repo.js";
import { userRepo } from "../dist/src/common/repo/user.repo.js";
import { checkInModel } from "../dist/src/database/models/check-in.model.js";
import { workoutModel } from "../dist/src/database/models/workout.model.js";
import { roleBasedAccessMiddleware } from "../dist/src/common/middleware/authorization.js";
import { roleEnum } from "../dist/src/common/enums/role.enum.js";

const clientId = "507f1f77bcf86cd799439011";
const ref = new Types.ObjectId("507f1f77bcf86cd799439012");
const query = (value) => ({ sort(){return this;}, limit(){return this;}, select(){return this;}, async lean(){return value;} });

test("check-in and exercise progress input validation", () => {
  assert.equal(submitCheckInSchema().safeParse({body:{weightKg:75.5,note:'Good'}}).success,true);
  assert.equal(submitCheckInSchema().safeParse({body:{weightKg:0}}).success,false);
  assert.equal(submitCheckInSchema().safeParse({body:{weightKg:75,clientId}}).success,false);
  assert.equal(coachCheckInListSchema().safeParse({params:{clientId:'bad'},query:{}}).success,false);
  assert.equal(exerciseProgressSchema().safeParse({query:{exerciseName:'  '}}).success,false);
  assert.throws(()=>roleBasedAccessMiddleware([roleEnum.coach])({user:{role:roleEnum.client}}, {},()=>{}),{status:403});
});

test("check-ins use the authenticated client and hide client IDs", async () => {
  const create=checkInRepo.create, paginate=checkInRepo.paggination;
  try {
    checkInRepo.create=async ({data})=>{assert.equal(String(data.clientId),clientId);return new checkInModel(data);};
    const created=await progressService.submitCheckIn(clientId,{weightKg:75,note:'Good'});
    assert.equal(created.weightKg,75);assert.equal('clientId' in created,false);
    checkInRepo.paggination=async ({filter})=>{assert.equal(String(filter.clientId),clientId);return {data:[new checkInModel({clientId,weightKg:75})],meta:{count:1}};};
    const list=await progressService.getCheckIns(clientId,1,10);
    assert.equal('clientId' in list.data[0],false);assert.equal(list.meta.count,1);
  } finally {checkInRepo.create=create;checkInRepo.paggination=paginate;}
});

test("summary compares previous and first weights and counts completed workouts", async () => {
  const findOne=checkInModel.findOne, find=checkInModel.find, count=checkInModel.countDocuments, workouts=workoutModel.countDocuments, last=workoutModel.findOne;
  try {
    checkInModel.findOne=(filter)=>{assert.equal(String(filter.clientId),clientId);return query({weightKg:80,createdAt:new Date('2026-01-01')});};
    checkInModel.find=()=>query([{weightKg:74,createdAt:new Date('2026-03-01')},{weightKg:76,createdAt:new Date('2026-02-01')}]);
    checkInModel.countDocuments=async()=>3;
    workoutModel.countDocuments=async (filter)=>{assert.equal(filter.status,'completed');return 5;};
    workoutModel.findOne=()=>query({finishedAt:new Date('2026-03-02')});
    const result=await progressService.getSummary(clientId);
    assert.equal(result.firstWeightKg,80);assert.equal(result.latestWeightKg,74);
    assert.equal(result.changeFromFirstKg,-6);assert.equal(result.changeFromPreviousKg,-2);
    assert.equal(result.completedWorkouts,5);assert.deepEqual(result.weightHistory.map(x=>x.weightKg),[76,74]);
    checkInModel.findOne=()=>query(null);checkInModel.find=()=>query([]);workoutModel.findOne=()=>query(null);
    const empty=await progressService.getSummary(clientId);
    assert.equal(empty.latestWeightKg,null);assert.equal(empty.changeFromPreviousKg,null);
  } finally {checkInModel.findOne=findOne;checkInModel.find=find;checkInModel.countDocuments=count;workoutModel.countDocuments=workouts;workoutModel.findOne=last;}
});

test("exercise progress is client scoped and reports recent completed sets", async () => {
  const original=workoutModel.find;
  try {
    workoutModel.find=(filter)=>{
      assert.equal(String(filter.clientId),clientId);assert.equal(filter.status,'completed');
      assert.equal(filter.exercises.$elemMatch.exerciseName.test('Squat'),true);
      assert.deepEqual(filter.exercises.$elemMatch['sets.0'],{$exists:true});
      workoutModel.findOne(filter).cast(workoutModel);
      return query([{dayName:'Day 1',finishedAt:new Date('2026-01-01'),exercises:[{exerciseId:ref,exerciseName:'Squat',sets:[{setNumber:1,reps:10,weightKg:40},{setNumber:2,reps:8,weightKg:45}]}]}]);
    };
    const result=await progressService.getExerciseProgress(clientId,'squat');
    assert.equal(result.sessions[0].bestWeightKg,45);assert.equal(result.sessions[0].totalReps,18);
    assert.equal('exerciseId' in result.sessions[0],false);
  } finally {workoutModel.find=original;}
});

test("coach views validate the client and show their name", async () => {
  const find=userRepo.findOne, paginate=checkInRepo.paggination, users=userRepo.findMany;
  try {
    userRepo.findOne=async()=>null;
    await assert.rejects(progressService.getClientCheckIns(clientId,1,10),{status:404});
    userRepo.findOne=async()=>({firstName:'Ahmed',lastName:'Ali'});
    checkInRepo.paggination=async ()=>({data:[new checkInModel({clientId,weightKg:75})],meta:{count:1}});
    const result=await progressService.getClientCheckIns(clientId,1,10);
    assert.equal(result.clientName,'Ahmed Ali');
    userRepo.findMany=async()=>[{_id:new Types.ObjectId(clientId),firstName:'Ahmed',lastName:'Ali'}];
    const recent=await progressService.getRecentCheckIns(1,10);
    assert.equal(recent.data[0].clientName,'Ahmed Ali');assert.equal('clientId' in recent.data[0],false);
  } finally {userRepo.findOne=find;checkInRepo.paggination=paginate;userRepo.findMany=users;}
});
