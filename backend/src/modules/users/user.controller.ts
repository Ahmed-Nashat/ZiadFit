import { Request, Router } from "express";
import {
  userService,
  userUpdateSchema,
  changePasswordSchema,
} from "./index.js";
import { respopnseFormatter, validator } from "../../common/index.js";
import { authenticate } from "../../common/middleware/auth.js";
import { roleBasedAccessMiddleware } from "../../common/middleware/authorization.js";
import { roleEnum } from "../../common/enums/role.enum.js";
import { HUser } from "../../database/index.js";

export const userRouter = Router();

userRouter.get(
  "/clients",
  authenticate,
  roleBasedAccessMiddleware([roleEnum.coach]),
  respopnseFormatter(async (req: Request) => {
    const { page, limit } = req.query;
    return {
      status: 200,
      msg: "Clients retrieved",
      data: await userService.getClients(
        page === undefined ? undefined : Number(page),
        limit === undefined ? undefined : Number(limit),
      ),
    };
  }),
);

userRouter.get(
  "/clients/:clientId",
  authenticate,
  roleBasedAccessMiddleware([roleEnum.coach]),
  respopnseFormatter(async (req: Request) => ({
    status: 200,
    msg: "Client retrieved",
    data: await userService.getClient(req.params.clientId as string),
  })),
);

// ---------------------- GET PENDING REQUESTS ---------------
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

// ---------------------- UPDATE USER ------------------------
userRouter.put(
  "/update-user",
  authenticate,
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

// ---------------------- CHANGE PASSWORD --------------------
userRouter.patch(
  "/change-password",
  authenticate,
  validator(changePasswordSchema),
  respopnseFormatter(async (req: Request) => {
    await userService.changePassword({ user: req.user!, ...req.validate.body });
    return { status: 200, msg: "Password changed. Please log in again." };
  }),
);
