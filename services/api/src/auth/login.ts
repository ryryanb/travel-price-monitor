import type { AuthenticateUserInput, AuthenticateUserResult, CognitoAuthClient } from "./types.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLoginInput(input: unknown): AuthenticateUserInput {
  if (!input || typeof input !== "object") throw new Error("Request body must be a JSON object.");
  const value = input as Record<string, unknown>;
  const email = typeof value.email === "string" ? value.email.trim().toLowerCase() : "";
  const password = typeof value.password === "string" ? value.password : "";
  if (!EMAIL_PATTERN.test(email)) throw new Error("A valid email address is required.");
  if (!password) throw new Error("Password is required.");
  return { email, password };
}

export async function authenticateUser(input: unknown, client: CognitoAuthClient): Promise<AuthenticateUserResult> {
  return client.authenticate(validateLoginInput(input));
}
