import mongoose from "mongoose";
import type { ICheckIn } from "../../common/interface/check-in.interface.js";

const checkInSchema = new mongoose.Schema<ICheckIn>({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  weightKg: { type: Number, required: true, min: 0.01, max: 1000 },
  note: { type: String, trim: true, maxlength: 2000 },
}, { timestamps: true, strict: true });

checkInSchema.index({ clientId: 1, createdAt: -1, _id: -1 });
export const checkInModel = mongoose.model<ICheckIn>("checkIn", checkInSchema, "checkIn");
