import * as authService from "./auth.service.js";
import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";

export const authRouter = Router({
  caseSensitive: true,
  strict: true,
});

// ---------------------- SIGNUP -----------------------------
