import { Router, type Request } from "express";
import { authenticate } from "../../common/middleware/auth.js";
import { roleBasedAccessMiddleware } from "../../common/middleware/authorization.js";
import { validator } from "../../common/middleware/vallidator.js";
import { respopnseFormatter } from "../../common/middleware/response.formatter.js";
import { roleEnum } from "../../common/enums/role.enum.js";
import { exerciseService } from "./exercise.service.js";
import {
  createExerciseSchema,
  listExercisesSchema,
  searchExercisesSchema,
  updateExerciseSchema,
  archiveExerciseSchema,
} from "./exercise.validation.js";

export const exerciseRouter = Router();

exerciseRouter.patch(
  "/:exerciseId/unarchive",
  authenticate,
  roleBasedAccessMiddleware([roleEnum.coach]),
  validator(archiveExerciseSchema),
  respopnseFormatter(async (req: Request) => ({
    status: 200,
    msg: "Exercise unarchived",
    data: await exerciseService.unarchiveExercise(req.validate.params.exerciseId),
  })),
);

exerciseRouter.get(
  "/search",
  authenticate,
  roleBasedAccessMiddleware([roleEnum.coach]),
  validator(searchExercisesSchema),
  respopnseFormatter(async (req: Request) => ({
    status: 200,
    msg: "Exercises retrieved",
    data: await exerciseService.searchExercises(
      req.validate.query.name,
      req.validate.query.page,
      req.validate.query.limit,
    ),
  })),
);

exerciseRouter.patch(
  "/:exerciseId",
  authenticate,
  roleBasedAccessMiddleware([roleEnum.coach]),
  validator(updateExerciseSchema),
  respopnseFormatter(async (req: Request) => ({
    status: 200,
    msg: "Exercise updated",
    data: await exerciseService.updateExercise(req.validate.params.exerciseId, req.validate.body),
  })),
);

exerciseRouter.patch(
  "/:exerciseId/archive",
  authenticate,
  roleBasedAccessMiddleware([roleEnum.coach]),
  validator(archiveExerciseSchema),
  respopnseFormatter(async (req: Request) => ({
    status: 200,
    msg: "Exercise archived",
    data: await exerciseService.archiveExercise(req.validate.params.exerciseId),
  })),
);

exerciseRouter.post(
  "/",
  authenticate,
  roleBasedAccessMiddleware([roleEnum.coach]),
  validator(createExerciseSchema),
  respopnseFormatter(async (req: Request) => ({
    status: 201,
    msg: "Exercise created",
    data: await exerciseService.createExercise(
      String(req.user!._id),
      req.validate.body,
    ),
  })),
);

exerciseRouter.get(
  "/",
  authenticate,
  roleBasedAccessMiddleware([roleEnum.coach]),
  validator(listExercisesSchema),
  respopnseFormatter(async (req: Request) => ({
    status: 200,
    msg: "Exercises retrieved",
    data: await exerciseService.getExercises(
      req.validate.query.page,
      req.validate.query.limit,
      req.validate.query.muscleGroup,
    ),
  })),
);
