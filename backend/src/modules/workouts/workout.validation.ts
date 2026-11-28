import { z } from "zod";

export const workoutHistorySchema = () => z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).max(1000000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
});

export const coachWorkoutHistorySchema = () => workoutHistorySchema().extend({
  params: z.object({ clientId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid client ID") }),
});

export const startWorkoutSchema = () => z.object({
  body: z.strictObject({ dayName: z.string().trim().min(1).max(80) }),
});

export const finishWorkoutSchema = () => z.object({
  params: z.object({ workoutId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid workout ID") }),
});

export const logWorkoutSetSchema = () => z.object({
  body: z.strictObject({
    exerciseName: z.string().trim().min(1).max(120),
    setNumber: z.number().int().min(1).max(100),
    reps: z.number().int().min(1).max(1000),
    weightKg: z.number().min(0).max(2000).optional(),
  }),
});
