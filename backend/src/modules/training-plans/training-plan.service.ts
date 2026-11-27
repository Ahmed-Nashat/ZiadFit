import { Types, type HydratedDocument } from "mongoose";
import { roleEnum } from "../../common/enums/role.enum.js";
import { accountStatusEnum } from "../../common/enums/accountStatus.enum.js";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from "../../common/exceptions/application.exception.js";
import { userRepo } from "../../common/repo/user.repo.js";
import { exerciseRepo } from "../../common/repo/exercise.repo.js";
import { trainingPlanRepo } from "../../common/repo/training-plan.repo.js";
import type { ITrainingPlan } from "../../common/interface/training-plan.interface.js";

interface TrainingPlanData {
  clientId: string;
  title: string;
  days: {
    name: string;
    exercises: {
      exerciseName: string;
      sets: number;
      reps: number;
      notes?: string;
    }[];
  }[];
}

class TrainingPlanService {
  private async formatPlans(plans: HydratedDocument<ITrainingPlan>[]) {
    if (!plans.length) return [];
    const users = await userRepo.findMany({
      filter: {
        _id: { $in: plans.flatMap((plan) => [plan.clientId, plan.createdBy]) },
      },
      projection: { firstName: 1, lastName: 1 },
    });
    const names = new Map(
      users.map((user) => [
        String(user._id),
        `${user.firstName} ${user.lastName}`.trim(),
      ]),
    );
    const exerciseIds = plans.flatMap((plan) =>
      plan.days.flatMap((day) =>
        day.exercises.map((exercise) => exercise.exerciseId),
      ),
    );
    const exercises = exerciseIds.length
      ? await exerciseRepo.findMany(
          { _id: { $in: exerciseIds } },
          {
            name: 1,
            muscleGroup: 1,
            equipment: 1,
            instructions: 1,
            videoUrl: 1,
            isArchived: 1,
          },
        )
      : [];
    const exercisesById = new Map(
      exercises.map((exercise) => [String(exercise._id), exercise]),
    );
    return plans.map((plan) => {
      const { clientId, createdBy, ...details } = plan.toObject();
      return {
        ...details,
        days: details.days.map((day) => ({
          ...day,
          exercises: day.exercises.map(({ exerciseId, ...item }) => {
            const exercise = exercisesById.get(String(exerciseId));
            return {
              ...item,
              exerciseName: exercise?.name ?? null,
              exerciseDetails: exercise
                ? {
                    muscleGroup: exercise.muscleGroup,
                    equipment: exercise.equipment,
                    instructions: exercise.instructions,
                    videoUrl: exercise.videoUrl,
                    isArchived: exercise.isArchived,
                  }
                : null,
            };
          }),
        })),
        clientName: names.get(String(clientId)) ?? null,
        coachName: names.get(String(createdBy)) ?? null,
      };
    });
  }

  async createTrainingPlan(coachId: string, data: TrainingPlanData) {
    const clientId = new Types.ObjectId(data.clientId);
    const client = await userRepo.findOne({
      filter: { _id: clientId, role: roleEnum.client },
    });
    if (!client) throw new NotFoundException("Client not found");
    if (client.accountStatus === accountStatusEnum.suspended)
      throw new ForbiddenException(
        "Cannot create a new plan for a suspended client",
      );
    const exerciseNames = [
      ...new Set(
        data.days.flatMap((day) =>
          day.exercises.map((exercise) =>
            exercise.exerciseName.trim().toLowerCase(),
          ),
        ),
      ),
    ];
    const exercises = await exerciseRepo.findMany(
      {
        name: {
          $in: exerciseNames.map(
            (name) =>
              new RegExp(
                `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
                "i",
              ),
          ),
        },
        isArchived: { $ne: true },
      },
      { _id: 1, name: 1 },
    );
    const exercisesByName = new Map(
      exercises.map((exercise) => [
        exercise.name.trim().toLowerCase(),
        exercise,
      ]),
    );
    if (exercises.length !== exercisesByName.size)
      throw new ConflictException(
        "More than one exercise has the same name; rename duplicates before assigning a plan",
      );
    if (exerciseNames.some((name) => !exercisesByName.has(name)))
      throw new BadRequestException(
        "One or more exercises do not exist or are archived",
      );
    const incomingDays = data.days.map((day) => ({
      name: day.name,
      exercises: day.exercises.map(({ exerciseName, ...exercise }) => ({
        ...exercise,
        exerciseId: exercisesByName.get(exerciseName.trim().toLowerCase())!._id,
      })),
    }));
    const normalizeDay = (name: string) => name.trim().toLowerCase();
    if (
      new Set(incomingDays.map((day) => normalizeDay(day.name))).size !==
      incomingDays.length
    )
      throw new BadRequestException(
        "A day cannot appear more than once in the same request",
      );

    const existing = (await trainingPlanRepo.findOne({
      filter: { clientId },
    })) as HydratedDocument<ITrainingPlan> | null;
    const days = existing ? existing.toObject().days : [];
    for (const day of incomingDays) {
      const index = days.findIndex(
        (existingDay) =>
          normalizeDay(existingDay.name) === normalizeDay(day.name),
      );
      if (index === -1) days.push(day);
      else days[index] = day;
    }
    if (days.length > 7)
      throw new BadRequestException("A plan cannot have more than seven days");

    let plan;
    try {
      plan = existing
        ? await trainingPlanRepo.findOneAndUpdate({
            filter: {
              _id: existing._id,
              __v: existing.__v ?? { $exists: false },
            },
            update: {
              $set: { title: data.title, days },
              $inc: { __v: 1 },
            },
            options: { runValidators: true },
          })
        : await trainingPlanRepo.create({
            data: {
              clientId,
              createdBy: new Types.ObjectId(coachId),
              title: data.title,
              days,
            },
          });
    } catch (error: unknown) {
      if (
        !existing &&
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 11000 &&
        "keyPattern" in error &&
        typeof error.keyPattern === "object" &&
        error.keyPattern !== null &&
        "clientId" in error.keyPattern
      )
        throw new ConflictException(
          "Plan changed while saving. Please try again",
        );
      throw error;
    }
    if (!plan)
      throw new ConflictException(
        "Plan changed while saving. Please try again",
      );
    return (await this.formatPlans([plan]))[0];
  }

  async deleteDay(clientId: string, dayName: string) {
    const client = await userRepo.findOne({
      filter: { _id: new Types.ObjectId(clientId), role: roleEnum.client },
    });
    if (!client) throw new NotFoundException("Client not found");
    if (client.accountStatus === accountStatusEnum.suspended)
      throw new ForbiddenException(
        "Cannot change a plan for a suspended client",
      );
    const plan = (await trainingPlanRepo.findOne({
      filter: { clientId: new Types.ObjectId(clientId) },
    })) as HydratedDocument<ITrainingPlan> | null;
    if (!plan) throw new NotFoundException("Training plan not found");
    const days = plan.toObject().days;
    const remaining = days.filter(
      (day) => day.name.trim().toLowerCase() !== dayName.trim().toLowerCase(),
    );
    if (remaining.length === days.length)
      throw new NotFoundException("Training day not found");
    const updated = await trainingPlanRepo.findOneAndUpdate({
      filter: { _id: plan._id, __v: plan.__v ?? { $exists: false } },
      update: { $set: { days: remaining }, $inc: { __v: 1 } },
      options: { runValidators: true },
    });
    if (!updated)
      throw new ConflictException(
        "Plan changed while saving. Please try again",
      );
    return (await this.formatPlans([updated]))[0];
  }

  async getMyPlans(clientId: string, page: number, limit: number) {
    const result = await trainingPlanRepo.paggination({
      filter: { clientId: new Types.ObjectId(clientId) },
      page,
      limit,
      options: { sort: { createdAt: -1, _id: -1 } },
    });
    return { ...result, data: await this.formatPlans(result.data) };
  }
}

export const trainingPlanService = new TrainingPlanService();
