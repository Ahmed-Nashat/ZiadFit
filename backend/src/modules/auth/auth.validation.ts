import { z } from "zod";
import { generalFields } from "../../common/index.js";

const loginBody = () =>
  z.object({
    email: generalFields.email(),
    password: generalFields.password(),
  });

export const loginSchema = () =>
  z.object({
    body: loginBody(),
  });

const signBody = () =>
  loginBody()
    .safeExtend({
      phoneNumber: generalFields.phoneNumber(),
      cPassword: generalFields.cPassword(),
      firstName: generalFields.name(),
      lastName: generalFields.name(),
      gender: generalFields.gender(),
      DOB: generalFields.DOB(),
    })
    .superRefine((data, ctx) => {
      if (data.cPassword !== data.password) {
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

      // Expect the date in YYYY-MM-DD format.
      const dateFormat = /^\d{4}-\d{2}-\d{2}$/;
      const dateOfBirth = new Date(`${data.DOB}T00:00:00.000Z`);

      const isValidDate =
        dateFormat.test(data.DOB) &&
        !Number.isNaN(dateOfBirth.getTime()) &&
        dateOfBirth.toISOString().slice(0, 10) === data.DOB;

      if (!isValidDate) {
        ctx.addIssue({
          code: "custom",
          path: ["DOB"],
          message: "Enter a valid date of birth in YYYY-MM-DD format.",
        });
      } else if (dateOfBirth > new Date()) {
        ctx.addIssue({
          code: "custom",
          path: ["DOB"],
          message: "Date of birth cannot be in the future.",
        });
      }
    });

export const signupSchema = () =>
  z.object({
    body: signBody(),
  });

export const resendSignupOtpSchema = () => z.object({
  body: z.object({ email: generalFields.email() }),
});

export const confirmEmailSchema = () => z.object({
  body: z.object({
    email: generalFields.email(),
    otp: z.string().regex(/^\d{6}$/, "OTP must contain six digits"),
  }),
});

export const refreshTokenSchema = () =>
  z.object({
    headers: generalFields.headers().passthrough(),
  });
