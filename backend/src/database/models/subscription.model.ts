import mongoose from "mongoose";
import { ISubscription } from "../../common/index.js";

const subscriptionSchema = new mongoose.Schema<ISubscription>(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      unique: true,
    },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    reminderSentFor: Date,
    reminderClaimId: String,
    reminderClaimUntil: Date,
    activatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
  },
  { timestamps: true },
);

subscriptionSchema.index({ endAt: 1 });

export const subscriptionModel = mongoose.model<ISubscription>(
  "subscription",
  subscriptionSchema,
  "subscription",
);
