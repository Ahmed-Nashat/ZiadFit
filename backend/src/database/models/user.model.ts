import mongoose, { HydratedDocument } from "mongoose";
import * as enums from "../../common/enums/index.js";
import type { IUser } from "../../common/interface/user.interface.js";

const userSchema = new mongoose.Schema<IUser>(
  {
    firstName: {
      type: String,
      trim: true,
      required: true,
      minlength: [3, "First name must be at least  3 charachters"],
      maxlength: [20, "First name must be at most 20 charachters"],
    },
    lastName: {
      type: String,
      trim: true,
      required: true,
      minlength: [3, "Last name must be at least 3 charachters"],
      maxlength: [20, "Last name must be at most 20 charachters"],
    },
    email: {
      type: String,
      trim: true,
      unique: true,
      required: true,
      lowercase: true,
    },
    password: {
      type: String,
      trim: true,
      required: true,
      select: false,
      minlength: [6, "Password name must be more than 6 charachters"],
    },
    gender: {
      type: Number,
      enum: enums.genderEnum,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: Number,
      enum: enums.roleEnum,
      default: enums.roleEnum.client,
    },
    emailVerifiedAt: {
      type: Date,
      default: null,
    },
    accountStatus: {
      type: Number,
      enum: enums.accountStatusEnum,
      default: enums.accountStatusEnum.active,
    },
    DOB: {
      type: Date,
      required: true,
    },
    credentialsChangedAt: Number,
  },
  {
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
    strictQuery: true,
    timestamps: true,
    strict: true,
  },
);

userSchema.virtual("name").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

export type HUser = HydratedDocument<IUser>;
export const userModel = mongoose.model<IUser>("user", userSchema, "user");
