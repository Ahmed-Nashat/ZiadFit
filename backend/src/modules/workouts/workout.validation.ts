import { z } from "zod";

export const startWorkoutSchema = () => z.object({
  body: z.strictObject({ dayName: z.string().trim().min(1).max(80) }),
});
