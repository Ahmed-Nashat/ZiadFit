import { z } from "zod";
import { generalFields } from "../../common/index.js";

export const userUpdateSchema = () =>
  z.object({
    body: z
      .strictObject({
        firstName: generalFields.name(),
        lastName: generalFields.name(),
        newPassword: generalFields.password(),
        cPassword: generalFields.cPassword(),
        phoneNumber: generalFields.phoneNumber(),
      })
      .superRefine((data, ctx) => {
        if (data.cPassword !== data.newPassword) {
          ctx.addIssue({
            code: "custom",
            path: ["cPassword"],
            message: "Passwords do not match.",
          });
        }
        if (data.firstName.trim().toLowerCase() === "admin") {
          ctx.addIssue({
            code: "invalid_value",
            path: ["firstName"],
            message: "This first name is not allowed.",
            values: [data.firstName],
          });
        }
        if (data.lastName.trim().toLowerCase() === "admin") {
          ctx.addIssue({
            code: "invalid_value",
            path: ["lastName"],
            message: "This last name is not allowed.",
            values: [data.lastName],
          });
        }
      }),
  });
