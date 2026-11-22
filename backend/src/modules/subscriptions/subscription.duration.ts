export type SubscriptionDuration = 1 | 2 | 3;

export function calculateSubscriptionEnd(
  startAt: Date,
  months: SubscriptionDuration,
): Date {
  const endAt = new Date(startAt);
  const day = endAt.getUTCDate();
  endAt.setUTCDate(1);
  endAt.setUTCMonth(endAt.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(endAt.getUTCFullYear(), endAt.getUTCMonth() + 1, 0),
  ).getUTCDate();
  endAt.setUTCDate(Math.min(day, lastDay));
  return endAt;
}
