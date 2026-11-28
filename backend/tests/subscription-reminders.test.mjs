import { test } from "node:test";
import assert from "node:assert/strict";
import { Types } from "mongoose";
import { subscriptionModel } from "../dist/src/database/models/subscription.model.js";
import { clientNotifications, formatSubscriptionDate } from "../dist/src/common/services/client-notifications.service.js";
import { questionnaireReviewedTemplate, questionnaireAcceptedTemplate } from "../dist/src/common/templates/templates.js";
import { sendSubscriptionReminders } from "../dist/src/modules/subscriptions/subscription-reminders.js";

const id = new Types.ObjectId("507f1f77bcf86cd799439011");
const clientId = new Types.ObjectId("507f1f77bcf86cd799439012");

test("review and acceptance emails have different content and escape client names", () => {
  const reviewed = questionnaireReviewedTemplate({name:'<Ahmed>'});
  const accepted = questionnaireAcceptedTemplate({name:'<Ahmed>',startDate:'1 June',endDate:'1 July'});
  assert.match(reviewed,/&lt;Ahmed&gt;/);
  assert.match(reviewed,/reviewed/);
  assert.doesNotMatch(reviewed,/subscription is active/);
  assert.match(accepted,/subscription is active/);
  assert.match(accepted,/1 June/);
  assert.match(accepted,/1 July/);
  assert.match(formatSubscriptionDate(new Date('2026-06-01T00:00:00Z')),/Cairo time/);
});

test("due reminders are claimed, sent and recorded for the current end date", async () => {
  const find=subscriptionModel.find, claim=subscriptionModel.findOneAndUpdate, current=subscriptionModel.findOne, update=subscriptionModel.updateOne, notify=clientNotifications.expiring;
  const now=new Date();
  const endAt=new Date(now.getTime()+6*86400000);
  let sent=0, completed=false;
  try {
    subscriptionModel.find = filter => {
      assert.equal(filter.endAt.$gt,now);
      assert.equal(filter.endAt.$lte.getTime(),now.getTime()+7*86400000);
      return {sort(){return this;},limit(){return this;},select(){return this;},async lean(){return [{_id:id,endAt}];}};
    };
    subscriptionModel.findOneAndUpdate=async (filter,change)=>{assert.equal(filter.endAt,endAt);assert.ok(change.$set.reminderClaimId);return {_id:id,clientId,endAt,claimId:change.$set.reminderClaimId};};
    subscriptionModel.findOne=async filter=>({_id:id,clientId,endAt,claimId:filter.reminderClaimId});
    clientNotifications.expiring=async (recipient,date)=>{assert.equal(String(recipient),String(clientId));assert.equal(date,endAt);sent++;};
    subscriptionModel.updateOne=async (filter,change)=>{assert.equal(filter.endAt,endAt);assert.equal(change.$set.reminderSentFor,endAt);completed=true;};
    await sendSubscriptionReminders(now);
    assert.equal(sent,1);
    assert.equal(completed,true);
  } finally {subscriptionModel.find=find;subscriptionModel.findOneAndUpdate=claim;subscriptionModel.findOne=current;subscriptionModel.updateOne=update;clientNotifications.expiring=notify;}
});

test("failed sends release the claim for retry", async () => {
  const find=subscriptionModel.find, claim=subscriptionModel.findOneAndUpdate, current=subscriptionModel.findOne, update=subscriptionModel.updateOne, notify=clientNotifications.expiring, log=console.error;
  const now=new Date(), endAt=new Date(now.getTime()+86400000);
  let released=false;
  try {
    subscriptionModel.find=()=>({sort(){return this;},limit(){return this;},select(){return this;},async lean(){return [{_id:id,endAt}];}});
    subscriptionModel.findOneAndUpdate=async ()=>({_id:id,clientId,endAt});
    subscriptionModel.findOne=async ()=>({_id:id,clientId,endAt});
    clientNotifications.expiring=async ()=>{throw new Error('SMTP error');};
    subscriptionModel.updateOne=async (_filter,change)=>{assert.ok(change.$unset.reminderClaimId !== undefined);released=true;};
    console.error=()=>{};
    await sendSubscriptionReminders(now);
    assert.equal(released,true);
  } finally {subscriptionModel.find=find;subscriptionModel.findOneAndUpdate=claim;subscriptionModel.findOne=current;subscriptionModel.updateOne=update;clientNotifications.expiring=notify;console.error=log;}
});
