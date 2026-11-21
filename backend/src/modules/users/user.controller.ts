import { Request, Router } from "express";
import { userService, userUpdateSchema } from "./index.js";
import { respopnseFormatter, validator } from "../../common/index.js";
import {
  authenticate,
  authenticateProfile,
} from "../../common/middleware/auth.js";
import { roleBasedAccessMiddleware } from "../../common/middleware/authorization.js";
import { roleEnum } from "../../common/enums/role.enum.js";
import { HUser } from "../../database/index.js";

export const userRouter = Router();

userRouter.get(
  "/pending-requests",
  authenticate,
  roleBasedAccessMiddleware([roleEnum.coach]),
  respopnseFormatter(async (req: Request) => {
    const { page, limit } = req.query;
    return {
      status: 200,
      msg: "Pending requests retrieved",
      data: await userService.getPendingRequests(
        page === undefined ? undefined : Number(page),
        limit === undefined ? undefined : Number(limit),
      ),
    };
  }),
);

userRouter.put(
  "/update-user",
  authenticateProfile,
  validator(userUpdateSchema),
  respopnseFormatter(async (req: Request) => {
    const user = req.user as HUser;
    const updatedUser = await userService.updateUser({
      user,
      userData: req.validate.body,
    });
    return {
      status: 200,
      msg: "User updated",
      data: updatedUser,
    };
  }),
);
