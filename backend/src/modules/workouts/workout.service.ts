import { Types, type HydratedDocument } from "mongoose";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "../../common/exceptions/application.exception.js";
import { trainingPlanRepo } from "../../common/repo/training-plan.repo.js";
import { exerciseRepo } from "../../common/repo/exercise.repo.js";
import { workoutRepo } from "../../common/repo/workout.repo.js";
import type { IWorkout } from "../../common/interface/workout.interface.js";
import type { ITrainingPlan } from "../../common/interface/training-plan.interface.js";

class WorkoutService {
  private formatWorkout(workout: HydratedDocument<IWorkout>) {
    const {
      clientId: _clientId,
      planId: _planId,
      ...data
    } = workout.toObject();
    return {
      ...data,
      exercises: data.exercises.map(
        ({ exerciseId: _exerciseId, ...exercise }) => exercise,
      ),
    };
  }

  async startWorkout(clientId: string, dayName: string) {
    const clientObjectId = new Types.ObjectId(clientId);
    const active = await workoutRepo.findOne({
      filter: { clientId: clientObjectId, status: "inProgress" },
    });
    if (active)
      throw new ConflictException("You already have an in-progress workout");
    const plan = (await trainingPlanRepo.findOne({
      filter: { clientId: clientObjectId },
    })) as HydratedDocument<ITrainingPlan> | null;
    if (!plan) throw new NotFoundException("Training plan not found");
    const day = plan.days.find(
      (item) => item.name.trim().toLowerCase() === dayName.trim().toLowerCase(),
    );
    if (!day) throw new NotFoundException("Training day not found");
    if (!day.exercises.length)
      throw new BadRequestException("This training day has no exercises");
    const exercises = await exerciseRepo.findMany(
      { _id: { $in: day.exercises.map((item) => item.exerciseId) } },
      { name: 1 },
    );
    const names = new Map(
      exercises.map((exercise) => [String(exercise._id), exercise.name]),
    );
    if (day.exercises.some((item) => !names.has(String(item.exerciseId))))
      throw new ConflictException("A planned exercise no longer exists");
    try {
      const workout = await workoutRepo.create({
        data: {
          clientId: clientObjectId,
          planId: plan._id,
          dayName: day.name,
          exercises: day.exercises.map((item) => ({
            exerciseId: item.exerciseId,
            exerciseName: names.get(String(item.exerciseId))!,
            targetSets: item.sets,
            targetReps: item.reps,
            ...(item.notes ? { notes: item.notes } : {}),
            sets: [],
          })),
        },
      });
      return this.formatWorkout(workout);
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 11000 &&
        "keyPattern" in error &&
        typeof error.keyPattern === "object" &&
        error.keyPattern !== null &&
        "clientId" in error.keyPattern
      )
        throw new ConflictException("You already have an in-progress workout");
      throw error;
    }
  }

  async getActiveWorkout(clientId: string) {
    const workout = await workoutRepo.findOne({
      filter: { clientId: new Types.ObjectId(clientId), status: "inProgress" },
    });
    if (!workout) throw new NotFoundException("No in-progress workout found");
    return this.formatWorkout(workout as HydratedDocument<IWorkout>);
  }
}

export const workoutService = new WorkoutService();
