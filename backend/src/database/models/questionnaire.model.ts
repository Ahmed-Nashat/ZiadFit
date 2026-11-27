import mongoose from "mongoose";
import * as enums from "../../common/enums/index.js";
import type { IQuestionnaire } from "../../common/interface/questionnaire.interface.js";

const questionnaireSchema = new mongoose.Schema<IQuestionnaire>(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "user",
    },
    formVersion: {
      type: Number,
      default: 1,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(enums.questionnaireStatusEnum),
      default: enums.questionnaireStatusEnum.pending,
    },
    reviewedBy: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "user",
    },
    reviewNotes: {
      type: String,
      trim: true,
    },
    answers: {
      primaryGoal: {
        type: String,
        required: true,
        trim: true,
      },
      secondaryGoal: { type: String, trim: true },
      heightCm: {
        type: Number,
        required: true,
        min: 0,
      },
      weightKg: {
        type: Number,
        required: true,
        min: 0,
      },
      bodyFatPercentage: { type: Number, min: 0, max: 100 },
      energyLevel: { type: Number, required: true, min: 1, max: 10 },
      stress: { type: String, required: true, trim: true },
      smoking: { type: String, required: true, trim: true },
      medicalHistory: { type: String, required: true, trim: true },
      trainingDaysPerWeek: {
        type: Number,
        required: true,
        min: 0,
        max: 7,
      },
      trainingExp: {
        type: String,
        required: true,
        trim: true,
      },
      sessionDurationMinutes: {
        type: Number,
        required: true,
        min: 0,
      },
      availableEquipment: {
        type: String,
        required: true,
        trim: true,
      },
      injuriesOrRestrictions: {
        type: String,
        required: true,
        trim: true,
      },
      sleepHours: {
        type: Number,
        required: true,
        min: 0,
        max: 24,
      },
      preferredPlan: {
        type: String,
        required: true,
        trim: true,
      },
    },
    submittedAt: { type: Date, required: true, default: Date.now },
    reviewedAt: Date,
    acceptedAt: Date,
  },
  {
    strictQuery: true,
    timestamps: true,
    strict: true,
  },
);

questionnaireSchema.index({ clientId: 1 }, { unique: true, name: "unique_questionnaire_client" });

export const questionnaireModel = mongoose.model<IQuestionnaire>(
  "questionnaire",
  questionnaireSchema,
  "questionnaire",
);
