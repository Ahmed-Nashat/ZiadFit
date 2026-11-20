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
  "/login",
  validator(authValidation.loginSchema),
  respopnseFormatter(async (req: Request) => {
    const tokens = await authService.login({
      userData: req.validate.body,
      issuer: `${req.protocol}://${req.get("host")}`,
    });
    return { status: 200, data: tokens, msg: "Logged in" };
  }),
);

// ---------------------- RESEND OTP -------------------------
authRouter.post(
  "/resend-otp",
  validator(authValidation.resendSignupOtpSchema),
  respopnseFormatter(async (req: Request) => {
    await authService.resendOtp({ email: req.validate.body.email, topic: eventEnum.signup });
    return { status: 200, data: {}, msg: "Verification code sent" };
  }),
);

// ---------------------- CONFIRM EMAIL ----------------------
authRouter.post(
  "/confirm-email",
  validator(authValidation.confirmEmailSchema),
  respopnseFormatter(async (req: Request) => {
    await authService.confirmEmail(req.validate.body);
    return { status: 200, data: {}, msg: "Email verified" };
  }),
);
