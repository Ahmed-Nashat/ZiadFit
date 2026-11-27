import mongoose from "mongoose";
import type { IExercise } from "../../common/interface/exercise.interface.js";

const exerciseSchema = new mongoose.Schema<IExercise>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    muscleGroup: { type: String, required: true, trim: true, maxlength: 80 },
    equipment: { type: String, required: true, trim: true, maxlength: 120 },
    instructions: { type: String, required: true, trim: true, maxlength: 5000 },
    videoUrl: { type: String, trim: true, maxlength: 2048 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true, strict: true },
);

export const exerciseModel = mongoose.model<IExercise>("exercise", exerciseSchema, "exercise");
