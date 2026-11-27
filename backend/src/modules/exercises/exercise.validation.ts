import { z } from "zod";

const exerciseFields = z.strictObject({
    name: z.string().trim().min(1).max(120),
    muscleGroup: z.string().trim().min(1).max(80),
    equipment: z.string().trim().min(1).max(120),
    instructions: z.string().trim().min(1).max(5000),
    videoUrl: z.url().max(2048).refine((value) => /^https?:\/\//i.test(value), "Video URL must use HTTP or HTTPS").optional(),
});

export const createExerciseSchema = () => z.object({ body: exerciseFields });

const exerciseId = z.object({ exerciseId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid exercise ID") });

export const updateExerciseSchema = () => z.object({
  params: exerciseId,
  body: exerciseFields.partial().refine((data) => Object.values(data).some((value) => value !== undefined), "Provide at least one field to update"),
});

export const archiveExerciseSchema = () => z.object({ params: exerciseId });

export const listExercisesSchema = () => z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    muscleGroup: z.string().trim().min(1).max(80).optional(),
  }),
});

export const searchExercisesSchema = () => z.object({
  query: z.object({
    name: z.string().trim().min(1).max(120),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
});
