import { z } from "zod";
import { generalFields } from "../../common/index.js";

export const clientNameSearchSchema = () => z.object({
  query: z.object({
    name: z.string().trim().min(1).max(100),
    page: z.coerce.number().int().min(1).max(1000000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
});

export const clientListSchema = () =>
  z.object({
    query: z.strictObject({
      search: z.string().trim().min(1).max(100).optional(),
      accountStatus: z.enum(["0", "1"]).transform(Number).optional(),
      gender: z.enum(["0", "1"]).transform(Number).optional(),
      page: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(1000000)).optional(),
      limit: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(100)).optional(),
    }),
  });

export const userUpdateSchema = () =>
  z.object({
    body: z
      .strictObject({
        firstName: generalFields.name().optional(),
        lastName: generalFields.name().optional(),
        phoneNumber: generalFields.phoneNumber().optional(),
      })
      .superRefine((data, ctx) => {
        if (!Object.values(data).some((value) => value !== undefined)) {
          ctx.addIssue({
            code: "custom",
            message: "Provide at least one field to update.",
          });
        }
        if (data.firstName?.trim().toLowerCase() === "admin") {
          ctx.addIssue({
            code: "invalid_value",
            path: ["firstName"],
            message: "This first name is not allowed.",
            values: [data.firstName],
          });
        }
        if (data.lastName?.trim().toLowerCase() === "admin") {
          ctx.addIssue({
            code: "invalid_value",
            path: ["lastName"],
            message: "This last name is not allowed.",
            values: [data.lastName],
          });
        }
      }),
  });

export const changePasswordSchema = () =>
  z.object({
    body: z.strictObject({
      currentPassword: z.string().min(1),
      newPassword: generalFields.password(),
      cPassword: generalFields.cPassword(),
    }).refine((data) => data.newPassword === data.cPassword, {
      path: ["cPassword"],
      message: "Passwords do not match.",
    }),
  });
