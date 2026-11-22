import { Types } from "mongoose";

export interface ISubscription {
  clientId: Types.ObjectId;
  startAt: Date;
  endAt: Date;
  activatedBy: Types.ObjectId;
}
