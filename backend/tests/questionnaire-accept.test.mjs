import { test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { questionnaireService } from "../dist/src/modules/questionnaires/questionnaire.service.js";
import { questionnaireAcceptanceSchema, questionnaireDecisionSchema } from "../dist/src/modules/questionnaires/questionnaire.validation.js";
import { questionnaireRepo } from "../dist/src/common/repo/questionnaire.repo.js";
import { subscriptionRepo } from "../dist/src/common/repo/subscription.repo.js";
import { userRepo } from "../dist/src/common/repo/user.repo.js";
import { clientNotifications } from "../dist/src/common/services/client-notifications.service.js";
import { encrypting } from "../dist/src/common/security/encrypting.js";
import { roleBasedAccessMiddleware } from "../dist/src/common/middleware/authorization.js";
import { roleEnum } from "../dist/src/common/enums/role.enum.js";

const questionnaireId = "507f1f77bcf86cd799439011";
const coachId = "507f1f77bcf86cd799439012";
const clientId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439013");
clientNotifications.reviewed = async () => {};
clientNotifications.accepted = async () => {};

test("review and acceptance inputs are validated", () => {
  assert.equal(questionnaireDecisionSchema().safeParse({params:{questionnaireId}, body:{}}).success, true);
  assert.equal(questionnaireDecisionSchema().safeParse({params:{questionnaireId:'bad'}, body:{}}).success, false);
  assert.equal(questionnaireAcceptanceSchema().safeParse({params:{questionnaireId}, body:{months:1}}).success, true);
  assert.equal(questionnaireAcceptanceSchema().safeParse({params:{questionnaireId}, body:{months:4}}).success, false);
  assert.equal(questionnaireAcceptanceSchema().safeParse({params:{questionnaireId}, body:{}}).success, false);
});

test("only coaches can access coach actions", () => {
  const check = roleBasedAccessMiddleware([roleEnum.coach]);
  let allowed = false;
  check({user:{role:roleEnum.coach}}, {}, () => { allowed = true; });
  assert.equal(allowed, true);
  assert.throws(() => check({user:{role:roleEnum.client}}, {}, () => {}), {status:403});
  assert.throws(() => check({}, {}, () => {}), {status:401});
});

test("review moves only a pending request to reviewed", async () => {
  const original = questionnaireRepo.findOneAndUpdate;
  const originalUsers = userRepo.findMany;
  const notify = clientNotifications.reviewed;
  let notified = false;
  try {
    clientNotifications.reviewed = async id => { assert.equal(String(id),String(clientId)); notified=true; };
    questionnaireRepo.findOneAndUpdate = async args => {
      assert.equal(args.filter.status, 'pending');
      assert.equal(args.update.status, 'reviewed');
      assert.equal(String(args.update.reviewedBy), coachId);
      assert.equal(args.update.reviewNotes, 'Contacted');
      return {clientId, reviewedBy:coachId, status:'reviewed', toObject: () => ({clientId, reviewedBy:coachId, status:'reviewed'})};
    };
    userRepo.findMany = async () => [
      {_id:clientId, firstName:'Ahmed', lastName:'Ali', phoneNumber:encrypting('+201012345678')},
      {_id:new mongoose.Types.ObjectId(coachId), firstName:'Ziad', lastName:'Coach'},
    ];
    const result = await questionnaireService.reviewQuestionnaire({questionnaireId, coachId, notes:'Contacted'});
    assert.equal(result.status, 'reviewed');
    assert.equal(result.clientName, 'Ahmed Ali');
    assert.equal(result.clientPhoneNumber, '+201012345678');
    assert.equal(result.coachName, 'Ziad Coach');
    assert.equal('clientId' in result, false);
    assert.equal('reviewedBy' in result, false);
    assert.equal(notified, true);
  } finally { questionnaireRepo.findOneAndUpdate = original; userRepo.findMany = originalUsers; clientNotifications.reviewed=notify; }
});

test("acceptance starts subscription at the acceptance time within the same session", async () => {
  const startSession = mongoose.startSession;
  const updateQuestionnaire = questionnaireRepo.findOneAndUpdate;
  const findQuestionnaire = questionnaireRepo.findOne;
  const updateSubscription = subscriptionRepo.findOneAndUpdate;
  const findSubscription = subscriptionRepo.findOne;
  const findUsers = userRepo.findMany;
  const notify = clientNotifications.accepted;
  let transactionCommitted = false;
  let closed = false, acceptedAt;
  const session = {withTransaction: async fn => {const result=await fn();transactionCommitted=true;return result;}, endSession: async () => {closed=true;}};
  try {
    mongoose.startSession = async () => session;
    clientNotifications.accepted = async (id,start,end) => {assert.equal(transactionCommitted,true);assert.equal(String(id),String(clientId));assert.equal(start,acceptedAt);assert.ok(end>start);};
    userRepo.findMany = async () => [
      {_id:clientId, firstName:'Ahmed', lastName:'Ali', phoneNumber:encrypting('+201012345678')},
      {_id:new mongoose.Types.ObjectId(coachId), firstName:'Ziad', lastName:'Coach'},
    ];
    questionnaireRepo.findOne = async () => ({ status: 'reviewed' });
    subscriptionRepo.findOne = async () => null;
    questionnaireRepo.findOneAndUpdate = async args => {
      assert.equal(args.filter.status, 'reviewed');
      assert.equal(args.update.$set.status, 'accepted');
      assert.equal(args.options.session, session);
      acceptedAt = args.update.$set.acceptedAt;
      return {clientId, reviewedBy:coachId, status:'accepted', toObject:()=>({clientId,reviewedBy:coachId,status:'accepted'})};
    };
    subscriptionRepo.findOneAndUpdate = async args => {
      assert.equal(args.options.session,session);
      assert.equal(args.update.$set.startAt,acceptedAt);
      assert.equal(String(args.filter.clientId),String(clientId));
      assert.equal(String(args.update.$set.activatedBy),coachId);
      return args.update.$set;
    };
    const result = await questionnaireService.acceptQuestionnaire({questionnaireId,coachId,months:1});
    assert.equal(result.subscription.startAt,acceptedAt);
    assert.equal(result.subscription.status,'active');
    assert.equal(result.questionnaire.clientName,'Ahmed Ali');
    assert.equal(result.questionnaire.clientPhoneNumber,'+201012345678');
    assert.equal(result.questionnaire.coachName,'Ziad Coach');
    assert.equal('clientId' in result.questionnaire,false);
    assert.equal('reviewedBy' in result.questionnaire,false);
    assert.equal(closed,true);
    subscriptionRepo.findOne = async ({ filter }) => {
      assert.ok(filter.endAt.$gt instanceof Date);
      return null; // An expired subscription does not match the active filter.
    };
    const renewal = await questionnaireService.acceptQuestionnaire({questionnaireId,coachId,months:1});
    assert.equal(renewal.subscription.status, 'active');
  } finally {
    mongoose.startSession=startSession;
    questionnaireRepo.findOneAndUpdate=updateQuestionnaire;
    questionnaireRepo.findOne=findQuestionnaire;
    subscriptionRepo.findOneAndUpdate=updateSubscription;
    subscriptionRepo.findOne=findSubscription;
    userRepo.findMany=findUsers;
    clientNotifications.accepted=notify;
  }
});

test("acceptance checks status and preserves an existing active subscription", async () => {
  const startSession = mongoose.startSession;
  const accept = questionnaireRepo.acceptReviewed;
  const find = questionnaireRepo.findOne;
  const subscription = subscriptionRepo.findOneAndUpdate;
  const findSubscription = subscriptionRepo.findOne;
  const findUsers = userRepo.findMany;
  try {
    mongoose.startSession = async () => ({withTransaction:async fn=>fn(),endSession:async()=>{}});
    questionnaireRepo.acceptReviewed = async () => null;
    questionnaireRepo.findOne = async () => null;
    await assert.rejects(questionnaireService.acceptQuestionnaire({questionnaireId,coachId,months:1}),{status:404});
    questionnaireRepo.findOne = async () => ({status:'pending'});
    await assert.rejects(questionService(),{status:409});
    questionnaireRepo.findOne = async () => ({status:'accepted'});
    await assert.rejects(questionService(),{status:409,message:'Questionnaire has already been accepted'});
    questionnaireRepo.findOne = async () => ({status:'reviewed'});
    questionnaireRepo.acceptReviewed = async () => ({clientId,toObject:()=>({clientId})});
    userRepo.findMany = async () => [];
    const active = {startAt:new Date(Date.now()-60000),endAt:new Date(Date.now()+60000)};
    subscriptionRepo.findOne = async () => active;
    subscriptionRepo.findOneAndUpdate = async () => {throw new Error('Active subscription must not be changed');};
    const accepted = await questionService();
    assert.equal(accepted.subscription.startAt,active.startAt);
    assert.equal(accepted.subscription.endAt,active.endAt);
    subscriptionRepo.findOne = async () => null;
    subscriptionRepo.findOneAndUpdate = async () => {throw {code:11000,keyPattern:{clientId:1}};};
    await assert.rejects(questionService(),{status:409});
    const otherDuplicate = {code:11000,keyPattern:{other:1}};
    subscriptionRepo.findOneAndUpdate = async () => {throw otherDuplicate;};
    await assert.rejects(questionService(), error => error === otherDuplicate);
  } finally {
    mongoose.startSession=startSession;
    questionnaireRepo.acceptReviewed=accept;
    questionnaireRepo.findOne=find;
    subscriptionRepo.findOneAndUpdate=subscription;
    subscriptionRepo.findOne=findSubscription;
    userRepo.findMany=findUsers;
  }
  function questionService(){return questionnaireService.acceptQuestionnaire({questionnaireId,coachId,months:1});}
});
