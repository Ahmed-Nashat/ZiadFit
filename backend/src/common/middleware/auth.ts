import type { RequestHandler } from "express";
import { userModel } from "../../database/models/user.model.js";
import { tokenService } from "../services/token.service.js";
import { tokenTypesEnum } from "../enums/tokentypes.enum.js";
import { accountStatusEnum } from "../enums/accountStatus.enum.js";
import { compare } from "../security/hashing.js";
import { UnauthorizedException } from "../exceptions/application.exception.js";
import jwt from "jsonwebtoken";

// Basic authentication allows an unverified user to confirm their email.
const authenticateRequest = (allowSuspended: boolean): RequestHandler => async (req, _res, next) => {
  const authorization = req.headers.authorization;
  const match = authorization?.match(/^(Basic|Bearer)\s+(\S+)$/i);
  if (!match) throw new UnauthorizedException("Authentication required");

  const [, scheme, token] = match;
  let user;
  if (scheme!.toLowerCase() === "basic") {
    const credentials = Buffer.from(token!, "base64").toString("utf8");
    const separator = credentials.indexOf(":");
    if (separator <= 0) throw new UnauthorizedException("Invalid credentials");
    const email = credentials.slice(0, separator).trim().toLowerCase();
    const password = credentials.slice(separator + 1);
    user = await userModel.findOne({ email }).select("+password");
    if (!user) throw new UnauthorizedException("Invalid credentials");
    try {
      await compare({ plainText: password, cipherText: user.password });
    } catch (error) {
      if (error instanceof Error && error.name === "BadRequestException") {
        throw new UnauthorizedException("Invalid credentials");
      }
      throw error;
    }
    user.password = undefined as unknown as string;
  } else {
    try {
      user = await tokenService.verifyToken({
        token: token!,
        tokenType: tokenTypesEnum.access,
      });
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError || (error instanceof Error && error.message === "Invalid token")) {
        throw new UnauthorizedException("Invalid token");
      }
      throw error;
    }
    if (!user) throw new UnauthorizedException("Invalid token");
  }

  if (!allowSuspended && user.accountStatus === accountStatusEnum.suspended) {
    throw new UnauthorizedException("Account is suspended");
  }
  req.user = user;
  next();
};

export const authenticate = authenticateRequest(false);
export const authenticateProfile = authenticateRequest(true);
