import { Router, type Request } from "express";
import { authenticate } from "../../common/middleware/auth.js";
import { roleBasedAccessMiddleware } from "../../common/middleware/authorization.js";
import { validator } from "../../common/middleware/vallidator.js";
import { respopnseFormatter } from "../../common/middleware/response.formatter.js";
import { roleEnum } from "../../common/enums/role.enum.js";
import { workoutService } from "./workout.service.js";
import { startWorkoutSchema } from "./workout.validation.js";

export const workoutRouter = Router();

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
