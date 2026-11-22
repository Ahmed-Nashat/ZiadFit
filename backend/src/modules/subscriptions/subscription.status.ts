export function subscriptionStatus(
  subscription: { startAt: Date; endAt: Date } | null,
  now = new Date(),
): "none" | "active" | "expired" {
  if (!subscription) return "none";
  return subscription.endAt.getTime() > now.getTime() ? "active" : "expired";
}
