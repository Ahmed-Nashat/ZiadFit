import { workoutModel } from "../../database/models/workout.model.js";
import type { IWorkout } from "../interface/workout.interface.js";
import BaseRepo from "./base.repo.js";

export class WorkoutRepo extends BaseRepo<IWorkout> {
  constructor() { super(workoutModel); }
}

export const workoutRepo = new WorkoutRepo();
