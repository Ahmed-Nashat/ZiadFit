import { z } from "zod";
import type { IQuestionnaireAnswers } from "../../common/interface/questionnaire.interface.js";

const answersSchema: z.ZodType<IQuestionnaireAnswers> = z.strictObject({
  primaryGoal: z.string().trim().min(1),
  secondaryGoal: z.string().trim().min(1).optional(),
  heightCm: z.number().positive(),
  weightKg: z.number().positive(),
  bodyFatPercentage: z.number().min(0).max(100).optional(),
  energyLevel: z.number().int().min(1).max(10),
  stress: z.string().trim().min(1),
  smoking: z.string().trim().min(1),
  medicalHistory: z.string().trim().min(1),
  trainingExp: z.string().trim().min(1),
  trainingDaysPerWeek: z.number().int().min(0).max(7),
  sessionDurationMinutes: z.number().positive(),
  availableEquipment: z.string().trim().min(1),
  injuriesOrRestrictions: z.string().trim().min(1),
  sleepHours: z.number().min(0).max(24),
  preferredPlan: z.string().trim().min(1),
});

export const questionnaireSubmissionSchema = () =>
  z.object({ body: z.strictObject({ answers: answersSchema }) });

export const questionnaireAcceptanceSchema = () => z.object({
  params: z.object({ questionnaireId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid questionnaire ID") }),
  body: z.strictObject({ months: z.union([z.literal(1), z.literal(2), z.literal(3)]) }),
});

export const questionnaireDecisionSchema = () =>
  z.object({
    params: z.object({
      questionnaireId: z
        .string()
        .regex(/^[a-f\d]{24}$/i, "Invalid questionnaire ID"),
    }),
    body: z
      .strictObject({ notes: z.string().trim().min(1).max(2000).optional() })
      .default({}),
  });
