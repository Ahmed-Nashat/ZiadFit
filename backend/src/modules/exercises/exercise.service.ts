import { Types } from "mongoose";
import { exerciseRepo } from "../../common/repo/exercise.repo.js";
import { NotFoundException } from "../../common/exceptions/application.exception.js";

interface ExerciseData {
  name: string;
  muscleGroup: string;
  equipment: string;
  instructions: string;
  videoUrl?: string;
}

class ExerciseService {
  async createExercise(coachId: string, data: ExerciseData) {
    return exerciseRepo.create({
      data: { ...data, createdBy: new Types.ObjectId(coachId) },
    });
  }

  async getExercises(page: number, limit: number, muscleGroup?: string) {
    const escaped = muscleGroup?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return exerciseRepo.paggination({
      page,
      limit,
      filter: { isArchived: { $ne: true }, ...(escaped ? { muscleGroup: new RegExp(escaped, "i") } : {}) },
      options: { sort: { createdAt: -1, _id: -1 } },
    });
  }

  async searchExercises(name: string, page: number, limit: number) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return exerciseRepo.paggination({
      filter: { name: new RegExp(escaped, "i"), isArchived: { $ne: true } },
      page,
      limit,
      options: { sort: { createdAt: -1, _id: -1 } },
    });
  }

  async updateExercise(exerciseId: string, data: Partial<ExerciseData>) {
    const exercise = await exerciseRepo.findOneAndUpdate({
      filter: { _id: new Types.ObjectId(exerciseId), isArchived: { $ne: true } },
      update: { $set: data },
      options: { runValidators: true },
    });
    if (!exercise) throw new NotFoundException("Exercise not found");
    return exercise;
  }

  async archiveExercise(exerciseId: string) {
    const exercise = await exerciseRepo.findOneAndUpdate({
      filter: { _id: new Types.ObjectId(exerciseId), isArchived: { $ne: true } },
      update: { $set: { isArchived: true } },
      options: { runValidators: true },
    });
    if (!exercise) throw new NotFoundException("Exercise not found or already archived");
    return exercise;
  }

  async unarchiveExercise(exerciseId: string) {
    const exercise = await exerciseRepo.findOneAndUpdate({
      filter: { _id: new Types.ObjectId(exerciseId), isArchived: true },
      update: { $set: { isArchived: false } },
      options: { runValidators: true },
    });
    if (!exercise) throw new NotFoundException("Exercise not found or not archived");
    return exercise;
  }
}

export const exerciseService = new ExerciseService();
