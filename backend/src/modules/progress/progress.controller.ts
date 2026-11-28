import { Router, type Request } from "express";
import { authenticate } from "../../common/middleware/auth.js";
import { roleBasedAccessMiddleware } from "../../common/middleware/authorization.js";
import { validator } from "../../common/middleware/vallidator.js";
import { respopnseFormatter } from "../../common/middleware/response.formatter.js";
import { roleEnum } from "../../common/enums/role.enum.js";
import { progressService } from "./progress.service.js";
import { coachDashboardService } from "./coach-dashboard.service.js";
import { coachDashboardSchema, coachDashboardClientsSchema } from "./coach-dashboard.validation.js";
import { submitCheckInSchema, checkInListSchema, coachCheckInListSchema, coachProgressSummarySchema, exerciseProgressSchema, coachExerciseProgressSchema } from "./progress.validation.js";

export const progressRouter = Router();

progressRouter.get("/coach/dashboard", authenticate, roleBasedAccessMiddleware([roleEnum.coach]), validator(coachDashboardSchema),
  respopnseFormatter(async (req: Request) => ({ status: 200, msg: "Coach dashboard retrieved", data: await coachDashboardService.getOverview(req.validate.query) })));

progressRouter.get("/coach/clients", authenticate, roleBasedAccessMiddleware([roleEnum.coach]), validator(coachDashboardClientsSchema),
  respopnseFormatter(async (req: Request) => ({ status: 200, msg: "Client progress retrieved", data: await coachDashboardService.getClients(req.validate.query, req.validate.query.page, req.validate.query.limit) })));

progressRouter.post("/check-ins", authenticate, roleBasedAccessMiddleware([roleEnum.client]), validator(submitCheckInSchema),
  respopnseFormatter(async (req: Request) => ({ status: 201, msg: "Check-in saved", data: await progressService.submitCheckIn(String(req.user!._id), req.validate.body) })));

progressRouter.get("/me/check-ins", authenticate, roleBasedAccessMiddleware([roleEnum.client]), validator(checkInListSchema),
  respopnseFormatter(async (req: Request) => ({ status: 200, msg: "Check-ins retrieved", data: await progressService.getCheckIns(String(req.user!._id), req.validate.query.page, req.validate.query.limit) })));

progressRouter.get("/me/summary", authenticate, roleBasedAccessMiddleware([roleEnum.client]),
  respopnseFormatter(async (req: Request) => ({ status: 200, msg: "Progress retrieved", data: await progressService.getSummary(String(req.user!._id)) })));

progressRouter.get("/me/exercises", authenticate, roleBasedAccessMiddleware([roleEnum.client]), validator(exerciseProgressSchema),
  respopnseFormatter(async (req: Request) => ({ status: 200, msg: "Exercise progress retrieved", data: await progressService.getExerciseProgress(String(req.user!._id), req.validate.query.exerciseName) })));

progressRouter.get("/clients/:clientId/check-ins", authenticate, roleBasedAccessMiddleware([roleEnum.coach]), validator(coachCheckInListSchema),
  respopnseFormatter(async (req: Request) => ({ status: 200, msg: "Client check-ins retrieved", data: await progressService.getClientCheckIns(req.validate.params.clientId, req.validate.query.page, req.validate.query.limit) })));

progressRouter.get("/clients/:clientId/summary", authenticate, roleBasedAccessMiddleware([roleEnum.coach]), validator(coachProgressSummarySchema),
  respopnseFormatter(async (req: Request) => ({ status: 200, msg: "Client progress retrieved", data: await progressService.getClientSummary(req.validate.params.clientId) })));

progressRouter.get("/clients/:clientId/exercises", authenticate, roleBasedAccessMiddleware([roleEnum.coach]), validator(coachExerciseProgressSchema),
  respopnseFormatter(async (req: Request) => ({ status: 200, msg: "Client exercise progress retrieved", data: await progressService.getClientExerciseProgress(req.validate.params.clientId, req.validate.query.exerciseName) })));

progressRouter.get("/coach/recent-check-ins", authenticate, roleBasedAccessMiddleware([roleEnum.coach]), validator(checkInListSchema),
  respopnseFormatter(async (req: Request) => ({ status: 200, msg: "Recent check-ins retrieved", data: await progressService.getRecentCheckIns(req.validate.query.page, req.validate.query.limit) })));
