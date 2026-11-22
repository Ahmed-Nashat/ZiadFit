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
    activatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
  },
  { timestamps: true },
);

export const subscriptionModel = mongoose.model<ISubscription>(
  "subscription",
  subscriptionSchema,
  "subscription",
);
