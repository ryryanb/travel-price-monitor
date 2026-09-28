import assert from "node:assert/strict";
import test from "node:test";
import { authenticateUser, validateLoginInput } from "../services/api/src/auth/login.ts";

test("normalizes a valid login input", () => {
  assert.deepEqual(validateLoginInput({ email: " User@Example.COM ", password: "password1" }), { email: "user@example.com", password: "password1" });
});
test("rejects an invalid email", () => assert.throws(() => validateLoginInput({ email: "not-an-email", password: "password1" }), /valid email/));
test("rejects a missing password", () => assert.throws(() => validateLoginInput({ email: "user@example.com", password: "" }), /Password is required/));
test("delegates valid credentials to Cognito", async () => {
  const calls: Array<{ email: string; password: string }> = [];
  const result = await authenticateUser({ email: "USER@example.com", password: "password1" }, {
    async authenticate(input) {
      calls.push(input);
      return { accessToken: "access-token", idToken: "id-token", refreshToken: "refresh-token", expiresIn: 3600, tokenType: "Bearer" };
    },
  });
  assert.deepEqual(calls, [{ email: "user@example.com", password: "password1" }]);
  assert.equal(result.accessToken, "access-token");
  assert.equal(result.expiresIn, 3600);
});
