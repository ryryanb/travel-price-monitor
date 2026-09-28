import assert from "node:assert/strict";
import test from "node:test";
import { registerUser, validateRegisterInput } from "../services/api/src/auth/register.js";

test("normalizes a valid registration input", () => {
  assert.deepEqual(validateRegisterInput({ email: " User@Example.COM ", password: "password1" }), { email: "user@example.com", password: "password1" });
});

test("rejects an invalid email", () => {
  assert.throws(() => validateRegisterInput({ email: "not-an-email", password: "password1" }), /valid email/);
});

test("rejects a password shorter than eight characters", () => {
  assert.throws(() => validateRegisterInput({ email: "user@example.com", password: "short" }), /at least 8 characters/);
});

test("delegates a valid registration to Cognito client", async () => {
  const calls: Array<{ email: string; password: string }> = [];
  const result = await registerUser({ email: "USER@example.com", password: "password1" }, {
    async signUp(input) { calls.push(input); return { userSub: "user-sub", userConfirmed: false, codeDelivery: { deliveryMedium: "EMAIL" } }; },
  });
  assert.deepEqual(calls, [{ email: "user@example.com", password: "password1" }]);
  assert.equal(result.userSub, "user-sub");
});
