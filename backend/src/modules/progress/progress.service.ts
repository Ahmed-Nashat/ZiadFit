import { Types, type HydratedDocument } from "mongoose";
import { roleEnum } from "../../common/enums/role.enum.js";
import { NotFoundException } from "../../common/exceptions/application.exception.js";
import { checkInRepo } from "../../common/repo/check-in.repo.js";
import { userRepo } from "../../common/repo/user.repo.js";
import { checkInModel } from "../../database/models/check-in.model.js";
import { workoutModel } from "../../database/models/workout.model.js";
import type { ICheckIn } from "../../common/interface/check-in.interface.js";

class ProgressService {
  private formatCheckIn(checkIn: HydratedDocument<ICheckIn>) {
    const { clientId: _clientId, ...data } = checkIn.toObject();
    return data;
  }

  private async getClient(clientId: string) {
    const client = await userRepo.findOne({
      filter: { _id: new Types.ObjectId(clientId), role: roleEnum.client },
      projection: { firstName: 1, lastName: 1 },
    });
    if (!client) throw new NotFoundException("Client not found");
    return client;
  }

  async submitCheckIn(clientId: string, data: { weightKg: number; note?: string }) {
    const checkIn = await checkInRepo.create({ data: { clientId: new Types.ObjectId(clientId), weightKg: data.weightKg, ...(data.note !== undefined ? { note: data.note } : {}) } });
    return this.formatCheckIn(checkIn);
  }

  async getCheckIns(clientId: string, page: number, limit: number) {
    const result = await checkInRepo.paggination({
      filter: { clientId: new Types.ObjectId(clientId) }, page, limit,
      options: { sort: { createdAt: -1, _id: -1 } },
    });
    return { ...result, data: result.data.map((checkIn) => this.formatCheckIn(checkIn)) };
  }

  async getClientCheckIns(clientId: string, page: number, limit: number) {
    const client = await this.getClient(clientId);
    return { clientName: `${client.firstName} ${client.lastName}`.trim(), ...await this.getCheckIns(clientId, page, limit) };
  }

  async getSummary(clientId: string) {
    const id = new Types.ObjectId(clientId);
    const [first, recent, checkInCount, completedWorkouts, latestWorkout] = await Promise.all([
      checkInModel.findOne({ clientId: id }).sort({ createdAt: 1, _id: 1 }).select("weightKg createdAt").lean(),
      checkInModel.find({ clientId: id }).sort({ createdAt: -1, _id: -1 }).limit(12).select("weightKg createdAt").lean(),
      checkInModel.countDocuments({ clientId: id }),
      workoutModel.countDocuments({ clientId: id, status: "completed" }),
      workoutModel.findOne({ clientId: id, status: "completed" }).sort({ finishedAt: -1, _id: -1 }).select("finishedAt").lean(),
    ]);
    const latest = recent[0];
    const previous = recent[1];
    const change = (a: number, b: number) => Math.round((a - b) * 100) / 100;
    return {
      checkInCount,
      firstWeightKg: first?.weightKg ?? null,
      latestWeightKg: latest?.weightKg ?? null,
      latestCheckInAt: latest?.createdAt ?? null,
      changeFromFirstKg: first && latest ? change(latest.weightKg, first.weightKg) : null,
      changeFromPreviousKg: previous && latest ? change(latest.weightKg, previous.weightKg) : null,
      weightHistory: recent.reverse().map((entry) => ({ weightKg: entry.weightKg, recordedAt: entry.createdAt })),
      completedWorkouts,
      lastWorkoutAt: latestWorkout?.finishedAt ?? null,
    };
  }

  async getClientSummary(clientId: string) {
    const client = await this.getClient(clientId);
    return { clientName: `${client.firstName} ${client.lastName}`.trim(), ...await this.getSummary(clientId) };
  }

  async getExerciseProgress(clientId: string, exerciseName: string) {
    const escaped = exerciseName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`^${escaped}$`, "i");
    const workouts = await workoutModel.find({
      clientId: new Types.ObjectId(clientId),
      status: "completed",
      exercises: { $elemMatch: { exerciseName: pattern, "sets.0": { $exists: true } } },
    }).sort({ finishedAt: -1, _id: -1 }).limit(12).select("finishedAt dayName exercises").lean();
    const sessions = workouts.flatMap((workout) => workout.exercises
      .filter((exercise) => pattern.test(exercise.exerciseName) && exercise.sets.length > 0)
      .map((exercise) => {
        const weights = exercise.sets.flatMap((set) => set.weightKg === undefined ? [] : [set.weightKg]);
        return {
          dayName: workout.dayName,
          finishedAt: workout.finishedAt ?? null,
          bestWeightKg: weights.length ? Math.max(...weights) : null,
          totalReps: exercise.sets.reduce((total, set) => total + set.reps, 0),
          sets: exercise.sets.map(({ setNumber, reps, weightKg }) => ({ setNumber, reps, ...(weightKg !== undefined ? { weightKg } : {}) })),
        };
      })).reverse();
    return { exerciseName, sessions };
  }

  async getClientExerciseProgress(clientId: string, exerciseName: string) {
    const client = await this.getClient(clientId);
    return { clientName: `${client.firstName} ${client.lastName}`.trim(), ...await this.getExerciseProgress(clientId, exerciseName) };
  }

  async getRecentCheckIns(page: number, limit: number) {
    const result = await checkInRepo.paggination({ page, limit, options: { sort: { createdAt: -1, _id: -1 } } });
    const clients = result.data.length ? await userRepo.findMany({
      filter: { _id: { $in: result.data.map((entry) => entry.clientId) }, role: roleEnum.client },
      projection: { firstName: 1, lastName: 1 },
    }) : [];
    const names = new Map(clients.map((client) => [String(client._id), `${client.firstName} ${client.lastName}`.trim()]));
    return { ...result, data: result.data.map((entry) => ({ ...this.formatCheckIn(entry), clientName: names.get(String(entry.clientId)) ?? null })) };
  }
}

export const progressService = new ProgressService();
