import jwt from "jsonwebtoken";
import {
  max_retries,
  max_send_retries,
  refresh_ex,
  access_ex,
} from "../../config/config.service.js";
import crypto from "crypto";
import { sendEmail } from "../../common/services/mail.service.js";
import {
  signupOtpTemplate,
  forgetPasswordOtpTemplate,
  twoFactorOtpTemplate,
} from "../../common/templates/templates.js";
import type { HydratedDocument } from "mongoose";
import * as enums from "../../common/enums/index.js";
import { exceptions } from "../../common/exceptions/index.js";
import { userRepo } from "../../common/repo/user.repo.js";
import { cacheService } from "../../common/services/cache.service.js";
import { tokenService } from "../../common/services/token.service.js";
import { eventEmitter } from "../../common/events/email.events.js";
import type { IUser } from "../../common/interface/user.interface.js";
import type { ICreateToken } from "../../common/interface/token.interface.js";
import { Types } from "mongoose";

// ---------------------- FUNCTIONS TYPES --------------------
type CreateAndSendOtpType = {
  user: HydratedDocument<IUser>;
  event: enums.eventEnum;
  pendingPasswordHash?: string;
};

type BlockUserType = {
  userId: string;
  userOtpKey?: string;
};

type VerifyLoginType = {
  user: HydratedDocument<IUser>;
  issuer: string;
};

type CheckUserType = {
  email?: string;
  id?: string;
  exists?: boolean;
};
// -----------------------------------------------------------

export class AuthHelpers {
  private readonly userRepo = userRepo;
  private readonly cacheService = cacheService;
  private get tokenService() {
    return tokenService;
  }

  generateOtp = (): number => crypto.randomInt(100000, 1000000);

  getUserKey = (userId: string): string => `user::${userId?.toString()}`;

  getLoginUserKey = (userId: string): string =>
    `user::login::${userId?.toString()}`;

  getUserOTPKey = (userId: string): string => `otp::${this.getUserKey(userId)}`;

  getUserLoginTriesKey = (userId: string): string =>
    `tries::login::${this.getUserKey(userId)}`;

  getUserOTPForgetKey = (userId: string): string =>
    `forget::${this.getUserOTPKey(userId)}`;

  getUserOtpTriesKey = (userId: string): string =>
    `tries::${this.getUserOTPKey(userId)}`;

  getUserSendKey = (userId: string): string =>
    `send::${this.getUserKey(userId)}`;

  getUser2FAKey = (userId: string): string =>
    `2fa::${this.getUserOTPKey(userId)}`;

  async handleFailedLogin(userId: string): Promise<void> {
    const key = this.getUserLoginTriesKey(userId);
    let tries = 1;

    if (await this.cacheService.exists({ key })) {
      tries = await this.cacheService.incr({ key });
    } else {
      await this.cacheService.set({ key, value: 1, ttl: 15 * 60 });
    }

    if (tries >= max_retries) {
      await this.cacheService.del({ key: [key] });
      throw new exceptions.TooManyRequestException(
        "Too many failed attempts, try again later",
      );
    }
    throw new exceptions.BadRequestException("Invalid email or password");
  }

  // ---------------------- CREATE & SEND OTP ------------------
  async createAndSendOtp({
    user,
    event,
    pendingPasswordHash,
  }: CreateAndSendOtpType): Promise<void> {
    const templates = {
      [enums.eventEnum.signup]: signupOtpTemplate,
      [enums.eventEnum.forget]: forgetPasswordOtpTemplate,
      [enums.eventEnum.fa]: twoFactorOtpTemplate,
    };
    if (!(event in templates))
      throw new exceptions.BadRequestException("Invalid OTP purpose");
    if (!Number.isInteger(max_send_retries) || max_send_retries < 1)
      throw new exceptions.ServerException("OTP send limit is not configured");
    const otp = String(this.generateOtp());
    const key = this.getOtpKey(user.id, event);
    const reservation = await this.cacheService.reserveOtp(
      key,
      this.getUserSendKey(user.id),
      otp,
      max_send_retries,
      pendingPasswordHash,
    );
    if (reservation < 0)
      throw new exceptions.TooManyRequestException(
        "Please wait before requesting another code",
      );
    const html = templates[event as keyof typeof templates]({
      name: `${user.firstName} ${user.lastName}`,
      otp,
    });
    try {
      await sendEmail({
        recipients: { to: user.email },
        subject: "Your Coach Ziad verification code",
        html,
      });
    } catch (error) {
      await this.cacheService.releaseOtp(key, otp);
      throw new exceptions.ServerException(
        "Unable to send verification email",
        error,
      );
    }
  }

  getOtpKey(userId: string, event: enums.eventEnum): string {
    switch (event) {
      case enums.eventEnum.signup:
        return this.getUserOTPKey(userId);
      case enums.eventEnum.forget:
        return this.getUserOTPForgetKey(userId);
      case enums.eventEnum.fa:
        return this.getUser2FAKey(userId);
      default:
        throw new exceptions.BadRequestException("Invalid OTP purpose");
    }
  }

  // ---------------------- REVOKE TOKEN -----------------------
  async revokedToken(token: string): Promise<void> {
    const data = jwt.decode(token) as jwt.JwtPayload | null;
    if (!data || !data.iat || !data.sub || !data.jti)
      throw new exceptions.BadRequestException("Token not valid");

    const currentTimeInSec = Math.ceil(Date.now() / 1000);
    const iat: number = currentTimeInSec - data.iat;
    const ttl = refresh_ex - iat;

    if (ttl > 0) {
      await this.cacheService.set({
        key: tokenService.getRevokeKey({ userId: data.sub, jti: data.jti }),
        value: 1,
        ttl,
      });
    }
  }

  // ---------------------- WRONG OTP --------------------------
  async wrongOtpHandler(userId: string): Promise<void> {
    const key = this.getUserOtpTriesKey(userId.toString());
    if (await this.cacheService.exists({ key })) {
      await this.cacheService.incr({ key });
    } else {
      await this.cacheService.set({ key, value: 1, ttl: 5 * 60 });
    }
    throw new exceptions.BadRequestException("Wrong OTP");
  }

  // ---------------------- BLOCK USER -------------------------
  async blockUser({ userId, userOtpKey }: BlockUserType): Promise<void> {
    const triesKey = this.getUserOtpTriesKey(userId);
    const userOtpRetries = await this.cacheService.get({
      key: triesKey,
    });

    if (userOtpRetries && Number(userOtpRetries) >= max_retries) {
      if (userOtpKey) {
        await this.cacheService.del({ key: [userOtpKey] });
      }

      await this.userRepo.updateOne({
        filter: {
          _id: userId,
        },
        update: {
          $set: {
            banned: true,
          },
        },
      });

      throw new exceptions.TooManyRequestException(
        "You got banned, please contact support",
      );
    }
  }

  // ---------------------- VERIFY LOGIN -----------------------
  async verifyLogin({
    user,
    issuer,
  }: {
    user: HydratedDocument<IUser>;
    issuer: string;
  }): Promise<ICreateToken> {
    eventEmitter.emit(enums.eventEnum.login, {
      recipients: { to: user?.email },
      subject: "New login",
      text: `a new login detected at ${new Date()}, if it's not you please change the password`,
    });

    return this.tokenService.createToken({
      userId: user?.id,
      issuer,
      role: user?.role,
    });
  }

  // ---------------------- CHECK USER HELPER ------------------
  async checkUser({
    email,
    id,
    exists = true,
  }: CheckUserType): Promise<HydratedDocument<IUser> | null> {
    let user: HydratedDocument<IUser> | null = null;

    if (id) {
      user = await userRepo.findById({ id: new Types.ObjectId(id) });
    } else if (email) {
      user = await this.userRepo.findByEmail({ email });
    }

    if (exists && !user) {
      throw new exceptions.NotFoundException("User not found");
    } else if (!exists && user) {
      throw new exceptions.ConflictException("User already exists");
    }

    return user;
  }
}

export const authHelpers = new AuthHelpers();
