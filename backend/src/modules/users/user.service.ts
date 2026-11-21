import { exceptions, IUser, security } from "../../common/index.js";
import { userRepo, UserRepo } from "../../common/repo/user.repo.js";
import { HUser } from "../../database/index.js";
import { questionnaireRepo } from "../../common/repo/questionnaire.repo.js";
import { questionnaireStatusEnum } from "../../common/enums/questionnaireStatus.enum.js";

interface IUpdateUser {
  user: HUser;
  userData: {
    newPassword: string;
    cPassword: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
}

class UserService {
  private readonly userRepo: UserRepo;
  constructor() {
    this.userRepo = userRepo;
  }

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

  async updateUser({ user, userData }: IUpdateUser): Promise<IUser | null> {
    if (!user)
      throw new exceptions.UnauthorizedException("Authentication required");
    const encryptedPhoneNumber = security.encrypting(userData.phoneNumber);
    console.log({
      password: userData.newPassword,
      cpassword: userData.cPassword,
    });

    if (userData.newPassword !== userData.cPassword)
      throw new exceptions.BadRequestException("Password don't match");
    const hashedPassword = security.hash({ plainText: userData.newPassword });
    return await this.userRepo.findOneAndUpdate({
      filter: {
        _id: user._id,
      },
      update: {
        $set: {
          ...userData,
          phoneNumber: encryptedPhoneNumber,
          password: await hashedPassword,
        },
      },
    });
  }
}

export const userService = new UserService();
