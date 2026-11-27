import { exerciseModel } from "../../database/models/exercise.model.js";
import type { IExercise } from "../interface/exercise.interface.js";
import BaseRepo from "./base.repo.js";

export class ExerciseRepo extends BaseRepo<IExercise> {
  constructor() {
    super(exerciseModel);
  }
}

export const exerciseRepo = new ExerciseRepo();
