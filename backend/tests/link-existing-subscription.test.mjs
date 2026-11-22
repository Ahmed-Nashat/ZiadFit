import { test } from "node:test";
import assert from "node:assert/strict";
import { subscriptionService } from "../dist/src/modules/subscriptions/subscription.service.js";
import { userRepo } from "../dist/src/common/repo/user.repo.js";
import { subscriptionRepo } from "../dist/src/common/repo/subscription.repo.js";

test("links an unverified client and preserves the existing dates", async () => {
  const originalFind = userRepo.findOne;
  const originalCreate = subscriptionRepo.create;
  const input = {
    clientId: "507f1f77bcf86cd799439011",
    coachId: "507f1f77bcf86cd799439012",
    startAt: new Date(Date.now() - 86400000),
    endAt: new Date(Date.now() + 86400000),
  };
  try {
    userRepo.findOne = async () => ({ emailVerifiedAt: null });
    subscriptionRepo.create = async ({ data }) => data;
    const result = await subscriptionService.linkExistingSubscription(input);
    assert.equal(result.status, "active");
    assert.equal(result.startAt, input.startAt);
    assert.equal(result.endAt, input.endAt);
    subscriptionRepo.create = async () => { throw { code: 11000, keyPattern: { clientId: 1 } }; };
    await assert.rejects(subscriptionService.linkExistingSubscription(input), { status: 409 });
    await assert.rejects(subscriptionService.linkExistingSubscription({ ...input, endAt: input.startAt }), { status: 400 });
  } finally {
    userRepo.findOne = originalFind;
    subscriptionRepo.create = originalCreate;
  }
});
