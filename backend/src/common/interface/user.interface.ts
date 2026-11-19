import { enums } from "../index.js";

export interface IUser {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: enums.roleEnum;
  emailVerifiedAt: Date | null;
  accountStatus: enums.accountStatusEnum;
  createdAt: Date;
  updatedAt: Date;
  gender: enums.genderEnum;
  credentialsChangedAt?: number;
  DOB: Date;
}
