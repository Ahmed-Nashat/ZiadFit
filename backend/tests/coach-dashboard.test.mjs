import { test } from "node:test";
import assert from "node:assert/strict";
import { coachDashboardService } from "../dist/src/modules/progress/coach-dashboard.service.js";
import { coachDashboardSchema, coachDashboardClientsSchema } from "../dist/src/modules/progress/coach-dashboard.validation.js";
import { progressService } from "../dist/src/modules/progress/progress.service.js";
import { userModel } from "../dist/src/database/models/user.model.js";
import { workoutModel } from "../dist/src/database/models/workout.model.js";
import { questionnaireModel } from "../dist/src/database/models/questionnaire.model.js";
import { subscriptionModel } from "../dist/src/database/models/subscription.model.js";
import { roleBasedAccessMiddleware } from "../dist/src/common/middleware/authorization.js";
import { roleEnum } from "../dist/src/common/enums/role.enum.js";

const from = new Date('2026-01-01T00:00:00Z'), to = new Date('2026-02-01T00:00:00Z');

test('dashboard validates its period, pagination, and coach authorization', () => {
  const schema = coachDashboardSchema();
  const parsed = schema.parse({query:{from:from.toISOString(),to:to.toISOString()}});
  assert.equal(parsed.query.from.toISOString(),from.toISOString());
  assert.equal(schema.safeParse({query:{from:to.toISOString(),to:from.toISOString()}}).success,false);
  assert.equal(schema.safeParse({query:{from:'bad'}}).success,false);
  assert.equal(coachDashboardClientsSchema().safeParse({query:{limit:'101'}}).success,false);
  const allow=roleBasedAccessMiddleware([roleEnum.coach]);
  assert.throws(()=>allow({user:{role:roleEnum.client}}, {},()=>{}),{status:403});
  assert.throws(()=>allow({}, {},()=>{}),{status:401});
});

test('overview reports cohort counts, average and comparison coverage', async () => {
  const users=userModel.aggregate, workouts=workoutModel.aggregate, questionnaires=questionnaireModel.countDocuments, subscriptions=subscriptionModel.countDocuments, recent=progressService.getRecentCheckIns;
  try {
    userModel.aggregate = async pipeline => {
      assert.equal(pipeline[0].$match.role,roleEnum.client);
      assert.ok(pipeline.some(stage=>stage.$lookup?.from === 'checkIn'));
      assert.ok(pipeline.some(stage=>stage.$lookup?.from === 'workout'));
      return [{total:4,checkedInDuringPeriod:2,comparable:3,increased:1,decreased:1,unchanged:1,completedWorkouts:5}];
    };
    workoutModel.aggregate = async pipeline => {
      assert.equal(pipeline[0].$match.status,'completed');
      assert.ok(pipeline.some(stage=>stage.$match?.['exercises.sets.weightKg']));
      return [{comparableClients:2,increasedOnly:1,decreasedOnly:0,mixed:1,unchanged:0}];
    };
    questionnaireModel.countDocuments = async () => 3;
    subscriptionModel.countDocuments = async filter => filter.endAt.$lte ? 1 : 2;
    progressService.getRecentCheckIns = async () => ({data:[{clientName:'Ahmed Ali',weightKg:75}]});
    const result=await coachDashboardService.getOverview({from,to});
    assert.equal(result.clients.total,4);
    assert.equal(result.clients.checkedInDuringPeriod,2);
    assert.deepEqual(result.weightTrends,{comparableClients:3,increased:1,decreased:1,unchanged:1});
    assert.deepEqual(result.workouts,{completedDuringPeriod:5,averagePerClient:1.25,clientsIncluded:4});
    assert.equal(result.exerciseLoads.comparableClients,2);
    assert.equal(result.exerciseLoads.mixed,1);
    assert.equal(result.subscriptions.activeNow,2);
    assert.equal(result.subscriptions.endingWithinSevenDays,1);
    assert.equal(result.pendingQuestionnaires,3);
    assert.equal(result.recentCheckIns[0].clientName,'Ahmed Ali');
    userModel.aggregate=async()=>[];workoutModel.aggregate=async()=>[];
    const empty=await coachDashboardService.getOverview({from,to});
    assert.equal(empty.workouts.averagePerClient,null);
    assert.equal(empty.exerciseLoads.comparableClients,0);
  } finally { userModel.aggregate=users;workoutModel.aggregate=workouts;questionnaireModel.countDocuments=questionnaires;subscriptionModel.countDocuments=subscriptions;progressService.getRecentCheckIns=recent; }
});

test('coach can retrieve paginated client metrics with name and weight change', async () => {
  const original=userModel.aggregate;
  try {
    userModel.aggregate=async pipeline=>{
      assert.equal(pipeline[0].$match.role,roleEnum.client);
      const facet=pipeline.find(stage=>stage.$facet).$facet;
      assert.equal(facet.data[0].$skip,5);
      assert.equal(facet.data[1].$limit,5);
      return [{count:[{total:7}],data:[{clientName:'Ahmed Ali',checkInCount:2,firstWeightKg:80,latestWeightKg:77.5,completedWorkouts:3,checkedInDuringPeriod:true}]}];
    };
    const result=await coachDashboardService.getClients({from,to},2,5);
    assert.equal(result.data[0].clientName,'Ahmed Ali');
    assert.equal(result.data[0].weightChangeKg,-2.5);
    assert.equal(result.meta.count,7);
    assert.equal(result.meta.currentPage,2);
  } finally {userModel.aggregate=original;}
});
