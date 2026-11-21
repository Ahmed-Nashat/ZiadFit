import { exceptions, IUser, security } from "../../common/index.js";
import { userRepo, UserRepo } from "../../common/repo/user.repo.js";
import { HUser } from "../../database/index.js";

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

  async updateUser({ user, userData }: IUpdateUser): Promise<IUser | null> {
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
