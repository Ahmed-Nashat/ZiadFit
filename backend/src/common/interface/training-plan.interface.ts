import type { Types } from "mongoose";

export interface ITrainingPlan {
  clientId: Types.ObjectId;
  createdBy: Types.ObjectId;
  title: string;
  days: {
    name: string;
    exercises: { exerciseId: Types.ObjectId; sets: number; reps: number; notes?: string }[];
  }[];
  createdAt: Date;
  updatedAt: Date;
}
