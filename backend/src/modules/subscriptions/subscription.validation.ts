import { z } from "zod";

export const subsctiptionSchema = () =>
  z.object({
    body: z.strictObject({
      months: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    }),
  });
