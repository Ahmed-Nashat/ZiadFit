import { test } from "node:test";
import assert from "node:assert/strict";
import { exerciseService } from "../dist/src/modules/exercises/exercise.service.js";
import { createExerciseSchema, listExercisesSchema, searchExercisesSchema, updateExerciseSchema, archiveExerciseSchema } from "../dist/src/modules/exercises/exercise.validation.js";
import { exerciseRepo } from "../dist/src/common/repo/exercise.repo.js";
import { roleBasedAccessMiddleware } from "../dist/src/common/middleware/authorization.js";
import { roleEnum } from "../dist/src/common/enums/role.enum.js";

const input = { name: "Squat", muscleGroup: "Legs", equipment: "Barbell", instructions: "Lower, then stand." };
const coachId = "507f1f77bcf86cd799439011";

test("exercise validation requires fields and checks video URLs", () => {
  const schema = createExerciseSchema();
  assert.equal(schema.safeParse({ body: input }).success, true);
  assert.equal(schema.safeParse({ body: { ...input, name: "  " } }).success, false);
  assert.equal(schema.safeParse({ body: { ...input, videoUrl: "javascript:alert(1)" } }).success, false);
  assert.equal(schema.safeParse({ body: { ...input, createdBy: coachId } }).success, false);
  assert.equal(listExercisesSchema().safeParse({ query: { page: "0" } }).success, false);
  assert.equal(listExercisesSchema().safeParse({ query: { limit: "101" } }).success, false);
  assert.equal(listExercisesSchema().safeParse({ query: { muscleGroup: " " } }).success, false);
  assert.deepEqual(listExercisesSchema().parse({ query: {} }).query, { page: 1, limit: 10 });
  assert.equal(searchExercisesSchema().safeParse({ query: { name: "  " } }).success, false);
  assert.equal(searchExercisesSchema().parse({ query: { name: " squat " } }).query.name, "squat");
  assert.equal(updateExerciseSchema().safeParse({ params:{exerciseId:coachId}, body:{} }).success, false);
  assert.equal(updateExerciseSchema().safeParse({ params:{exerciseId:coachId}, body:{name:'Updated'} }).success, true);
  assert.equal(updateExerciseSchema().safeParse({ params:{exerciseId:coachId}, body:{isArchived:true} }).success, false);
  assert.equal(archiveExerciseSchema().safeParse({ params:{exerciseId:'invalid'} }).success, false);
});

test("only coach roles pass authorization", () => {
  const authorize = roleBasedAccessMiddleware([roleEnum.coach]);
  let next = false;
  authorize({ user: { role: roleEnum.coach } }, {}, () => { next = true; });
  assert.equal(next, true);
  assert.throws(() => authorize({ user: { role: roleEnum.client } }, {}, () => {}), { status: 403 });
  assert.throws(() => authorize({}, {}, () => {}), { status: 401 });
});

test("creation uses the authenticated coach and listing uses pagination", async () => {
  const create = exerciseRepo.create;
  const pagination = exerciseRepo.paggination;
  try {
    exerciseRepo.create = async ({ data }) => data;
    const result = await exerciseService.createExercise(coachId, input);
    assert.equal(String(result.createdBy), coachId);
    assert.equal(result.name, "Squat");
    exerciseRepo.paggination = async (args) => args;
    const list = await exerciseService.getExercises(2, 5);
    assert.equal(list.page, 2);
    assert.equal(list.limit, 5);
    assert.equal(list.filter.isArchived.$ne, true);
    const filtered = await exerciseService.getExercises(1, 10, "Legs");
    assert.equal(filtered.filter.muscleGroup.test("legs"), true);
    assert.equal(filtered.filter.muscleGroup.test("arms"), false);
    const partial = await exerciseService.getExercises(1, 10, "leg");
    assert.equal(partial.filter.muscleGroup.test("Legs"), true);
    const literal = await exerciseService.getExercises(1, 10, "Legs.*");
    assert.equal(literal.filter.muscleGroup.test("Legs and glutes"), false);
    const search = await exerciseService.searchExercises("squ", 1, 10);
    assert.equal(search.filter.name.test("Barbell Squat"), true);
    assert.equal(search.filter.name.test("Bench Press"), false);
    assert.equal(search.filter.isArchived.$ne, true);
    const literalSearch = await exerciseService.searchExercises(".*", 1, 10);
    assert.equal(literalSearch.filter.name.test("Barbell Squat"), false);
  } finally {
    exerciseRepo.create = create;
    exerciseRepo.paggination = pagination;
  }
});

test("update and archive target active exercises", async () => {
  const original = exerciseRepo.findOneAndUpdate;
  try {
    exerciseRepo.findOneAndUpdate = async (args) => {
      assert.equal(String(args.filter._id), coachId);
      assert.equal(args.filter.isArchived.$ne, true);
      assert.equal(args.options.runValidators, true);
      return args.update.$set;
    };
    assert.deepEqual(await exerciseService.updateExercise(coachId, { name: "Updated" }), { name: "Updated" });
    assert.deepEqual(await exerciseService.archiveExercise(coachId), { isArchived: true });
    exerciseRepo.findOneAndUpdate = async (args) => {
      assert.equal(String(args.filter._id), coachId);
      assert.equal(args.filter.isArchived, true);
      return args.update.$set;
    };
    assert.deepEqual(await exerciseService.unarchiveExercise(coachId), { isArchived: false });
    exerciseRepo.findOneAndUpdate = async () => null;
    await assert.rejects(exerciseService.updateExercise(coachId, { name: "Updated" }), { status: 404 });
    await assert.rejects(exerciseService.archiveExercise(coachId), { status: 404 });
    await assert.rejects(exerciseService.unarchiveExercise(coachId), { status: 404 });
  } finally { exerciseRepo.findOneAndUpdate = original; }
});
