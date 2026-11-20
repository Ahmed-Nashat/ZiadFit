import {
  enums,
  exceptions,
  security,
  repos,
  services,
} from "../../common/index.js";
import { authHelpers } from "./auth.helpers.js";
import type { signUpDTO, signInDTO } from "./dto/index.js";
import { max_retries } from "../../config/config.service.js";
import type { HUser } from "../../database/models/user.model.js";
import { Types } from "mongoose";

// ---------------------- FUNCTIONS TYPES --------------------
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
// -----------------------------------------------------------

class AuthService {
  private readonly userRepo = repos.userRepo;
  private readonly chacheService = services.cacheService;
  private readonly authHelpers = authHelpers;

  async forgotPassword({ email, password, cPassword }: { email: string; password: string; cPassword: string }): Promise<void> {
    if (password !== cPassword) throw new exceptions.BadRequestException("Passwords do not match");
    const user = await this.userRepo.findByEmail({ email });
    if (!user) return;
    const pendingPasswordHash = await security.hash({ plainText: password });
    await this.authHelpers.createAndSendOtp({ user, event: enums.eventEnum.forget, pendingPasswordHash });
  }

  async resetPassword({ email, otp }: { email: string; otp: string }): Promise<void> {
    const user = await this.userRepo.findByEmail({ email });
    if (!user) throw new exceptions.BadRequestException("Invalid or expired verification code");
    if (!Number.isInteger(max_retries) || max_retries < 1) throw new exceptions.ServerException("OTP retry limit is not configured");
    const key = this.authHelpers.getUserOTPForgetKey(user.id);
    const result = await this.chacheService.consumePasswordReset(key, `tries::${key}`, otp, max_retries);
    if (result === -1) throw new exceptions.TooManyRequestException("Too many attempts. Please wait before trying again");
    if (typeof result !== "string") throw new exceptions.BadRequestException("Invalid or expired verification code");
    const updated = await this.userRepo.findByIdAndUpdate({
      id: user._id,
      update: { $set: { password: result, credentialsChangedAt: Date.now() } },
    });
    if (!updated) throw new exceptions.NotFoundException("User not found");
    await this.chacheService.del({ key: [this.authHelpers.getUserKey(user.id)] });
  }

  async logout(token: string): Promise<void> {
    await this.authHelpers.revokedToken(token);
  }

  // ---------------------- LOGIN ------------------------------
  async login({ userData, issuer }: ILoginType) {
    const { email, password } = userData;
    const user = await this.userRepo.findByEmail({
      email,
      includePassword: true,
    });
    if (!user)
      throw new exceptions.UnauthorizedException("Invalid email or password");

    const triesKey = this.authHelpers.getUserLoginTriesKey(user.id);
    if (!Number.isInteger(max_retries) || max_retries < 1) {
      throw new exceptions.ServerException(
        "Login retry limit is not configured",
      );
    }
    const attempts = Number(await this.chacheService.get({ key: triesKey }));
    if (attempts >= max_retries) {
      throw new exceptions.TooManyRequestException(
        "Too many failed attempts. Please try again later.",
      );
    }
    try {
      await security.compare({
        plainText: password,
        cipherText: user.password,
      });
    } catch (error) {
      if (error instanceof exceptions.BadRequestException) {
        await this.authHelpers.handleFailedLogin(user.id);
      }
      throw error;
    }

    if (!user.emailVerifiedAt) {
      throw new exceptions.UnauthorizedException(
        "Please verify your email before logging in",
      );
    }
    await this.chacheService.del({ key: [triesKey] });
    return this.authHelpers.verifyLogin({ user, issuer });
  }

  // ---------------------- SIGNUP -----------------------------
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
    await this.authHelpers.createAndSendOtp({
      user,
      event: enums.eventEnum.signup,
    });
  }

  // ---------------------- RESEND OTP -------------------------
  async resendOtp({ email, topic }: IResendOTPType): Promise<string> {
    if (
      ![
        enums.eventEnum.signup,
        enums.eventEnum.forget,
        enums.eventEnum.fa,
      ].includes(topic)
    ) {
      throw new exceptions.BadRequestException("Invalid OTP purpose");
    }
    const user = await this.userRepo.findByEmail({ email });
    if (!user) throw new exceptions.NotFoundException("User not found");
    if (topic === enums.eventEnum.signup && user.emailVerifiedAt) {
      throw new exceptions.BadRequestException("Email is already verified");
    }
    await this.authHelpers.createAndSendOtp({ user, event: topic });
    return "Verification code sent";
  }

  // ---------------------- CONFIRM EMAIL ----------------------
  async confirmEmail({ email, otp }: IConfirmEmailtype): Promise<HUser | void> {
    let user: HUser | null = await this.authHelpers.checkUser({
      email,
    });
    if (!user) throw new exceptions.NotFoundException("User not found");
    if (user.emailVerifiedAt)
      throw new exceptions.BadRequestException("Email is already verified");
    if (!Number.isInteger(max_retries) || max_retries < 1)
      throw new exceptions.ServerException("OTP retry limit is not configured");
    const userId = user.id;
    const userOtpKey = this.authHelpers.getOtpKey(
      userId,
      enums.eventEnum.signup,
    );
    const result = await this.chacheService.consumeOtp(
      userOtpKey,
      this.authHelpers.getUserOtpTriesKey(userId),
      otp,
      max_retries,
    );
    if (result === -1)
      throw new exceptions.TooManyRequestException(
        "Too many attempts. Please wait before trying again",
      );
    if (result !== 1)
      throw new exceptions.BadRequestException(
        "Invalid or expired verification code",
      );
    user = await this.userRepo.findByIdAndUpdate({
      id: new Types.ObjectId(userId),
      update: { emailVerifiedAt: new Date() },
    });
    if (!user) throw new exceptions.NotFoundException("User not found");
    return user;
  }
}

export const authService = new AuthService();
