import { Router, type Request } from "express";
import {
  authenticate,
  authenticateProfile,
} from "../../common/middleware/auth.js";
import { roleBasedAccessMiddleware } from "../../common/middleware/authorization.js";
import { validator } from "../../common/middleware/vallidator.js";
import { respopnseFormatter } from "../../common/middleware/response.formatter.js";
import { roleEnum } from "../../common/enums/role.enum.js";
import { trainingPlanService } from "./training-plan.service.js";
import {
  createTrainingPlanSchema,
  listTrainingPlansSchema,
  deleteTrainingDaySchema,
} from "./training-plan.validation.js";

export const trainingPlanRouter = Router();

trainingPlanRouter.delete(
  "/:clientId/days/:dayName",
  authenticate,
  roleBasedAccessMiddleware([roleEnum.coach]),
  validator(deleteTrainingDaySchema),
  respopnseFormatter(async (req: Request) => ({
    status: 200,
    msg: "Training day deleted",
    data: await trainingPlanService.deleteDay(
      req.validate.params.clientId,
      req.validate.params.dayName,
    ),
  })),
);

trainingPlanRouter.post(
  "/",
  authenticate,
  roleBasedAccessMiddleware([roleEnum.coach]),
  validator(createTrainingPlanSchema),
  respopnseFormatter(async (req: Request) => ({
    status: 200,
    msg: "Training plan saved",
    data: await trainingPlanService.createTrainingPlan(
      String(req.user!._id),
      req.validate.body,
    ),
  })),
);

trainingPlanRouter.get(
  "/mine",
  authenticateProfile,
  roleBasedAccessMiddleware([roleEnum.client]),
  validator(listTrainingPlansSchema),
  respopnseFormatter(async (req: Request) => ({
    status: 200,
    msg: "Training plans retrieved",
    data: await trainingPlanService.getMyPlans(
      String(req.user!._id),
      req.validate.query.page,
      req.validate.query.limit,
    ),
  })),
);
