import mongoose from "mongoose";
import type { IWorkout } from "../../common/interface/workout.interface.js";

const loggedSetSchema = new mongoose.Schema({
  setNumber: { type: Number, required: true, min: 1, max: 100 },
  reps: { type: Number, required: true, min: 1 },
  weightKg: { type: Number, min: 0 },
}, { _id: false });

const workoutExerciseSchema = new mongoose.Schema({
  exerciseId: { type: mongoose.Schema.Types.ObjectId, ref: "exercise", required: true },
  exerciseName: { type: String, required: true },
  targetSets: { type: Number, required: true, min: 1 },
  targetReps: { type: Number, required: true, min: 1 },
  notes: { type: String, trim: true },
  sets: { type: [loggedSetSchema], default: [] },
}, { _id: false });

const workoutSchema = new mongoose.Schema<IWorkout>({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: "trainingPlan", required: true },
  dayName: { type: String, required: true, trim: true },
  status: { type: String, enum: ["inProgress", "completed"], default: "inProgress", required: true },
  startedAt: { type: Date, default: Date.now, required: true },
  finishedAt: Date,
  exercises: { type: [workoutExerciseSchema], required: true, validate: (items: unknown[]) => items.length > 0 },
}, { timestamps: true, strict: true });

workoutSchema.index({ clientId: 1 }, { unique: true, partialFilterExpression: { status: "inProgress" }, name: "one_in_progress_workout_per_client" });

export const workoutModel = mongoose.model<IWorkout>("workout", workoutSchema, "workout");
