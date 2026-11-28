import { Types, type HydratedDocument } from "mongoose";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "../../common/exceptions/application.exception.js";
import { trainingPlanRepo } from "../../common/repo/training-plan.repo.js";
import { exerciseRepo } from "../../common/repo/exercise.repo.js";
import { workoutRepo } from "../../common/repo/workout.repo.js";
import { userRepo } from "../../common/repo/user.repo.js";
import { roleEnum } from "../../common/enums/role.enum.js";
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

  async getWorkoutHistory(clientId: string, page: number, limit: number) {
    const result = await workoutRepo.paggination({
      filter: { clientId: new Types.ObjectId(clientId), status: "completed" },
      page,
      limit,
      options: { sort: { finishedAt: -1, _id: -1 } },
    });
    return { ...result, data: result.data.map((workout) => this.formatWorkout(workout)) };
  }

  async getClientWorkoutHistory(clientId: string, page: number, limit: number) {
    const client = await userRepo.findOne({
      filter: { _id: new Types.ObjectId(clientId), role: roleEnum.client },
      projection: { firstName: 1, lastName: 1 },
    });
    if (!client) throw new NotFoundException("Client not found");
    const history = await this.getWorkoutHistory(clientId, page, limit);
    return { clientName: `${client.firstName} ${client.lastName}`.trim(), ...history };
  }

  async finishWorkout(clientId: string, workoutId: string) {
    const filter = {
      _id: new Types.ObjectId(workoutId),
      clientId: new Types.ObjectId(clientId),
    };
    const workout = await workoutRepo.findOneAndUpdate({
      filter: { ...filter, status: "inProgress" },
      update: {
        $set: { status: "completed", finishedAt: new Date() },
        $inc: { __v: 1 },
      },
      options: { runValidators: true },
    });
    if (!workout) {
      const existing = await workoutRepo.findOne({ filter });
      if (!existing) throw new NotFoundException("Workout not found");
      throw new ConflictException("Workout has already been completed");
    }
    return this.formatWorkout(workout);
  }

  async logSet(
    clientId: string,
    data: {
      exerciseName: string;
      setNumber: number;
      reps: number;
      weightKg?: number;
    },
  ) {
    const clientObjectId = new Types.ObjectId(clientId);
    const workout = (await workoutRepo.findOne({
      filter: { clientId: clientObjectId, status: "inProgress" },
    })) as HydratedDocument<IWorkout> | null;
    if (!workout) throw new NotFoundException("No in-progress workout found");
    const exercises = workout.toObject().exercises;
    const matches = exercises.filter(
      (exercise) =>
        exercise.exerciseName.trim().toLowerCase() ===
        data.exerciseName.trim().toLowerCase(),
    );
    if (!matches.length)
      throw new NotFoundException("Exercise not found in this workout");
    if (matches.length > 1)
      throw new ConflictException(
        "More than one exercise has this name in the workout",
      );
    const exercise = matches[0]!;
    const loggedSet = {
      setNumber: data.setNumber,
      reps: data.reps,
      ...(data.weightKg !== undefined ? { weightKg: data.weightKg } : {}),
    };
    const index = exercise.sets.findIndex(
      (item) => item.setNumber === data.setNumber,
    );
    if (index < 0) exercise.sets.push(loggedSet);
    else exercise.sets[index] = loggedSet;
    exercise.sets.sort((a, b) => a.setNumber - b.setNumber);
    const updated = await workoutRepo.findOneAndUpdate({
      filter: {
        _id: workout._id,
        clientId: clientObjectId,
        status: "inProgress",
        __v: workout.__v ?? { $exists: false },
      },
      update: { $set: { exercises }, $inc: { __v: 1 } },
      options: { runValidators: true },
    });
    if (!updated)
      throw new ConflictException(
        "Workout changed while saving. Please try again",
      );
    return this.formatWorkout(updated);
  }
}

export const workoutService = new WorkoutService();
