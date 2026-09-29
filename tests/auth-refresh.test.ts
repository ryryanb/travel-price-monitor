import assert from "node:assert/strict";
import test from "node:test";
import { refreshUserSession, validateRefreshInput } from "../services/api/src/auth/refresh.ts";

test("accepts and trims a refresh token", () => {
  assert.deepEqual(
    validateRefreshInput({ refreshToken: "  refresh-token  " }),
    { refreshToken: "refresh-token" },
  );
});

test("rejects a missing refresh token", () => {
  assert.throws(
    () => validateRefreshInput({ refreshToken: "" }),
    /Refresh token is required/,
  );
});

test("delegates a valid refresh request to Cognito", async () => {
  const calls: string[] = [];
  const result = await refreshUserSession({ refreshToken: "refresh-token" }, {
    async refresh(input) {
      calls.push(input.refreshToken);
      return {
        accessToken: "new-access-token",
        idToken: "new-id-token",
        expiresIn: 3600,
        tokenType: "Bearer",
      };
    },
  });

  assert.deepEqual(calls, ["refresh-token"]);
  assert.equal(result.accessToken, "new-access-token");
  assert.equal(result.idToken, "new-id-token");
  assert.equal(result.expiresIn, 3600);
});
