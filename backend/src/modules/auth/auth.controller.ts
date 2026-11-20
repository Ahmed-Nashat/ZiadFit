import { respopnseFormatter, validator } from "../../common/index.js";
import { authService } from "./auth.service.js";
import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { authValidation } from "./index.js";

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
