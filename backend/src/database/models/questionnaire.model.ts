import mongoose, { Types } from "mongoose";
import { enums, IQuestionnaire } from "../../common/index.js";

const questionnaireSchema = new mongoose.Schema<IQuestionnaire>(
  {
    clientId: {
      type: Types.ObjectId,
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
        trim: true,
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

export const questionnaireModel = mongoose.model<IQuestionnaire>(
  "questionnaire",
  questionnaireSchema,
  "questionnaire",
);
