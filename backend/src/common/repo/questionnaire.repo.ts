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

  async createSubmission({
    clientId,
    answers,
  }: {
    clientId: Types.ObjectId;
    answers: IQuestionnaireAnswers;
  }) {
    return this.create({ data: { clientId, answers } });
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
