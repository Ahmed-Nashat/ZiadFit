import {
  exceptions,
  IUser,
  security,
  repos,
  enums,
  type ICachedUser,
  IPgginate,
} from "../../common/index.js";
import { HUser } from "../../database/index.js";
import { cacheService } from "../../common/services/cache.service.js";
import { AuthHelpers, authHelpers } from "../auth/auth.helpers.js";
import { isValidObjectId, Types, type QueryFilter } from "mongoose";

interface IUpdateUser {
  user: HUser;
  userData: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
  };
}

class UserService {
  private readonly userRepo: repos.UserRepo;
  private readonly authHelpers: AuthHelpers;
  private readonly security = security;
  private readonly questionnaireRepo: repos.QuestionnaireRepo;
  constructor() {
    this.userRepo = repos.userRepo;
    this.authHelpers = authHelpers;
    this.questionnaireRepo = repos.questionnaireRepo;
  }

  // ---------------------- GET CLIENTS ------------------------
  async getClients({
    search,
    accountStatus,
    gender,
    page,
    limit,
  }: {
    search?: string;
    accountStatus?: enums.accountStatusEnum;
    gender?: enums.genderEnum;
    page?: number;
    limit?: number;
  } = {}): Promise<IPgginate<HUser>> {
    const filter: QueryFilter<IUser> = { role: enums.roleEnum.client };
    if (accountStatus !== undefined) filter.accountStatus = accountStatus;
    if (gender !== undefined) filter.gender = gender;
    if (search) {
      filter.$and = search.split(/\s+/).map((term) => {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const pattern = new RegExp(escaped, "i");
        return {
          $or: [
            { firstName: pattern },
            { lastName: pattern },
            { email: pattern },
          ],
        };
      });
    }
    return this.userRepo.paggination({
      filter,
      page,
      limit,
      select: ["firstName", "lastName", "email", "accountStatus", "createdAt"],
      options: { sort: { createdAt: -1, _id: -1 } },
    });
  }

  // ---------------------- GET CLIENTS ------------------------
  async getClient(clientId: string): Promise<IUser> {
    if (!isValidObjectId(clientId))
      throw new exceptions.BadRequestException("Invalid client ID");
    const client = await this.userRepo.findOne({
      filter: {
        _id: new Types.ObjectId(clientId),
        role: enums.roleEnum.client,
      },
      projection: {
        firstName: 1,
        lastName: 1,
        email: 1,
        gender: 1,
        DOB: 1,
        accountStatus: 1,
        createdAt: 1,
      },
    });
    if (!client) throw new exceptions.NotFoundException("Client not found");
    return client;
  }

  // ---------------------- GET PENDING REQUESTS ---------------
  async getPendingRequests(page?: number, limit?: number) {
    const result = await this.questionnaireRepo.paggination({
      filter: { status: enums.questionnaireStatusEnum.pending },
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
  async updateUser({ user, userData }: IUpdateUser) {
    const update: Partial<
      Pick<IUser, "firstName" | "lastName" | "phoneNumber">
    > = {};
    if (userData.firstName !== undefined) update.firstName = userData.firstName;
    if (userData.lastName !== undefined) update.lastName = userData.lastName;
    if (userData.phoneNumber !== undefined)
      update.phoneNumber = this.security.encrypting(userData.phoneNumber);
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
      key: [this.authHelpers.getUserKey(user._id.toString())],
    });
    await cacheService.del({
      key: [this.authHelpers.getLoginUserKey(user._id.toString())],
    });
    return {
      id: String(updated._id),
      firstName: updated.firstName,
      lastName: updated.lastName,
      email: updated.email,
      phoneNumber: this.security.dedecrypting(updated.phoneNumber),
      role: updated.role,
      accountStatus: updated.accountStatus,
      emailVerifiedAt: updated.emailVerifiedAt,
    };
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
    const account = await this.userRepo.findById({
      id: new Types.ObjectId(userId.toString()),
      select: "+password",
    });
    if (!account) throw new exceptions.NotFoundException("User not found");
    await this.security.compare({
      plainText: currentPassword,
      cipherText: account.password,
    });
    const password = await this.security.hash({ plainText: newPassword });
    const updated = await this.userRepo.findOneAndUpdate({
      filter: { _id: userId, password: account.password },
      update: { $set: { password, credentialsChangedAt: Date.now() } },
      options: { runValidators: true },
    });
    if (!updated)
      throw new exceptions.ConflictException(
        "Password changed. Please try again.",
      );
    await cacheService.del({
      key: [
        this.authHelpers.getUserKey(userId.toString()),
        this.authHelpers.getLoginUserKey(userId.toString()),
      ],
    });
  }
}

export const userService = new UserService();
