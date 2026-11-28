import type { Types } from "mongoose";

export interface IWorkout {
  clientId: Types.ObjectId;
  planId: Types.ObjectId;
  dayName: string;
  status: "inProgress" | "completed";
  startedAt: Date;
  finishedAt?: Date;
  exercises: {
    exerciseId: Types.ObjectId;
    exerciseName: string;
    targetSets: number;
    targetReps: number;
    notes?: string;
    sets: { reps: number; weightKg?: number }[];
  }[];
  createdAt: Date;
  updatedAt: Date;
}
