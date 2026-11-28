import {
  IUser,
  repos,
  enums,
  security,
  IPgginate,
  exceptions,
  type ICachedUser,
} from "../../common/index.js";
import { HUser } from "../../database/index.js";
import { AuthHelpers, authHelpers } from "../auth/auth.helpers.js";
import { isValidObjectId, Types, type QueryFilter } from "mongoose";
import { cacheService } from "../../common/services/cache.service.js";

interface IUpdateUser {
  user: HUser;
  userData: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
  };
}

class UserService {
  private readonly security = security;
  private readonly userRepo: repos.UserRepo;
  private readonly authHelpers: AuthHelpers;
  private readonly questionnaireRepo: repos.QuestionnaireRepo;
  constructor() {
    this.userRepo = repos.userRepo;
    this.authHelpers = authHelpers;
    this.questionnaireRepo = repos.questionnaireRepo;
  }

  // ---------------------- GET CLIENTS ------------------------
  async searchClientsByName(name: string, page: number, limit: number) {
    const terms = name.trim().split(/\s+/).map((term) => {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(escaped, "i");
      return { $or: [{ firstName: pattern }, { lastName: pattern }] };
    });
    return this.userRepo.paggination({
      filter: { role: enums.roleEnum.client, $and: terms },
      page,
      limit,
      select: ["firstName", "lastName", "email", "accountStatus", "createdAt"],
      options: { sort: { createdAt: -1, _id: -1 } },
    });
  }

  async getClients({
    search,
    accountStatus,
    gender,
    page,
    limit,
  }: {
    page?: number;
    limit?: number;
    search?: string;
    gender?: enums.genderEnum;
    accountStatus?: enums.accountStatusEnum;
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
      filter: { status: { $in: [enums.questionnaireStatusEnum.pending, enums.questionnaireStatusEnum.reviewed] } },
      page,
      limit,
      select: ["clientId", "reviewedBy", "status", "answers", "submittedAt"],
      options: { sort: { submittedAt: 1, _id: 1 } },
    });
    const clients = result.data.length
      ? await this.userRepo.findMany({
          filter: {
            _id: { $in: result.data.flatMap((request) => [request.clientId, ...(request.reviewedBy ? [request.reviewedBy] : [])]) },
          },
          projection: { firstName: 1, lastName: 1, DOB: 1, phoneNumber: 1 },
        })
      : [];
    const clientsById = new Map(
      clients.map((client) => [String(client._id), client]),
    );
    const today = new Date();
    return {
      ...result,
      data: result.data.map((request) => {
        const client = clientsById.get(String(request.clientId));
        const coach = request.reviewedBy ? clientsById.get(String(request.reviewedBy)) : undefined;
        const birthDate = client?.DOB ? new Date(client.DOB) : null;
        let age: number | null = null;
        if (
          birthDate &&
          !Number.isNaN(birthDate.getTime()) &&
          birthDate <= today
        ) {
          age = today.getUTCFullYear() - birthDate.getUTCFullYear();
          if (
            today.getUTCMonth() < birthDate.getUTCMonth() ||
            (today.getUTCMonth() === birthDate.getUTCMonth() &&
              today.getUTCDate() < birthDate.getUTCDate())
          )
            age--;
        }
        const { clientId: _clientId, reviewedBy: _reviewedBy, ...questionnaire } = request.toObject();
        return {
          ...questionnaire,
          clientName: client
            ? `${client.firstName} ${client.lastName}`.trim()
            : null,
          clientAge: age,
          clientPhoneNumber: client?.phoneNumber
            ? this.security.dedecrypting(client.phoneNumber)
            : null,
          coachName: coach ? `${coach.firstName} ${coach.lastName}`.trim() : null,
        };
      }),
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
