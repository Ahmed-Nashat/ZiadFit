import { respopnseFormatter, validator } from "../../common/index.js";
import { authService } from "./auth.service.js";
import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { authValidation } from "./index.js";
import { eventEnum } from "../../common/enums/events.enum.js";
import { UnauthorizedException } from "../../common/exceptions/application.exception.js";
import { authenticate } from "../../common/middleware/auth.js";

const getAuthenticatedEmail = (req: Request): string => {
  const email = req.user?.email;
  if (typeof email !== "string" || !email.trim()) {
    throw new UnauthorizedException("Authentication required");
  }
  return email;
};

export const authRouter = Router({
  caseSensitive: true,
  strict: true,
});

// ---------------------- SIGNUP -----------------------------
authRouter.post(
  "/signup",
  validator(authValidation.signupSchema),
  respopnseFormatter(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = await authService.createUser({ userData: req.body });
      return {
        status: 200,
        data: {},
        msg: "User created",
      };
    },
  ),
);

// ---------------------- RESEND OTP -------------------------
authRouter.post(
  "/resend-otp",
  authenticate,
  respopnseFormatter(async (req: Request) => {
    await authService.resendOtp({ email: getAuthenticatedEmail(req), topic: eventEnum.signup });
    return { status: 200, data: {}, msg: "Verification code sent" };
  }),
);

// ---------------------- CONFIRM EMAIL ----------------------
authRouter.post(
  "/confirm-email",
  authenticate,
  validator(authValidation.confirmEmailSchema),
  respopnseFormatter(async (req: Request) => {
    await authService.confirmEmail({ email: getAuthenticatedEmail(req), otp: req.validate.body.otp });
    return { status: 200, data: {}, msg: "Email verified" };
  }),
);
