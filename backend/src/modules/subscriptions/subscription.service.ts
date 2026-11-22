import { isValidObjectId, Types } from "mongoose";
import { roleEnum } from "../../common/enums/role.enum.js";
import { exceptions } from "../../common/exceptions/index.js";
import {
  subscriptionRepo,
  type SubscriptionRepo,
} from "../../common/repo/subscription.repo.js";
import { userRepo, type UserRepo } from "../../common/repo/user.repo.js";
import { subscriptionStatus } from "./subscription.status.js";
import {
  calculateSubscriptionEnd,
  type SubscriptionDuration,
} from "./subscription.duration.js";

class SubscriptionService {
  private readonly subscriptionRepo: SubscriptionRepo;
  private readonly userRepo: UserRepo;

  constructor() {
    this.subscriptionRepo = subscriptionRepo;
    this.userRepo = userRepo;
  }

  async getSubscriptionStatus(clientId: string) {
    const subscription = await this.subscriptionRepo.findOne({
      filter: {
        clientId,
      },
    });

    if (!subscription)
      return { status: "none" as const, startAt: null, endAt: null };
    return {
      status: subscriptionStatus(subscription),
      startAt: subscription.startAt,
      endAt: subscription.endAt,
    };
  }

  async activateSubscription(
    clientId: string,
    coachId: string,
    months: SubscriptionDuration,
  ) {
    if (!isValidObjectId(clientId))
      throw new exceptions.BadRequestException("Invalid client ID");
    const startAt = new Date();
    if (![1, 2, 3].includes(months))
      throw new exceptions.BadRequestException(
        "Duration must be 1, 2, or 3 months",
      );
    const endAt = calculateSubscriptionEnd(startAt, months);
    const client = await this.userRepo.findOne({
      filter: {
        _id: new Types.ObjectId(clientId),
        role: roleEnum.client,
      },
    });
    if (!client) throw new exceptions.NotFoundException("Client not found");
    let subscription;
    try {
      subscription = await this.subscriptionRepo.findOneAndUpdate({
        filter: {
          clientId: new Types.ObjectId(clientId),
          endAt: { $lte: startAt },
        },
        update: {
          $set: { startAt, endAt, activatedBy: new Types.ObjectId(coachId) },
        },
        options: {
          upsert: true,
          returnDocument: "after",
          runValidators: true,
        },
      });
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 11000 &&
        "keyPattern" in error &&
        typeof error.keyPattern === "object" &&
        error.keyPattern !== null &&
        "clientId" in error.keyPattern
      ) {
        throw new exceptions.ConflictException(
          "The client already has an active subscription",
        );
      }
      throw error;
    }
    return {
      status: "active",
      startAt: subscription?.startAt,
      endAt: subscription?.endAt,
    };
  }
}

export const subscriptionService = new SubscriptionService();
