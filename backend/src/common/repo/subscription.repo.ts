import { subscriptionModel } from "../../database/models/subscription.model.js";
import { ISubscription } from "../interface/subscription.interface.js";
import BaseRepo from "./base.repo.js";

export class SubscriptionRepo extends BaseRepo<ISubscription> {
  constructor() {
    super(subscriptionModel);
  }
}
export const subscriptionRepo = new SubscriptionRepo();
