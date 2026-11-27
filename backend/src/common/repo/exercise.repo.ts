import { exerciseModel } from "../../database/models/exercise.model.js";
import type { IExercise } from "../interface/exercise.interface.js";
import BaseRepo from "./base.repo.js";
import type { ProjectionType, QueryFilter, Types } from "mongoose";

export class ExerciseRepo extends BaseRepo<IExercise> {
  constructor() {
    super(exerciseModel);
  }

  async findMany(filter: QueryFilter<IExercise>, projection: ProjectionType<IExercise>) {
    return this.model.find(filter, projection).lean<(Pick<IExercise, "name"> & Partial<IExercise> & { _id: Types.ObjectId })[]>().exec();
  }
}

export const exerciseRepo = new ExerciseRepo();
