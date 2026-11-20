import { z } from "zod";
import { enums } from "../index.js";
import { isValidObjectId } from "mongoose";

export const generalFields = {
  email: () =>
    z
      .email({
        error:
          "invalid email format, please enter email like this example@gmail.com",
      })
      .regex(/^[A-Za-z0-9_\-\.]+@[A-Za-z\-_]{1,20}(\.[a-z]{2,8}){1,2}$/),
  password: () =>
    z
      .string()
      .max(20, { error: "password longer than expected" })
      .min(8, { error: "password shorter than expected" }),
  cPassword: () => z.string().max(20).min(8),
  phoneNumber: () =>
    z.e164({
      pattern: /^\+201[0125]\d{8}$/,
      error: "Phone number should be in egyption format",
    }),
  name: () =>
    z
      .string({ error: "Name must be a string." })
      .trim()
      .min(3, { error: "Name must be at least 3 characters." })
      .max(20, { error: "Name must be at most 20 characters." }),
  DOB: () => z.string(),
  gender: () =>
    z.enum(enums.genderEnum, {
      error: "gender must be male or female",
    }),
  id: () =>
    z
      .string()
      .min(14)
      .max(24)
      .refine((value) => isValidObjectId(value), {
        error: "Invalid ObjectId",
      }),

  page: () => z.coerce.number().gte(1),
  limit: () => z.coerce.number().gte(1),
  stringBool: () =>
    z.stringbool({
      truthy: ["true"],
      falsy: ["false"],
      error: "this value must be true or false",
    }),
  headers: () =>
    z.object({
      authorization: z.string().refine(
        (val) => {
          const [prefix, token] = (val || "").split(" ");
          return (
            prefix === "Bearer" && z.string().jwt().safeParse(token).success
          );
        },
        { message: "Invalid Bearer token" },
      ),
    }),
};
