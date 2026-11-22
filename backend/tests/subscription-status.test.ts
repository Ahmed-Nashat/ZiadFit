import { test } from "node:test";
import assert from "node:assert/strict";
import { subscriptionStatus } from "../src/modules/subscriptions/subscription.status.ts";
import { calculateSubscriptionEnd } from "../src/modules/subscriptions/subscription.duration.ts";

test("subscription expires exactly at its end time", () => {
  const subscription = { startAt: new Date("2026-01-01T00:00:00Z"), endAt: new Date("2026-02-01T00:00:00Z") };
  assert.equal(subscriptionStatus(null), "none");
  assert.equal(subscriptionStatus(subscription, new Date("2026-01-31T23:59:59.999Z")), "active");
  assert.equal(subscriptionStatus(subscription, new Date("2026-02-01T00:00:00Z")), "expired");
  assert.equal(subscriptionStatus(subscription, new Date("2026-02-02T00:00:00Z")), "expired");
});

test("durations use calendar months and clamp at the end of a shorter month", () => {
  const start = new Date("2024-01-31T12:30:00.000Z");
  assert.equal(calculateSubscriptionEnd(start, 1).toISOString(), "2024-02-29T12:30:00.000Z");
  assert.equal(calculateSubscriptionEnd(start, 2).toISOString(), "2024-03-31T12:30:00.000Z");
  assert.equal(calculateSubscriptionEnd(start, 3).toISOString(), "2024-04-30T12:30:00.000Z");
  assert.equal(start.toISOString(), "2024-01-31T12:30:00.000Z");
});
