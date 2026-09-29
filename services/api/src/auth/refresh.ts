import type { CognitoRefreshClient, RefreshUserInput, RefreshUserResult } from "./types.js";

export function validateRefreshInput(input: unknown): RefreshUserInput {
  if (!input || typeof input !== "object") {
    throw new Error("Request body must be a JSON object.");
  }

  const value = input as Record<string, unknown>;
  const refreshToken = typeof value.refreshToken === "string" ? value.refreshToken.trim() : "";

  if (!refreshToken) {
    throw new Error("Refresh token is required.");
  }

  return { refreshToken };
}

export async function refreshUserSession(
  input: unknown,
  client: CognitoRefreshClient,
): Promise<RefreshUserResult> {
  return client.refresh(validateRefreshInput(input));
}
