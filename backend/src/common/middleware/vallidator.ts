import type { NextFunction, Request, Response } from "express";
import { enums } from "../index.js";
import { z } from "zod";
import { exceptions } from "../index.js";

type validationSchema = () => z.ZodType;

export const validator = (schema: validationSchema) => {
  return (req: Request, res: Response, next: NextFunction): any => {
    const { success, error, data } = schema().safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
      header: req.headers,
    });
    if (!success) {
      throw new exceptions.BadRequestException(
        "Validation Error",
        error?.issues,
      );
    }
    req.validate = data;
    return next();
  };
};
