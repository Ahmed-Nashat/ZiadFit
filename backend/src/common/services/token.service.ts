import * as configService from "../../config/config.service.js";
import crypto from "crypto";
import { exceptions } from "../exceptions/index.js";
import jwt from "jsonwebtoken";
import {
  services,
  repos,
  enums,
  type ICreateToken,
  type ICachedUser,
} from "../index.js";
// import { authHelpers } from "../../modules/auth/auth.helper.js";
import { Types } from "mongoose";
import { type AuthHelpers, authHelpers } from "../../modules/auth/index.js";
import type { HUser } from "../../database/index.js";

// ---------------------- FUNCTIONS TYPES --------------------
type CreateTokenType = {
  userId: Types.ObjectId | string;
  issuer: string;
  role?: enums.roleEnum;
};

type VerifyTokenType = {
  token: string;
  tokenType: number;
};

type GetTokenSecretForTypeType = {
  tokenType: number;
  role: number;
};

type GetRevokeKeyType = {
  userId: string;
  jti: string;
};
// -----------------------------------------------------------

export class TokenService {
  private readonly userRepo: repos.UserRepo;
  private readonly cacheService: services.CacheService;
  private readonly authHelpers: AuthHelpers;
  constructor() {
    this.userRepo = repos.userRepo;
    this.cacheService = services.cacheService;
    this.authHelpers = authHelpers;
  }

  createToken({
    userId,
    issuer,
    role = enums.roleEnum.client,
  }: CreateTokenType): ICreateToken {
    const secrets = this.getTokenSecretesForRole(role);
    const jwtid = crypto.randomUUID();

    return {
      accessToken: jwt.sign(
        {
          sub: userId,
          aud: role,
        },
        secrets.access,
        {
          expiresIn: configService.access_ex,
          issuer,
          jwtid,
        },
      ),
      refreshToken: jwt.sign(
        {
          sub: userId,
          aud: role,
        },
        secrets.refresh,
        {
          expiresIn: configService.refresh_ex,
          issuer,
          jwtid,
        },
      ),
    };
  }

  async verifyToken({ token, tokenType }: VerifyTokenType) {
    const decoded = jwt.decode(token);

    if (
      !decoded ||
      typeof decoded !== "object" ||
      typeof decoded?.sub !== "string" ||
      typeof decoded?.jti !== "string" ||
      typeof decoded?.aud !== "number"
    ) {
      throw new exceptions.ServerException("Invalid token");
    }

    const userId: string = decoded.sub;
    const jti: string = decoded.jti;

    if (
      await this.cacheService.exists({
        key: this.getRevokeKey({ userId, jti }),
      })
    )
      throw new exceptions.UnauthorizedException("You are already loged out");

    const secret: string | undefined = this.getTokenSecretForType({
      tokenType,
      role: decoded?.aud,
    });

    try {
      jwt.verify(token, secret!);
    } catch (e: any) {
      if (e.name === "TokenExpiredError")
        throw new exceptions.UnauthorizedException("Token Expired");
      throw e;
    }

    const userKey = this.authHelpers.getUserKey(userId);
    if (
      await services.cacheService.exists({
        key: userKey,
      })
    ) {
      const cachedUser = await services.cacheService.get<ICachedUser>({
        key: userKey,
      });
      if (
        !cachedUser ||
        typeof cachedUser !== "object" ||
        Array.isArray(cachedUser)
      )
        throw new exceptions.UnauthorizedException("User not found");

      const credentialsChangedAt = cachedUser.credentialsChangedAt;

      const cachedCredsInSec =
        typeof credentialsChangedAt === "number"
          ? credentialsChangedAt > 1e11
            ? Math.floor(credentialsChangedAt / 1000)
            : credentialsChangedAt
          : undefined;

      if (
        cachedCredsInSec !== undefined &&
        decoded.iat !== undefined &&
        decoded.iat <= cachedCredsInSec
      ) {
        throw new exceptions.UnauthorizedException(
          "You are already logged out",
        );
      }
      return cachedUser;
    }
    const user = await this.userRepo.findById({
      id: new Types.ObjectId(userId),
    });
    if (!user) throw new exceptions.NotFoundException("User not found");

    const userCredsInSec =
      user.credentialsChangedAt! > 1e11
        ? Math.floor(user.credentialsChangedAt! / 1000)
        : user.credentialsChangedAt;

    if (!decoded || typeof decoded === "string" || !decoded.iat) {
      throw new exceptions.UnauthorizedException("Invalid token");
    }
    if (userCredsInSec && decoded.iat <= userCredsInSec) {
      throw new exceptions.UnauthorizedException("You are already loged out");
    }

    // cache loged in user for 30 sec
    await services.cacheService.set({
      key: userKey,
      value: user,
      ttl: 30,
    });
    return user;
  }

  getTokenSecretesForRole(role: number): {
    access: string;
    refresh: string;
  } {
    let secret;
    switch (role) {
      case enums.roleEnum.client:
        secret = {
          access: configService.user_access_secret_key,
          refresh: configService.user_refresh_secret_key,
        };
        break;
      case enums.roleEnum.coach:
        secret = {
          access: configService.admin_access_secret_key,
          refresh: configService.admin_refresh_secret_key,
        };
        break;
      default:
        throw new exceptions.ServerException("Unhandled role");
    }
    return secret;
  }

  getTokenSecretForType({ tokenType, role }: GetTokenSecretForTypeType) {
    const secrets = this.getTokenSecretesForRole(role);
    let secret;
    switch (tokenType) {
      case enums.tokenTypesEnum.access:
        secret = secrets.access;
        break;
      case enums.tokenTypesEnum.refresh:
        secret = secrets.refresh;
      default:
        break;
    }
    return secret;
  }

  getRevokeKey = ({ userId, jti }: GetRevokeKeyType): string =>
    `revokeToken::${userId}::${jti}`;
  getPrefixRevoke = (userId: Types.ObjectId): string =>
    `revokeToken::${userId}`;
}

export const tokenService = new TokenService();
