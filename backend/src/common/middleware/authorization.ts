import type { RequestHandler } from "express";
import { roleEnum } from "../enums/role.enum.js";
import { ForbiddenException, UnauthorizedException } from "../exceptions/application.exception.js";

export const roleBasedAccessMiddleware = (roles: roleEnum[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) throw new UnauthorizedException("Authentication required");
    if (typeof req.user.role !== "number" || !roles.includes(req.user.role))
      throw new ForbiddenException("You do not have permission to access this resource");
    next();
  };
