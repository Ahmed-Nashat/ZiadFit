import { z } from "zod";

export const subsctiptionSchema = () =>
  z.object({
    body: z.strictObject({
      months: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    }),
  });

export const linkExistingSubscriptionSchema = () =>
  z.object({
    body: z.strictObject({
      startAt: z.iso.datetime({ offset: true }),
      endAt: z.iso.datetime({ offset: true }),
    }),
  });
