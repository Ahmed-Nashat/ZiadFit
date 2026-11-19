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
      default: enums.questionnaireStatusEnum.draft,
    },
    reviewedBy: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "user",
    },
    reviewNotes: {
      type: String,
      trim: true,
    },
    revision: {
      type: Number,
      default: 0,
    },
    answers: {
      primaryGoal: {
        type: String,
        trim: true,
      },
      heightCm: {
        type: Number,
        min: 0,
      },
      weightKg: {
        type: Number,
        min: 0,
      },
      trainingDaysPerWeek: {
        type: Number,
        min: 0,
        max: 7,
      },
      trainingExp: {
        type: String,
        trim: true,
      },
      sessionDurationMinutes: {
        type: Number,
        min: 0,
      },
      availableEquipment: {
        type: String,
        trim: true,
      },
      injuriesOrRestrictions: {
        type: String,
        trim: true,
      },
      sleepHours: {
        type: Number,
        min: 0,
        max: 24,
      },
      preferredPlan: {
        type: String,
        trim: true,
      },
    },
    submittedAt: Date,
    reviewedAt: Date,
  },
  {
    strictQuery: true,
    timestamps: true,
    strict: true,
  },
);

//So a client can have one draft and still have older pending or reviewed questionnaires
questionnaireSchema.index(
  { clientId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: enums.questionnaireStatusEnum.draft,
    },
  },
);

export const questionnaireModel = mongoose.model<IQuestionnaire>(
  "questionnaire",
  questionnaireSchema,
  "questionnaire",
);
