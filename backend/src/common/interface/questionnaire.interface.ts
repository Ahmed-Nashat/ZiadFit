import { Types } from "mongoose";
import type { questionnaireStatusEnum } from "../enums/index.js";

export interface IQuestionnaire {
  clientId: Types.ObjectId;
  formVersion: number;
  status: questionnaireStatusEnum;
  submittedAt?: Date;
  reviewedAt?: Date;
  reviewedBy?: Types.ObjectId;
  reviewNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  revision: number;
  // to allow saving drafts
  answers: Partial<IQuestionnaireAnswers>;
}

export interface IQuestionnaireAnswers {
  primaryGoal: string;
  heightCm: number;
  weightKg: number;
  trainingExp: string;
  trainingDaysPerWeek: number;
  sessionDurationMinutes: number;
  availableEquipment: string;
  injuriesOrRestrictions: string;
  sleepHours: number;
  preferredPlan: string;
}
