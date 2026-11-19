import { Types } from "mongoose";
import { questionnaireModel } from "../../database/models/questionnaire.model.js";
import { questionnaireStatusEnum } from "../enums/questionnaireStatus.enum.js";
import type { IQuestionnaire, IQuestionnaireAnswers } from "../interface/questionnaire.interface.js";
import BaseRepo from "./base.repo.js";

export class QuestionnaireRepo extends BaseRepo<IQuestionnaire> {
  constructor() {
    super(questionnaireModel);
  }

  // --------------------- FINDERS ---------------------
  async findDraftByClientId(
    clientId: Types.ObjectId,
  ): Promise<IQuestionnaire | null> {
    return this.findOne({
      filter: {
        clientId,
        status: questionnaireStatusEnum.draft,
      },
    });
  }

  async findPendingByClientId(
    clientId: Types.ObjectId,
  ): Promise<IQuestionnaire | null> {
    return this.findOne({
      filter: {
        clientId,
        status: questionnaireStatusEnum.pending,
      },
    });
  }

  async findReviewedByClientId(
    clientId: Types.ObjectId,
  ): Promise<IQuestionnaire | null> {
    return this.findOne({
      filter: {
        clientId,
        status: questionnaireStatusEnum.reviewed,
      },
    });
  }

  async findPendings({
    page,
    limit,
    select,
  }: {
    page: number;
    limit: number;
    select: string[];
  }) {
    return this.paggination({
      filter: {
        status: questionnaireStatusEnum.pending,
      },
      page,
      limit,
      select,
    });
  }

  async createDraft({
    clientId,
    answers = {},
  }: {
    clientId: Types.ObjectId;
    answers?: Partial<IQuestionnaireAnswers>;
  }): Promise<IQuestionnaire | null> {
    return this.create({
      data: {
        clientId,
        answers,
      },
    });
  }

  // --------------------- UPDATERS ---------------------
  async updateDraft({
    clientId,
    data,
    questionnaireId,
  }: {
    clientId: Types.ObjectId;
    questionnaireId: Types.ObjectId;
    data: Partial<IQuestionnaireAnswers>;
  }): Promise<IQuestionnaire | null> {
    const allowedKeys: (keyof IQuestionnaireAnswers)[] = [
      "primaryGoal", "heightCm", "weightKg", "trainingExp", "trainingDaysPerWeek",
      "sessionDurationMinutes", "availableEquipment", "injuriesOrRestrictions",
      "sleepHours", "preferredPlan",
    ];
    const entries = Object.entries(data);
    if (entries.length === 0 || entries.some(([key, value]) => !allowedKeys.includes(key as keyof IQuestionnaireAnswers) || value === undefined)) {
      throw new TypeError("Provide valid questionnaire answer fields.");
    }
    const updates = Object.fromEntries(
      entries.map(([key, value]) => [`answers.${key}`, value]),
    );
    return this.findOneAndUpdate({
      filter: {
        _id: questionnaireId,
        clientId,
        status: questionnaireStatusEnum.draft,
      },
      update: {
        $set: updates,
        $inc: {
          revision: 1,
        },
      },
      options: {
        runValidators: true,
      },
    });
  }

  async submitDraft({
    clientId,
    questionnaireId,
    revision,
  }: {
    clientId: Types.ObjectId;
    questionnaireId: Types.ObjectId;
    revision: number;
  }): Promise<IQuestionnaire | null> {
    return this.findOneAndUpdate({
      filter: {
        _id: questionnaireId,
        clientId,
        status: questionnaireStatusEnum.draft,
        revision,
      },
      update: {
        $set: {
          status: questionnaireStatusEnum.pending,
          submittedAt: new Date(),
        },
      },
      options: {
        runValidators: true,
      },
    });
  }

  async markReviewed({
    clientId,
    viewerId,
    notes,
    questionnaireId,
  }: {
    clientId: Types.ObjectId;
    questionnaireId: Types.ObjectId;
    viewerId: Types.ObjectId;
    notes: string;
  }): Promise<IQuestionnaire | null> {
    return this.findOneAndUpdate({
      filter: {
        _id: questionnaireId,
        clientId,
        status: questionnaireStatusEnum.pending,
      },
      update: {
        status: questionnaireStatusEnum.reviewed,
        reviewedAt: new Date(),
        reviewedBy: viewerId,
        reviewNotes: notes,
      },
    });
  }
}

export const questionnaireRepo = new QuestionnaireRepo();
