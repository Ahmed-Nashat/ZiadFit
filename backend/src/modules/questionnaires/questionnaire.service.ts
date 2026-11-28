import mongoose, {
  Types,
  type ClientSession,
  type HydratedDocument,
} from "mongoose";
import { roleEnum } from "../../common/enums/role.enum.js";
import { exceptions } from "../../common/exceptions/index.js";
import {
  questionnaireRepo,
  type QuestionnaireRepo,
} from "../../common/repo/questionnaire.repo.js";
import { userRepo, type UserRepo } from "../../common/repo/user.repo.js";
import type {
  IQuestionnaire,
  IQuestionnaireAnswers,
} from "../../common/interface/questionnaire.interface.js";
import { subscriptionRepo } from "../../common/repo/subscription.repo.js";
import { dedecrypting } from "../../common/security/encrypting.js";
import { questionnaireStatusEnum } from "../../common/enums/questionnaireStatus.enum.js";
import { clientNotifications } from "../../common/services/client-notifications.service.js";
import {
  calculateSubscriptionEnd,
  type SubscriptionDuration,
} from "../subscriptions/subscription.duration.js";

interface ISubmitQuestionnaire {
  clientId: string;
  answers: IQuestionnaireAnswers;
}

class QuestionnaireService {
  private readonly questionnaireRepo: QuestionnaireRepo;
  private readonly userRepo: UserRepo;

  constructor() {
    this.questionnaireRepo = questionnaireRepo;
    this.userRepo = userRepo;
  }

  private async formatQuestionnaire(
    questionnaire: HydratedDocument<IQuestionnaire>,
    session?: ClientSession,
  ) {
    const ids = [
      questionnaire.clientId,
      ...(questionnaire.reviewedBy ? [questionnaire.reviewedBy] : []),
    ];
    const users = await this.userRepo.findMany({
      filter: { _id: { $in: ids } },
      projection: { firstName: 1, lastName: 1, phoneNumber: 1 },
      options: session ? { session } : {},
    });
    const client = users.find(
      (user) => String(user._id) === String(questionnaire.clientId),
    );
    const coach = users.find(
      (user) => String(user._id) === String(questionnaire.reviewedBy),
    );
    const {
      clientId: _clientId,
      reviewedBy: _reviewedBy,
      ...data
    } = questionnaire.toObject();
    return {
      ...data,
      clientName: client
        ? `${client.firstName} ${client.lastName}`.trim()
        : null,
      clientPhoneNumber: client?.phoneNumber
        ? dedecrypting(client.phoneNumber)
        : null,
      coachName: coach ? `${coach.firstName} ${coach.lastName}`.trim() : null,
    };
  }

  // ---------------------- SUBMIT QUESTIONNAIRE -------------
  async submitQuestionnaire({ clientId, answers }: ISubmitQuestionnaire) {
    const id = new Types.ObjectId(clientId);
    const client = await this.userRepo.findOne({
      filter: { _id: id, role: roleEnum.client },
    });
    if (!client)
      throw new exceptions.ForbiddenException("Client account required");
    if (!client.emailVerifiedAt)
      throw new exceptions.ForbiddenException(
        "Verify your email before submitting a questionnaire",
      );
    const existing = await this.questionnaireRepo.findOne({
      filter: { clientId: id },
    });
    if (existing)
      throw new exceptions.ConflictException(
        "You have already submitted a questionnaire",
      );
    let questionnaire;
    try {
      questionnaire = await this.questionnaireRepo.createSubmission({
        clientId: id,
        answers,
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
      )
        throw new exceptions.ConflictException(
          "You have already submitted a questionnaire",
        );
      throw error;
    }
    return {
      id: String(questionnaire._id),
      status: questionnaire.status,
      submittedAt: questionnaire.submittedAt,
      clientName: `${client.firstName} ${client.lastName}`.trim(),
      clientPhoneNumber: client.phoneNumber
        ? dedecrypting(client.phoneNumber)
        : null,
      coachName: null,
    };
  }

  async reviewQuestionnaire({
    questionnaireId,
    coachId,
    notes,
  }: {
    questionnaireId: string;
    coachId: string;
    notes?: string;
  }) {
    const id = new Types.ObjectId(questionnaireId);
    const result = await this.questionnaireRepo.markReviewed({
      questionnaireId: id,
      viewerId: new Types.ObjectId(coachId),
      notes,
    });
    if (!result) {
      const existing = await this.questionnaireRepo.findById({ id });
      if (!existing)
        throw new exceptions.NotFoundException("Questionnaire not found");
      throw new exceptions.ConflictException(
        "Questionnaire has already been reviewed",
      );
    }
    const response = await this.formatQuestionnaire(result);
    try {
      await clientNotifications.reviewed(result.clientId);
    } catch {
      console.error("Could not send questionnaire review email");
    }
    return response;
  }

  async acceptQuestionnaire({
    questionnaireId,
    coachId,
    months,
  }: {
    questionnaireId: string;
    coachId: string;
    months: SubscriptionDuration;
  }) {
    if (![1, 2, 3].includes(months))
      throw new exceptions.BadRequestException(
        "Duration must be 1, 2, or 3 months",
      );
    const id = new Types.ObjectId(questionnaireId);
    const session = await mongoose.startSession();
    try {
      const result = await session.withTransaction(async () => {
        const existing = await this.questionnaireRepo.findOne({
          filter: { _id: id },
          options: { session },
        });
        if (!existing)
          throw new exceptions.NotFoundException("Questionnaire not found");
        if (existing.status === questionnaireStatusEnum.accepted)
          throw new exceptions.ConflictException("Questionnaire has already been accepted");
        if (existing.status !== questionnaireStatusEnum.reviewed)
          throw new exceptions.ConflictException(
            "Questionnaire must be reviewed before it can be accepted",
          );
        const startAt = new Date();
        const questionnaire = await this.questionnaireRepo.acceptReviewed({
          questionnaireId: id,
          acceptedAt: startAt,
          session,
        });
        if (!questionnaire) {
          throw new exceptions.ConflictException(
            "Questionnaire status changed. Please try again",
          );
        }
        const endAt = calculateSubscriptionEnd(startAt, months);
        const activeSubscription = await subscriptionRepo.findOne({
          filter: { clientId: questionnaire.clientId, endAt: { $gt: startAt } },
          options: { session },
        });
        if (!activeSubscription)
          await subscriptionRepo.findOneAndUpdate({
            filter: {
              clientId: questionnaire.clientId,
              endAt: { $lte: startAt },
            },
            update: {
              $set: {
                startAt,
                endAt,
                activatedBy: new Types.ObjectId(coachId),
              },
            },
            options: { session, upsert: true, runValidators: true },
          });
        return {
          questionnaire: await this.formatQuestionnaire(questionnaire, session),
          clientId: questionnaire.clientId,
          subscription: {
            status: "active",
            startAt: activeSubscription?.startAt ?? startAt,
            endAt: activeSubscription?.endAt ?? endAt,
          },
        };
      });
      try {
        await clientNotifications.accepted(result.clientId, result.subscription.startAt, result.subscription.endAt);
      } catch {
        console.error("Could not send questionnaire acceptance email");
      }
      const { clientId: _clientId, ...response } = result;
      return response;
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
      )
        throw new exceptions.ConflictException(
          "The client already has a subscription that cannot be activated",
        );
      throw error;
    } finally {
      await session.endSession();
    }
  }
}

export const questionnaireService = new QuestionnaireService();
