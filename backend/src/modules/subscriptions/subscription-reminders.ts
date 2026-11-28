import { randomUUID } from "node:crypto";
import { subscriptionModel } from "../../database/models/subscription.model.js";
import { clientNotifications } from "../../common/services/client-notifications.service.js";

const weekMs = 7 * 24 * 60 * 60 * 1000;
const leaseMs = 10 * 60 * 1000;
const intervalMs = 60 * 60 * 1000;

export async function sendSubscriptionReminders(now = new Date()) {
  const due = await subscriptionModel
    .find({
      endAt: { $gt: now, $lte: new Date(now.getTime() + weekMs) },
      $expr: {
        $ne: [{ $ifNull: ["$reminderSentFor", new Date(0)] }, "$endAt"],
      },
      $or: [
        { reminderClaimUntil: { $exists: false } },
        { reminderClaimUntil: { $lte: now } },
      ],
    })
    .sort({ endAt: 1 })
    .limit(100)
    .select("_id endAt")
    .lean();
  for (const candidate of due) {
    const claimId = randomUUID();
    const claim = await subscriptionModel.findOneAndUpdate(
      {
        _id: candidate._id,
        endAt: candidate.endAt,
        reminderSentFor: { $ne: candidate.endAt },
        $or: [
          { reminderClaimUntil: { $exists: false } },
          { reminderClaimUntil: { $lte: now } },
        ],
      },
      {
        $set: {
          reminderClaimId: claimId,
          reminderClaimUntil: new Date(now.getTime() + leaseMs),
        },
      },
      { returnDocument: "after" },
    );
    if (!claim) continue;
    try {
      const current = await subscriptionModel.findOne({
        _id: claim._id,
        endAt: claim.endAt,
        reminderClaimId: claimId,
      });
      if (!current || current.endAt <= new Date()) continue;
      await clientNotifications.expiring(current.clientId, current.endAt);
      await subscriptionModel.updateOne(
        { _id: claim._id, endAt: claim.endAt, reminderClaimId: claimId },
        {
          $set: { reminderSentFor: claim.endAt },
          $unset: { reminderClaimId: "", reminderClaimUntil: "" },
        },
      );
    } catch {
      await subscriptionModel.updateOne(
        { _id: claim._id, reminderClaimId: claimId },
        { $unset: { reminderClaimId: "", reminderClaimUntil: "" } },
      );
      console.error("Could not send a subscription expiry reminder");
    }
  }
}

export function startSubscriptionReminderScheduler() {
  const run = () => {
    void sendSubscriptionReminders().catch(() =>
      console.error("Subscription reminder check failed"),
    );
  };
  run();
  const timer = setInterval(run, intervalMs);
  timer.unref();
  return timer;
}
