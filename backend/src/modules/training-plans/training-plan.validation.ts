import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID");

export const deleteTrainingDaySchema = () => z.object({
  params: z.object({ clientId: objectId, dayName: z.string().trim().min(1).max(80) }),
});

export const createTrainingPlanSchema = () => z.object({
  body: z.strictObject({
    clientId: objectId,
    title: z.string().trim().min(1).max(120),
    days: z.array(z.strictObject({
      name: z.string().trim().min(1).max(80),
      exercises: z.array(z.strictObject({
        exerciseName: z.string().trim().min(1).max(120),
        sets: z.number().int().min(1).max(100),
        reps: z.number().int().min(1).max(1000),
        notes: z.string().trim().min(1).max(1000).optional(),
      })).min(1).max(50),
    })).min(1).max(7),
  }),
});

export const listTrainingPlansSchema = () => z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
});
