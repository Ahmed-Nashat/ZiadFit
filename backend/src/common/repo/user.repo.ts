import type { ProjectionType, QueryFilter, QueryOptions } from "mongoose";
import { userModel } from "../../database/models/user.model.js";
import type { IUser } from "../interface/user.interface.js";
import BaseRepo from "./base.repo.js";

export class UserRepo extends BaseRepo<IUser> {
  constructor() {
    super(userModel);
  }

  async findMany({
    filter = {},
    projection = null,
    options = {},
  }: {
    filter?: QueryFilter<IUser>;
    projection?: ProjectionType<IUser> | null;
    options?: QueryOptions<IUser>;
  }) {
    return await this.model.find(filter, projection, options).exec();
  }

  async findByEmail({
    email,
    projection = null,
  }: {
    email: string;
    projection?: ProjectionType<IUser> | null;
  }) {
    return await this.model.findOne({ email }, projection);
  }
}

export const userRepo = new UserRepo();
