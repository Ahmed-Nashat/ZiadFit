import { z } from "zod";

const pagination = z.object({
  page: z.coerce.number().int().min(1).max(1000000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
const clientParams = z.object({ clientId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid client ID") });

export const submitCheckInSchema = () => z.object({
  body: z.strictObject({
    weightKg: z.number().min(0.01).max(1000),
    note: z.string().trim().min(1).max(2000).optional(),
  }),
});
export const checkInListSchema = () => z.object({ query: pagination });
export const coachCheckInListSchema = () => z.object({ params: clientParams, query: pagination });
export const coachProgressSummarySchema = () => z.object({ params: clientParams });
const exerciseQuery = z.object({ exerciseName: z.string().trim().min(1).max(120) });
export const exerciseProgressSchema = () => z.object({ query: exerciseQuery });
export const coachExerciseProgressSchema = () => z.object({ params: clientParams, query: exerciseQuery });
