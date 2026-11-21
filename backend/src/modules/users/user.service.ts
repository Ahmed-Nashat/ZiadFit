import { exceptions, IUser, security } from "../../common/index.js";
import { userRepo, UserRepo } from "../../common/repo/user.repo.js";
import { HUser } from "../../database/index.js";
import { questionnaireRepo } from "../../common/repo/questionnaire.repo.js";
import { questionnaireStatusEnum } from "../../common/enums/questionnaireStatus.enum.js";
import { cacheService } from "../../common/services/cache.service.js";
import { AuthHelpers, authHelpers } from "../auth/auth.helpers.js";
import { Types } from "mongoose";
import type { ICachedUser } from "../../common/interface/token.interface.js";

interface IUpdateUser {
  user: HUser;
  userData: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
  };
}

class UserService {
  private readonly userRepo: UserRepo;
  private readonly authHelpers: AuthHelpers;
  constructor() {
    this.userRepo = userRepo;
    this.authHelpers = authHelpers;
  }

  // ---------------------- GET PENDING REQUESTS ---------------
  async getPendingRequests(page?: number, limit?: number) {
    const result = await questionnaireRepo.paggination({
      filter: { status: questionnaireStatusEnum.pending },
      page,
      limit,
      select: ["clientId", "status", "answers", "submittedAt"],
      options: { sort: { submittedAt: 1, _id: 1 } },
    });
    return {
      ...result,
      meta: {
        ...result.meta,
        totalCount: result.meta.count,
        currentPage: result.meta.currenPage,
        remainingCount: Math.max(
          0,
          result.meta.count -
            ((result.meta.currenPage - 1) * (limit ?? 10) + result.data.length),
        ),
      },
    };
  }

  // ---------------------- UPDATE USER ------------------------
  async updateUser({ user, userData }: IUpdateUser): Promise<IUser | null> {
    const update: Partial<
      Pick<IUser, "firstName" | "lastName" | "phoneNumber">
    > = {};
    if (userData.firstName !== undefined) update.firstName = userData.firstName;
    if (userData.lastName !== undefined) update.lastName = userData.lastName;
    if (userData.phoneNumber !== undefined)
      update.phoneNumber = security.encrypting(userData.phoneNumber);
    const updated = await this.userRepo.findOneAndUpdate({
      filter: {
        _id: user._id,
      },
      update: {
        $set: update,
      },
      options: { runValidators: true },
    });
    if (!updated) throw new exceptions.NotFoundException("User not found");
    await cacheService.del({
      key: [authHelpers.getUserKey(user._id.toString())],
    });
    await cacheService.del({
      key: [authHelpers.getLoginUserKey(user._id.toString())],
    });
    return updated;
  }

  // ---------------------- CHANGE PASSWORD --------------------
  async changePassword({
    user,
    currentPassword,
    newPassword,
  }: {
    user: HUser | ICachedUser;
    currentPassword: string;
    newPassword: string;
  }): Promise<void> {
    const userId = user._id;
    const account = await this.userRepo.findByEmail({
      email: user.email as string,
      includePassword: true,
    });
    console.log({ account });

    await security.compare({
      plainText: currentPassword,
      cipherText: account!.password,
    });
    const password = await security.hash({ plainText: newPassword });
    const updated = await this.userRepo.findOneAndUpdate({
      filter: { _id: userId },
      update: { $set: { password, credentialsChangedAt: Date.now() } },
      options: { runValidators: true },
    });
    if (!updated)
      throw new exceptions.ConflictException(
        "Password changed. Please try again.",
      );
    await cacheService.del({
      key: [this.authHelpers.getUserKey(userId.toString())],
    });
  }
}

export const userService = new UserService();
