import { z } from "zod";

export const startWorkoutSchema = () => z.object({
  body: z.strictObject({ dayName: z.string().trim().min(1).max(80) }),
});

export const logWorkoutSetSchema = () => z.object({
  body: z.strictObject({
    exerciseName: z.string().trim().min(1).max(120),
    setNumber: z.number().int().min(1).max(100),
    reps: z.number().int().min(1).max(1000),
    weightKg: z.number().min(0).max(2000).optional(),
  }),
});
