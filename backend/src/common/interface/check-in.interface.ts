import type { Types } from "mongoose";

export interface ICheckIn {
  clientId: Types.ObjectId;
  weightKg: number;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}
