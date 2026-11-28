import { checkInModel } from "../../database/models/check-in.model.js";
import type { ICheckIn } from "../interface/check-in.interface.js";
import BaseRepo from "./base.repo.js";

export class CheckInRepo extends BaseRepo<ICheckIn> {
  constructor() { super(checkInModel); }
}

export const checkInRepo = new CheckInRepo();
