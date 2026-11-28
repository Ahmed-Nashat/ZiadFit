import { test } from "node:test";
import assert from "node:assert/strict";
import { clientNameSearchSchema } from "../dist/src/modules/users/user.validation.js";
import { userService } from "../dist/src/modules/users/user.service.js";
import { userRepo } from "../dist/src/common/repo/user.repo.js";
import { userRouter } from "../dist/src/modules/users/user.controller.js";
import { roleBasedAccessMiddleware } from "../dist/src/common/middleware/authorization.js";
import { roleEnum } from "../dist/src/common/enums/role.enum.js";

test("name search validates and trims query values", () => {
  const schema = clientNameSearchSchema();
  assert.deepEqual(schema.parse({ query: { name: "  ah  " } }).query, { name: "ah", page: 1, limit: 10 });
  assert.equal(schema.safeParse({ query: { name: "  " } }).success, false);
  assert.equal(schema.safeParse({ query: { name: "ah", limit: "101" } }).success, false);
});

test("name search uses partial escaped terms and only returns clients", async () => {
  const original = userRepo.paggination;
  try {
    userRepo.paggination = async (args) => args;
    const result = await userService.searchClientsByName("ah ma", 2, 5);
    assert.equal(result.filter.role, roleEnum.client);
    assert.equal(result.page, 2);
    assert.equal(result.limit, 5);
    assert.equal(result.filter.$and[0].$or[0].firstName.test("Ahmed"), true);
    assert.equal(result.filter.$and[1].$or[1].lastName.test("Mahmoud"), true);
    const literal = await userService.searchClientsByName(".*", 1, 10);
    assert.equal(literal.filter.$and[0].$or[0].firstName.test("Ahmed"), false);
  } finally { userRepo.paggination = original; }
});

test("search route precedes the client id route and is coach-only", () => {
  const paths = userRouter.stack.filter((layer) => layer.route).map((layer) => layer.route.path);
  assert.ok(paths.indexOf("/clients/search") < paths.indexOf("/clients/:clientId"));
  const authorize = roleBasedAccessMiddleware([roleEnum.coach]);
  let called = false;
  authorize({ user: { role: roleEnum.coach } }, {}, () => { called = true; });
  assert.equal(called, true);
  assert.throws(() => authorize({ user: { role: roleEnum.client } }, {}, () => {}), { status: 403 });
});
