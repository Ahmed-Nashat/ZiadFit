import {
  services,
  eventEmitter,
  repos,
  enums,
  exceptions,
  security,
} from "../../common/index.js";
import { EventEmitter } from "node:events";
import { signUpDTO, signInDTO } from "./index.js";

// ---------------------- FUNCTIONS TYPES --------------------
interface ILoginWithGoogleType {
  idToken: string;
  issuer: string;
}

interface IRefreshTokenType {
  refreshToken: string;
  issuer: string;
}

interface ICreateUserType {
  userData: signUpDTO;
}

interface ILoginType {
  userData: signInDTO;
  issuer: string;
}

interface IConfirmEmailtype {
  email: string;
  otp: string;
}

interface IResendOTPType {
  email: string;
  topic: enums.eventEnum;
}

interface IForgetPasswordType {
  email: string;
  otp: number;
  newPassword: string;
  cPassword: string;
}

interface IVerify2FALogin {
  userId: string;
  issuer: string;
  otp: number;
}
// -----------------------------------------------------------

class AuthService {
  private readonly userRepo: repos.UserRepo;
  private readonly chacheService: services.CacheService;
  private readonly eventEmitter: EventEmitter;

  constructor() {
    this.userRepo = repos.userRepo;
    this.chacheService = services.cacheService;
    this.eventEmitter = eventEmitter;
  }

  async createUser({ userData }: ICreateUserType): Promise<void> {
    const { email, password } = userData;
    const isExists = await this.userRepo.findByEmail({ email });
    if (isExists)
      throw new exceptions.ConflictException("This email is already exists");

    if (typeof userData?.phoneNumber !== "string")
      throw new exceptions.ServerException("Invalid phone number type");
    const hashedPassword = await security.hash({ plainText: password });
    const encryptedPhoneNumber = security.encrypting(userData.phoneNumber);

    const user = await this.userRepo.create({
      data: {
        ...userData,
        password: hashedPassword,
        phoneNumber: encryptedPhoneNumber,
        DOB: new Date(userData.DOB),
      },
    });
    return;
  }
}
