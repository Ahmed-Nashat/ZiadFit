import { trainingPlanModel } from "../../database/models/training-plan.model.js";
import type { ITrainingPlan } from "../interface/training-plan.interface.js";
import BaseRepo from "./base.repo.js";

export class TrainingPlanRepo extends BaseRepo<ITrainingPlan> {
  constructor() { super(trainingPlanModel); }
}

export const trainingPlanRepo = new TrainingPlanRepo();
