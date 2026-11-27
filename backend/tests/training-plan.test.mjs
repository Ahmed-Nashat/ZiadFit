import { test } from "node:test";
import assert from "node:assert/strict";
import { Types } from "mongoose";
import { trainingPlanService } from "../dist/src/modules/training-plans/training-plan.service.js";
import { createTrainingPlanSchema, deleteTrainingDaySchema } from "../dist/src/modules/training-plans/training-plan.validation.js";
import { userRepo } from "../dist/src/common/repo/user.repo.js";
import { exerciseRepo } from "../dist/src/common/repo/exercise.repo.js";
import { trainingPlanRepo } from "../dist/src/common/repo/training-plan.repo.js";
import { roleEnum } from "../dist/src/common/enums/role.enum.js";
import { trainingPlanModel } from "../dist/src/database/models/training-plan.model.js";

const clientId = "507f1f77bcf86cd799439011";
const coachId = "507f1f77bcf86cd799439012";
const exerciseId = "507f1f77bcf86cd799439013";
const body = { clientId, title: "Strength", days: [{ name: "Day 1", exercises: [{ exerciseName: "Barbell Squat", sets: 3, reps: 10 }] }] };
const storedDay = { name: "Day 1", exercises: [{ exerciseId, sets: 3, reps: 10 }] };

test("plan validation requires valid exercises and positive sets and reps", () => {
  const schema = createTrainingPlanSchema();
  assert.equal(schema.safeParse({ body }).success, true);
  assert.equal(schema.safeParse({ body: { ...body, days: [] } }).success, false);
  assert.equal(schema.safeParse({ body: { ...body, days: [{ name: "Day", exercises: [{ exerciseName: "Barbell Squat", sets: 0, reps: 10 }] }] } }).success, false);
  assert.equal(schema.safeParse({ body: { ...body, createdBy: coachId } }).success, false);
});

test("coach plan creation checks client and active exercises", async () => {
  const findUser = userRepo.findOne, findUsers = userRepo.findMany, findExercises = exerciseRepo.findMany, save = trainingPlanRepo.findOneAndUpdate, findPlan = trainingPlanRepo.findOne, create = trainingPlanRepo.create;
  try {
    userRepo.findOne = async ({ filter }) => { assert.equal(filter.role, roleEnum.client); return null; };
    await assert.rejects(trainingPlanService.createTrainingPlan(coachId, body), { status: 404 });
    userRepo.findOne = async () => ({ _id: clientId, accountStatus: 1 });
    await assert.rejects(trainingPlanService.createTrainingPlan(coachId, body), { status: 403 });
    userRepo.findOne = async () => ({ _id: clientId });
    exerciseRepo.findMany = async (filter) => { assert.equal(filter.isArchived.$ne, true); return []; };
    await assert.rejects(trainingPlanService.createTrainingPlan(coachId, body), { status: 400 });
    exerciseRepo.findMany = async () => [{ _id: exerciseId, name: "Barbell Squat" }, { _id: coachId, name: "barbell squat" }];
    await assert.rejects(trainingPlanService.createTrainingPlan(coachId, body), { status: 409 });
    exerciseRepo.findMany = async () => [{ _id: exerciseId, name: "Barbell Squat" }];
    trainingPlanRepo.findOne = async () => null;
    trainingPlanRepo.create = async ({ data }) => new trainingPlanModel(data);
    userRepo.findMany = async () => [{ _id: clientId, firstName: "Ahmed", lastName: "Ali" }, { _id: coachId, firstName: "Ziad", lastName: "Coach" }];
    const plan = await trainingPlanService.createTrainingPlan(coachId, body);
    assert.equal(plan.clientName, "Ahmed Ali");
    assert.equal(plan.coachName, "Ziad Coach");
    assert.equal("clientId" in plan, false);
    assert.equal("createdBy" in plan, false);
    assert.equal(plan.days[0].exercises[0].exerciseName, "Barbell Squat");
    assert.equal("exerciseId" in plan.days[0].exercises[0], false);
  } finally { userRepo.findOne = findUser; userRepo.findMany = findUsers; exerciseRepo.findMany = findExercises; trainingPlanRepo.findOneAndUpdate = save; trainingPlanRepo.findOne = findPlan; trainingPlanRepo.create = create; }
});

test("saving days replaces matching workouts and keeps other days", async () => {
  const findUser = userRepo.findOne, findUsers = userRepo.findMany, findExercises = exerciseRepo.findMany, save = trainingPlanRepo.findOneAndUpdate, findPlan = trainingPlanRepo.findOne;
  try {
    userRepo.findOne = async () => ({ _id: clientId });
    userRepo.findMany = async () => [];
    exerciseRepo.findMany = async () => [{ _id: exerciseId, name: "Barbell Squat" }];
    const existing = new trainingPlanModel({ ...body, createdBy: coachId, days: [storedDay, { name: 'Day 2', exercises: storedDay.exercises }] });
    existing.__v = 3;
    trainingPlanRepo.findOne = async () => existing;
    trainingPlanRepo.findOneAndUpdate = async ({ filter, update }) => {
      assert.equal(filter.__v, 3);
      assert.equal(update.$inc.__v, 1);
      assert.deepEqual(update.$set.days.map(day => day.name), ['day 1', 'Day 2', 'Day 3']);
      assert.equal(update.$set.days[0].exercises[0].sets, 5);
      assert.equal(update.$set.days[1].exercises[0].sets, 3);
      return new trainingPlanModel({ ...existing.toObject(), ...update.$set });
    };
    await trainingPlanService.createTrainingPlan(coachId, { ...body, days: [{ name:'day 1', exercises:[{ exerciseName:'Barbell Squat', sets:5, reps:8 }] }, { name:'Day 3', exercises:body.days[0].exercises }] });
    await assert.rejects(trainingPlanService.createTrainingPlan(coachId, { ...body, days: [body.days[0], { ...body.days[0], name:'day 1' }] }), { status: 400 });
    trainingPlanRepo.findOneAndUpdate = async () => null;
    await assert.rejects(trainingPlanService.createTrainingPlan(coachId, body), { status: 409 });
  } finally { userRepo.findOne = findUser; userRepo.findMany = findUsers; exerciseRepo.findMany = findExercises; trainingPlanRepo.findOneAndUpdate = save; trainingPlanRepo.findOne = findPlan; }
});

test("client plan listing limits results to that client and includes exercise details", async () => {
  const pagination = trainingPlanRepo.paggination;
  const findUsers = userRepo.findMany, findExercises = exerciseRepo.findMany;
  try {
    exerciseRepo.findMany = async () => [{ _id: exerciseId, name: "Barbell Squat" }];
    let argumentsUsed;
    trainingPlanRepo.paggination = async (args) => { argumentsUsed = args; return { data: [new trainingPlanModel({ ...body, clientId, createdBy: coachId, days: [storedDay] })], meta: { count: 1 } }; };
    userRepo.findMany = async () => [{ _id: clientId, firstName: "Ahmed", lastName: "Ali" }, { _id: coachId, firstName: "Ziad", lastName: "Coach" }];
    const result = await trainingPlanService.getMyPlans(clientId, 1, 10);
    assert.equal(String(argumentsUsed.filter.clientId), clientId);

    assert.ok(argumentsUsed.filter.clientId instanceof Types.ObjectId);
    assert.equal(result.data[0].clientName, "Ahmed Ali");
    assert.equal(result.data[0].coachName, "Ziad Coach");
    assert.equal(result.data[0].days[0].exercises[0].exerciseName, "Barbell Squat");
    assert.equal("exerciseId" in result.data[0].days[0].exercises[0], false);
    assert.equal("clientId" in result.data[0], false);
    assert.equal("createdBy" in result.data[0], false);
  } finally { trainingPlanRepo.paggination = pagination; userRepo.findMany = findUsers; exerciseRepo.findMany = findExercises; }
});

test("coach can delete a day without changing other days", async () => {
  assert.equal(deleteTrainingDaySchema().safeParse({ params: { clientId, dayName: 'Day 1' } }).success, true);
  assert.equal(deleteTrainingDaySchema().safeParse({ params: { clientId: 'bad', dayName: 'Day 1' } }).success, false);
  const findUser = userRepo.findOne, findUsers = userRepo.findMany, findExercises = exerciseRepo.findMany, findPlan = trainingPlanRepo.findOne, update = trainingPlanRepo.findOneAndUpdate;
  try {
    userRepo.findOne = async () => ({ accountStatus: 0 });
    userRepo.findMany = async () => [];
    exerciseRepo.findMany = async () => [{ _id: exerciseId, name: "Barbell Squat" }];
    const plan = new trainingPlanModel({ ...body, createdBy: coachId, days: [storedDay, { name: 'Day 2', exercises: storedDay.exercises }] });
    plan.__v = 2;
    trainingPlanRepo.findOne = async () => plan;
    trainingPlanRepo.findOneAndUpdate = async ({ filter, update }) => {
      assert.equal(filter.__v, 2);
      assert.equal(update.$inc.__v, 1);
      assert.deepEqual(update.$set.days.map(day => day.name), ['Day 2']);
      return new trainingPlanModel({ ...plan.toObject(), ...update.$set });
    };
    const result = await trainingPlanService.deleteDay(clientId, 'day 1');
    assert.deepEqual(result.days.map(day => day.name), ['Day 2']);
    await assert.rejects(trainingPlanService.deleteDay(clientId, 'Day 3'), { status: 404 });
    trainingPlanRepo.findOne = async () => null;
    await assert.rejects(trainingPlanService.deleteDay(clientId, 'Day 1'), { status: 404 });
  } finally { userRepo.findOne = findUser; userRepo.findMany = findUsers; trainingPlanRepo.findOne = findPlan; trainingPlanRepo.findOneAndUpdate = update; exerciseRepo.findMany = findExercises; }
});
