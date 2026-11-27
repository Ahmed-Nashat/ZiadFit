import { Router, type Request } from "express";
import { authenticate } from "../../common/middleware/auth.js";
import { roleBasedAccessMiddleware } from "../../common/middleware/authorization.js";
import { validator } from "../../common/middleware/vallidator.js";
import { respopnseFormatter } from "../../common/middleware/response.formatter.js";
import { roleEnum } from "../../common/enums/role.enum.js";
import { questionnaireService } from "./questionnaire.service.js";
import { questionnaireAcceptanceSchema, questionnaireDecisionSchema, questionnaireSubmissionSchema } from "./questionnaire.validation.js";

export const questionnaireRouter = Router();

// ---------------------- SUBMIT QUESTIONNAIRE ---------------
questionnaireRouter.post(
  "/submit",
  authenticate,
  roleBasedAccessMiddleware([roleEnum.client]),
  validator(questionnaireSubmissionSchema),
  respopnseFormatter(async (req: Request) => ({
    status: 201,
    msg: "Questionnaire submitted",
    data: await questionnaireService.submitQuestionnaire({
      clientId: String(req.user!._id),
      answers: req.validate.body.answers,
    }),
  })),
);

questionnaireRouter.patch(
  "/:questionnaireId/review",
  authenticate,
  roleBasedAccessMiddleware([roleEnum.coach]),
  validator(questionnaireDecisionSchema),
  respopnseFormatter(async (req: Request) => ({
    status: 200,
    msg: "Questionnaire reviewed",
    data: await questionnaireService.reviewQuestionnaire({
      questionnaireId: req.validate.params.questionnaireId,
      coachId: String(req.user!._id),
      notes: req.validate.body.notes,
    }),
  })),
);

questionnaireRouter.patch(
    "/:questionnaireId/accept",
    authenticate,
    roleBasedAccessMiddleware([roleEnum.coach]),
    validator(questionnaireAcceptanceSchema),
    respopnseFormatter(async (req: Request) => ({
      status: 200,
      msg: "Questionnaire accepted",
      data: await questionnaireService.acceptQuestionnaire({
        questionnaireId: req.validate.params.questionnaireId,
        coachId: String(req.user!._id),
        months: req.validate.body.months,
      }),
    })),
  );
