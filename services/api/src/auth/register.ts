import type { CognitoSignUpClient, RegisterUserInput, RegisterUserResult } from "./types.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegisterInput(input: unknown): RegisterUserInput {
  if (!input || typeof input !== "object") throw new Error("Request body must be a JSON object.");
  const value = input as Record<string, unknown>;
  const email = typeof value.email === "string" ? value.email.trim().toLowerCase() : "";
  const password = typeof value.password === "string" ? value.password : "";
  if (!EMAIL_PATTERN.test(email)) throw new Error("A valid email address is required.");
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");
  return { email, password };
}

export async function registerUser(input: unknown, client: CognitoSignUpClient): Promise<RegisterUserResult> {
  return client.signUp(validateRegisterInput(input));
}
