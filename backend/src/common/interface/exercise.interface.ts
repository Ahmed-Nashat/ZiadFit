import type { Types } from "mongoose";

export interface IExercise {
  name: string;
  muscleGroup: string;
  equipment: string;
  instructions: string;
  videoUrl?: string;
  createdBy: Types.ObjectId;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}
