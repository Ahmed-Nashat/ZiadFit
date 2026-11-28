import type { PipelineStage } from "mongoose";
import { roleEnum } from "../../common/enums/role.enum.js";
import { userModel } from "../../database/models/user.model.js";
import { workoutModel } from "../../database/models/workout.model.js";
import { questionnaireModel } from "../../database/models/questionnaire.model.js";
import { subscriptionModel } from "../../database/models/subscription.model.js";
import { questionnaireStatusEnum } from "../../common/enums/questionnaireStatus.enum.js";
import { progressService } from "./progress.service.js";

interface Period { from: Date; to: Date }
interface ClientMetrics {
  clientName: string;
  completedWorkouts: number;
  checkInCount: number;
  checkedInDuringPeriod: boolean;
  firstWeightKg: number | null;
  latestWeightKg: number | null;
}
interface CohortMetrics {
  total: number;
  checkedInDuringPeriod: number;
  comparable: number;
  increased: number;
  decreased: number;
  unchanged: number;
  completedWorkouts: number;
}

function clientMetricsPipeline({ from, to }: Period): PipelineStage.FacetPipelineStage[] {
  return [
    { $lookup: {
      from: "checkIn", let: { clientId: "$_id" }, pipeline: [
        { $match: { $expr: { $and: [{ $eq: ["$clientId", "$$clientId"] }, { $lt: ["$createdAt", to] }] } } },
        { $sort: { createdAt: 1, _id: 1 } },
        { $group: { _id: null, first: { $first: "$weightKg" }, latest: { $last: "$weightKg" }, count: { $sum: 1 }, recent: { $sum: { $cond: [{ $gte: ["$createdAt", from] }, 1, 0] } } } },
      ], as: "checkIns",
    } },
    { $lookup: {
      from: "workout", let: { clientId: "$_id" }, pipeline: [
        { $match: { status: "completed", finishedAt: { $gte: from, $lt: to }, $expr: { $eq: ["$clientId", "$$clientId"] } } },
        { $count: "count" },
      ], as: "workouts",
    } },
    { $set: { checkIn: { $arrayElemAt: ["$checkIns", 0] }, completedWorkouts: { $ifNull: [{ $arrayElemAt: ["$workouts.count", 0] }, 0] } } },
    { $project: {
      _id: 0,
      clientName: { $trim: { input: { $concat: [{ $ifNull: ["$firstName", ""] }, " ", { $ifNull: ["$lastName", ""] }] } } },
      completedWorkouts: 1,
      checkInCount: { $ifNull: ["$checkIn.count", 0] },
      checkedInDuringPeriod: { $gt: [{ $ifNull: ["$checkIn.recent", 0] }, 0] },
      firstWeightKg: { $ifNull: ["$checkIn.first", null] },
      latestWeightKg: { $ifNull: ["$checkIn.latest", null] },
    } },
  ];
}

export function exerciseComparisonPipeline({ from, to }: Period): PipelineStage[] {
  return [
    { $match: { status: "completed", finishedAt: { $gte: from, $lt: to } } },
    { $lookup: { from: "user", localField: "clientId", foreignField: "_id", as: "client" } },
    { $match: { "client.role": roleEnum.client, "client.createdAt": { $lt: to } } },
    { $unwind: "$exercises" },
    { $unwind: "$exercises.sets" },
    { $match: { "exercises.sets.weightKg": { $type: "number" } } },
    { $group: { _id: { clientId: "$clientId", exerciseId: "$exercises.exerciseId", workoutId: "$_id" }, finishedAt: { $first: "$finishedAt" }, maxWeight: { $max: "$exercises.sets.weightKg" } } },
    { $sort: { "_id.clientId": 1, "_id.exerciseId": 1, finishedAt: -1, "_id.workoutId": -1 } },
    { $group: { _id: { clientId: "$_id.clientId", exerciseId: "$_id.exerciseId" }, weights: { $push: "$maxWeight" }, count: { $sum: 1 } } },
    { $match: { count: { $gte: 2 } } },
    { $project: { clientId: "$_id.clientId", comparison: { $cmp: [{ $arrayElemAt: ["$weights", 0] }, { $arrayElemAt: ["$weights", 1] }] } } },
    { $group: { _id: "$clientId", increased: { $max: { $cond: [{ $gt: ["$comparison", 0] }, 1, 0] } }, decreased: { $max: { $cond: [{ $lt: ["$comparison", 0] }, 1, 0] } } } },
    { $group: {
      _id: null,
      comparableClients: { $sum: 1 },
      increasedOnly: { $sum: { $cond: [{ $and: [{ $eq: ["$increased", 1] }, { $eq: ["$decreased", 0] }] }, 1, 0] } },
      decreasedOnly: { $sum: { $cond: [{ $and: [{ $eq: ["$increased", 0] }, { $eq: ["$decreased", 1] }] }, 1, 0] } },
      mixed: { $sum: { $cond: [{ $and: [{ $eq: ["$increased", 1] }, { $eq: ["$decreased", 1] }] }, 1, 0] } },
      unchanged: { $sum: { $cond: [{ $and: [{ $eq: ["$increased", 0] }, { $eq: ["$decreased", 0] }] }, 1, 0] } },
    } },
  ];
}

export class CoachDashboardService {
  async getOverview(period: Period) {
    const now = new Date();
    const [clientResults, exerciseResults, pendingQuestionnaires, activeSubscriptions, expiringSubscriptions, recentCheckIns] = await Promise.all([
      userModel.aggregate<CohortMetrics>([
        { $match: { role: roleEnum.client, createdAt: { $lt: period.to } } },
        ...clientMetricsPipeline(period),
        { $group: {
          _id: null,
          total: { $sum: 1 },
          checkedInDuringPeriod: { $sum: { $cond: ["$checkedInDuringPeriod", 1, 0] } },
          comparable: { $sum: { $cond: [{ $gte: ["$checkInCount", 2] }, 1, 0] } },
          increased: { $sum: { $cond: [{ $and: [{ $gte: ["$checkInCount", 2] }, { $gt: ["$latestWeightKg", "$firstWeightKg"] }] }, 1, 0] } },
          decreased: { $sum: { $cond: [{ $and: [{ $gte: ["$checkInCount", 2] }, { $lt: ["$latestWeightKg", "$firstWeightKg"] }] }, 1, 0] } },
          unchanged: { $sum: { $cond: [{ $and: [{ $gte: ["$checkInCount", 2] }, { $eq: ["$latestWeightKg", "$firstWeightKg"] }] }, 1, 0] } },
          completedWorkouts: { $sum: "$completedWorkouts" },
        } },
      ]),
      workoutModel.aggregate<{ comparableClients: number; increasedOnly: number; decreasedOnly: number; mixed: number; unchanged: number }>(exerciseComparisonPipeline(period)),
      questionnaireModel.countDocuments({ status: { $in: [questionnaireStatusEnum.pending, questionnaireStatusEnum.reviewed] } }),
      subscriptionModel.countDocuments({ startAt: { $lte: now }, endAt: { $gt: now } }),
      subscriptionModel.countDocuments({ startAt: { $lte: now }, endAt: { $gt: now, $lte: new Date(now.getTime() + 7 * 86400000) } }),
      progressService.getRecentCheckIns(1, 5),
    ]);
    const cohort = clientResults[0];
    const totalWorkouts = cohort?.completedWorkouts ?? 0;
    const totalClients = cohort?.total ?? 0;
    const exercise = exerciseResults[0];
    return {
      period,
      clients: { total: totalClients, checkedInDuringPeriod: cohort?.checkedInDuringPeriod ?? 0 },
      pendingQuestionnaires,
      subscriptions: { activeNow: activeSubscriptions, endingWithinSevenDays: expiringSubscriptions },
      weightTrends: {
        comparableClients: cohort?.comparable ?? 0,
        increased: cohort?.increased ?? 0,
        decreased: cohort?.decreased ?? 0,
        unchanged: cohort?.unchanged ?? 0,
      },
      workouts: { completedDuringPeriod: totalWorkouts, averagePerClient: totalClients ? Math.round(totalWorkouts / totalClients * 100) / 100 : null, clientsIncluded: totalClients },
      exerciseLoads: { comparableClients: exercise?.comparableClients ?? 0, increasedOnly: exercise?.increasedOnly ?? 0, decreasedOnly: exercise?.decreasedOnly ?? 0, mixed: exercise?.mixed ?? 0, unchanged: exercise?.unchanged ?? 0 },
      recentCheckIns: recentCheckIns.data,
    };
  }

  async getClients(period: Period, page: number, limit: number) {
    const result = await userModel.aggregate<{ data: ClientMetrics[]; count: { total: number }[] }>([
      { $match: { role: roleEnum.client, createdAt: { $lt: period.to } } },
      { $sort: { createdAt: -1, _id: -1 } },
      { $facet: { count: [{ $count: "total" }], data: [{ $skip: (page - 1) * limit }, { $limit: limit }, ...clientMetricsPipeline(period)] } },
    ]);
    const count = result[0]?.count[0]?.total ?? 0;
    return {
      period,
      data: (result[0]?.data ?? []).map((client) => ({
        ...client,
        weightChangeKg: client.checkInCount >= 2 && client.firstWeightKg !== null && client.latestWeightKg !== null ? Math.round((client.latestWeightKg - client.firstWeightKg) * 100) / 100 : null,
      })),
      meta: { count, currentPage: page, totalPages: Math.ceil(count / limit), hasNextPage: page * limit < count },
    };
  }
}

export const coachDashboardService = new CoachDashboardService();
