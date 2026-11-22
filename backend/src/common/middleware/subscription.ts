import type { RequestHandler } from "express";
import {
  ForbiddenException,
  UnauthorizedException,
} from "../exceptions/application.exception.js";
import { roleEnum } from "../enums/role.enum.js";

// Apply after authenticate on routes that require an active client subscription.
export const requireActiveSubscription: RequestHandler = async (
  req,
  _res,
  next,
) => {
  if (!req.user) throw new UnauthorizedException("Authentication required");
  if (req.user.role !== roleEnum.client)
    throw new ForbiddenException("Client access required");
  const { subscriptionService } = await import("../../modules/subscriptions/subscription.service.js");
  const subscription = await subscriptionService.getSubscriptionStatus(String(req.user._id));
  if (subscription.status !== "active")
    throw new ForbiddenException("Active subscription required");
  next();
};
