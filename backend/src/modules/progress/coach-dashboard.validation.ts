import { z } from "zod";

const period = z.object({
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
}).transform((query, ctx) => {
  const to = query.to ? new Date(query.to) : new Date();
  const from = query.from ? new Date(query.from) : new Date(to.getTime() - 30 * 86400000);
  if (from >= to) {
    ctx.addIssue({ code: "custom", message: "from must be earlier than to" });
    return z.NEVER;
  }
  return { from, to };
});

export const coachDashboardSchema = () => z.object({ query: period });

export const coachDashboardClientsSchema = () => z.object({
  query: z.object({
    from: z.iso.datetime({ offset: true }).optional(),
    to: z.iso.datetime({ offset: true }).optional(),
    page: z.coerce.number().int().min(1).max(1000000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }).transform((query, ctx) => {
    const dates = period.safeParse(query);
    if (!dates.success) {
      for (const issue of dates.error.issues) ctx.addIssue({ code: "custom", message: issue.message, path: issue.path });
      return z.NEVER;
    }
    return { ...dates.data, page: query.page, limit: query.limit };
  }),
});
