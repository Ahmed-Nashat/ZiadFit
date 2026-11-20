import type { RequestHandler } from "express";
import { UnauthorizedException } from "../exceptions/application.exception.js";

export const requireBearer: RequestHandler = (req, _res, next) => {
  if (!/^Bearer\s+\S+$/i.test(req.headers.authorization ?? "")) {
    throw new UnauthorizedException("Bearer token required");
  }
  next();
};
