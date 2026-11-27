import mongoose from "mongoose";
import type { ITrainingPlan } from "../../common/interface/training-plan.interface.js";

const planExerciseSchema = new mongoose.Schema({
  exerciseId: { type: mongoose.Schema.Types.ObjectId, ref: "exercise", required: true },
  sets: { type: Number, required: true, min: 1 },
  reps: { type: Number, required: true, min: 1 },
  notes: { type: String, trim: true, maxlength: 1000 },
}, { _id: false });

const planDaySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  exercises: { type: [planExerciseSchema], required: true, validate: (items: unknown[]) => items.length > 0 },
}, { _id: false });

const trainingPlanSchema = new mongoose.Schema<ITrainingPlan>({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  days: { type: [planDaySchema], required: true },
}, { timestamps: true, strict: true });

trainingPlanSchema.index({ clientId: 1 }, { unique: true, name: "unique_training_plan_client" });

export const trainingPlanModel = mongoose.model<ITrainingPlan>("trainingPlan", trainingPlanSchema, "trainingPlan");
