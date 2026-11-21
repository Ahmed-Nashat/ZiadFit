import { NextFunction, Request, Response, Router } from "express";
import { userService, userUpdateSchema } from "./index.js";
import { respopnseFormatter, validator } from "../../common/index.js";
import { authenticateProfile } from "../../common/middleware/auth.js";
import { UnauthorizedException } from "../../common/exceptions/application.exception.js";
import { HUser } from "../../database/index.js";

export const userRouter = Router();

userRouter.put(
  "/updateUser",
  authenticateProfile,
  validator(userUpdateSchema),
  respopnseFormatter(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user as HUser;
      if (!user) throw new UnauthorizedException("Authentication required");
      const updatedUser = await userService.updateUser({
        user,
        userData: req.validate.body,
      });
      return {
        status: 200,
        msg: "User updated",
        data: updatedUser,
      };
    },
  ),
);
