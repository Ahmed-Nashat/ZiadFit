import { Router, type Request } from "express";
import { z } from "zod";
import { authenticate } from "../../common/middleware/auth.js";
import { roleBasedAccessMiddleware } from "../../common/middleware/authorization.js";
import { respopnseFormatter } from "../../common/middleware/response.formatter.js";
import { validator } from "../../common/middleware/vallidator.js";
import { roleEnum } from "../../common/enums/role.enum.js";
import { subscriptionService } from "./subscription.service.js";
import { subsctiptionSchema, linkExistingSubscriptionSchema } from "./subscription.validation.js";

export const subscriptionRouter = Router();

// ---------------------- LINK EXISTING SUBSCRIBER -----------
subscriptionRouter.post(
  "/clients/:clientId/link-existing",
  authenticate,
  roleBasedAccessMiddleware([roleEnum.coach]),
  validator(linkExistingSubscriptionSchema),
  respopnseFormatter(async (req: Request) => ({
    status: 201,
    msg: "Existing subscription linked",
    data: await subscriptionService.linkExistingSubscription({
      clientId: String(req.params.clientId),
      coachId: String(req.user!._id),
      startAt: new Date(req.validate.body.startAt),
      endAt: new Date(req.validate.body.endAt),
    }),
  })),
);

subscriptionRouter.get(
  "/me",
  authenticate,
  roleBasedAccessMiddleware([roleEnum.client]),
  respopnseFormatter(async (req: Request) => ({
    status: 200,
    msg: "Subscription retrieved",
    data: await subscriptionService.getSubscriptionStatus(
      String(req.user!._id),
    ),
  })),
);

subscriptionRouter.put(
  "/clients/:clientId",
  authenticate,
  roleBasedAccessMiddleware([roleEnum.coach]),
  validator(subsctiptionSchema),
  respopnseFormatter(async (req: Request) => ({
    status: 200,
    msg: "Subscription activated",
    data: await subscriptionService.activateSubscription(
      String(req.params.clientId),
      String(req.user!._id),
      req.validate.body.months,
    ),
  })),
);
