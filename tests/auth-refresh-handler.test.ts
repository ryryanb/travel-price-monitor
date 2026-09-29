import assert from "node:assert/strict";
import test from "node:test";
import { handler } from "../services/api/src/handlers/auth/refresh.ts";

const originalFetch = globalThis.fetch;

function setCognitoResponse(status: number, body: unknown): void {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    })) as typeof fetch;
}

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.COGNITO_USER_POOL_CLIENT_ID;
  delete process.env.COGNITO_REGION;
  delete process.env.COGNITO_ENDPOINT_URL;
});

test("refresh handler returns new tokens for a valid refresh token", async () => {
  process.env.COGNITO_USER_POOL_CLIENT_ID = "client-id";
  process.env.COGNITO_REGION = "ap-southeast-1";
  setCognitoResponse(200, {
    AuthenticationResult: {
      AccessToken: "new-access-token",
      IdToken: "new-id-token",
      ExpiresIn: 3600,
      TokenType: "Bearer",
    },
  });

  const response = await handler({
    body: JSON.stringify({ refreshToken: "refresh-token" }),
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), {
    accessToken: "new-access-token",
    idToken: "new-id-token",
    expiresIn: 3600,
    tokenType: "Bearer",
  });
});

test("refresh handler rejects a missing request body", async () => {
  const response = await handler({ body: null });

  assert.equal(response.statusCode, 400);
  assert.deepEqual(JSON.parse(response.body), {
    message: "Request body is required.",
  });
});

test("refresh handler rejects malformed JSON", async () => {
  const response = await handler({ body: "not-json" });

  assert.equal(response.statusCode, 400);
  assert.deepEqual(JSON.parse(response.body), {
    message: "Request body must be valid JSON.",
  });
});

test("refresh handler rejects a missing refresh token", async () => {
  process.env.COGNITO_USER_POOL_CLIENT_ID = "client-id";

  const response = await handler({
    body: JSON.stringify({}),
  });

  assert.equal(response.statusCode, 400);
  assert.deepEqual(JSON.parse(response.body), {
    message: "Refresh token is required.",
  });
});

test("refresh handler returns 401 for an invalid refresh token", async () => {
  process.env.COGNITO_USER_POOL_CLIENT_ID = "client-id";
  setCognitoResponse(400, {
    __type: "NotAuthorizedException",
    message: "Refresh Token has expired",
  });

  const response = await handler({
    body: JSON.stringify({ refreshToken: "expired-token" }),
  });

  assert.equal(response.statusCode, 401);
  assert.deepEqual(JSON.parse(response.body), {
    message: "Invalid or expired refresh token.",
  });
});

test("refresh handler returns 500 when Cognito is not configured", async () => {
  const response = await handler({
    body: JSON.stringify({ refreshToken: "refresh-token" }),
  });

  assert.equal(response.statusCode, 500);
  assert.deepEqual(JSON.parse(response.body), {
    message: "Authentication service is not configured.",
  });
});

test("refresh handler returns 502 for an unexpected Cognito failure", async () => {
  process.env.COGNITO_USER_POOL_CLIENT_ID = "client-id";
  setCognitoResponse(500, {
    __type: "InternalErrorException",
    message: "Unexpected failure",
  });

  const response = await handler({
    body: JSON.stringify({ refreshToken: "refresh-token" }),
  });

  assert.equal(response.statusCode, 502);
  assert.deepEqual(JSON.parse(response.body), {
    message: "Unable to refresh user session.",
  });
});
