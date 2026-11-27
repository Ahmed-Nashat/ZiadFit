import { Types } from "mongoose";
import type { questionnaireStatusEnum } from "../enums/index.js";

export interface IQuestionnaire {
  clientId: Types.ObjectId;
  formVersion: number;
  status: questionnaireStatusEnum;
  submittedAt: Date;
  reviewedAt?: Date;
  acceptedAt?: Date;
  reviewedBy?: Types.ObjectId;
  reviewNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  answers: IQuestionnaireAnswers;
}

export interface IQuestionnaireAnswers {
  primaryGoal: string;
  secondaryGoal?: string;
  heightCm: number;
  weightKg: number;
  bodyFatPercentage?: number;
  energyLevel: number;
  stress: string;
  smoking: string;
  medicalHistory: string;
  trainingExp: string;
  trainingDaysPerWeek: number;
  sessionDurationMinutes: number;
  availableEquipment: string;
  injuriesOrRestrictions: string;
  sleepHours: number;
  preferredPlan: string;
}
