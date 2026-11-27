import { test } from "node:test";
import assert from "node:assert/strict";
import { questionnaireService } from "../dist/src/modules/questionnaires/questionnaire.service.js";
import { questionnaireSubmissionSchema } from "../dist/src/modules/questionnaires/questionnaire.validation.js";
import { userRepo } from "../dist/src/common/repo/user.repo.js";
import { questionnaireRepo } from "../dist/src/common/repo/questionnaire.repo.js";

const answers = {
  primaryGoal: "Lose fat", heightCm: 175, weightKg: 105,
  energyLevel: 5, stress: "Good", smoking: "No", medicalHistory: "None",
  trainingExp: "One year", trainingDaysPerWeek: 5, sessionDurationMinutes: 90,
  availableEquipment: "Gym", injuriesOrRestrictions: "None", sleepHours: 7,
  preferredPlan: "One month",
};

test("submission validates assessment answers and rejects client-supplied identities", () => {
  const schema = questionnaireSubmissionSchema();
  assert.equal(schema.safeParse({ body: { answers } }).success, true);
  assert.equal(schema.safeParse({ body: { answers: { ...answers, energyLevel: 11 } } }).success, false);
  assert.equal(schema.safeParse({ body: { answers, clientId: "other" } }).success, false);
  assert.equal(schema.safeParse({ body: { answers: { ...answers, medicalHistory: "" } } }).success, false);
});

test("only a verified client can submit and ownership comes from the authenticated ID", async () => {
  const find = userRepo.findOne;
  const create = questionnaireRepo.createSubmission;
  const clientId = "507f1f77bcf86cd799439011";
  let submitted = false;
  try {
    questionnaireRepo.createSubmission = async ({ clientId: id }) => {
      submitted = true;
      assert.equal(String(id), clientId);
      return { _id: id, status: "pending", submittedAt: new Date() };
    };
    userRepo.findOne = async () => null;
    await assert.rejects(questionnaireService.submitQuestionnaire({ clientId, answers }), { status: 403 });
    userRepo.findOne = async () => ({ emailVerifiedAt: null });
    await assert.rejects(questionnaireService.submitQuestionnaire({ clientId, answers }), { status: 403 });
    assert.equal(submitted, false);
    userRepo.findOne = async ({ filter }) => {
      assert.equal(filter.role, 0);
      assert.equal(String(filter._id), clientId);
      return { emailVerifiedAt: new Date() };
    };
    const result = await questionnaireService.submitQuestionnaire({ clientId, answers });
    assert.equal(result.status, "pending");
    assert.equal(submitted, true);
  } finally {
    userRepo.findOne = find;
    questionnaireRepo.createSubmission = create;
  }
});
