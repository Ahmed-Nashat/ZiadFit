import { Router, type Request } from "express";
import { authenticate } from "../../common/middleware/auth.js";
import { roleBasedAccessMiddleware } from "../../common/middleware/authorization.js";
import { validator } from "../../common/middleware/vallidator.js";
import { respopnseFormatter } from "../../common/middleware/response.formatter.js";
import { roleEnum } from "../../common/enums/role.enum.js";
import { workoutService } from "./workout.service.js";
import { coachWorkoutHistorySchema, finishWorkoutSchema, logWorkoutSetSchema, previousPerformanceSchema, startWorkoutSchema, workoutHistorySchema } from "./workout.validation.js";

export const workoutRouter = Router();

workoutRouter.get("/previous-performance", authenticate, roleBasedAccessMiddleware([roleEnum.client]), validator(previousPerformanceSchema),
  respopnseFormatter(async (req: Request) => ({
    status: 200,
    msg: "Previous exercise performance retrieved",
    data: await workoutService.getPreviousPerformance(String(req.user!._id), req.validate.query.exerciseName),
  })));

workoutRouter.get("/clients/:clientId/history", authenticate, roleBasedAccessMiddleware([roleEnum.coach]), validator(coachWorkoutHistorySchema),
  respopnseFormatter(async (req: Request) => ({
    status: 200,
    msg: "Client workout history retrieved",
    data: await workoutService.getClientWorkoutHistory(req.validate.params.clientId, req.validate.query.page, req.validate.query.limit),
  })));

workoutRouter.get("/history", authenticate, roleBasedAccessMiddleware([roleEnum.client]), validator(workoutHistorySchema),
  respopnseFormatter(async (req: Request) => ({
    status: 200,
    msg: "Workout history retrieved",
    data: await workoutService.getWorkoutHistory(String(req.user!._id), req.validate.query.page, req.validate.query.limit),
  })));

workoutRouter.patch("/:workoutId/finish", authenticate, roleBasedAccessMiddleware([roleEnum.client]), validator(finishWorkoutSchema),
  respopnseFormatter(async (req: Request) => ({
    status: 200,
    msg: "Workout completed",
    data: await workoutService.finishWorkout(String(req.user!._id), req.validate.params.workoutId),
  })));

workoutRouter.put("/active/sets", authenticate, roleBasedAccessMiddleware([roleEnum.client]), validator(logWorkoutSetSchema),
  respopnseFormatter(async (req: Request) => ({
    status: 200,
    msg: "Workout set saved",
    data: await workoutService.logSet(String(req.user!._id), req.validate.body),
  })));

workoutRouter.post("/start", authenticate, roleBasedAccessMiddleware([roleEnum.client]), validator(startWorkoutSchema),
  respopnseFormatter(async (req: Request) => ({
    status: 201,
    msg: "Workout started",
    data: await workoutService.startWorkout(String(req.user!._id), req.validate.body.dayName),
  })));

workoutRouter.get("/active", authenticate, roleBasedAccessMiddleware([roleEnum.client]),
  respopnseFormatter(async (req: Request) => ({
    status: 200,
    msg: "Active workout retrieved",
    data: await workoutService.getActiveWorkout(String(req.user!._id)),
  })));
