import { createCognitoSignUpClient } from "../../auth/cognito.js";
import { registerUser } from "../../auth/register.js";
import type { ApiGatewayRequest, ApiGatewayResponse } from "../../auth/types.js";

const headers = { "content-type": "application/json" };

export async function handler(event: ApiGatewayRequest): Promise<ApiGatewayResponse> {
  try {
    if (!event.body) return response(400, { message: "Request body is required." });
    const input = JSON.parse(event.body) as unknown;
    const clientId = process.env.COGNITO_USER_POOL_CLIENT_ID;
    if (!clientId) return response(500, { message: "Authentication service is not configured." });
    const client = createCognitoSignUpClient(
      process.env.COGNITO_REGION || process.env.AWS_REGION || "ap-southeast-1",
      clientId,
      process.env.COGNITO_ENDPOINT_URL || "",
    );
    const result = await registerUser(input, client);
    return response(201, { userId: result.userSub, userConfirmed: result.userConfirmed, ...(result.codeDelivery ? { codeDelivery: result.codeDelivery } : {}) });
  } catch (error) {
    if (error instanceof SyntaxError) return response(400, { message: "Request body must be valid JSON." });
    const name = error instanceof Error ? error.name : "";
    const message = error instanceof Error ? error.message : "Unable to register user.";
    if (name === "UsernameExistsException") return response(409, { message: "An account with this email already exists." });
    if (name === "InvalidPasswordException" || name === "InvalidParameterException" || message.includes("valid email") || message.includes("Password must")) return response(400, { message });
    return response(502, { message: "Unable to register user." });
  }
}

function response(statusCode: number, body: Record<string, unknown>): ApiGatewayResponse {
  return { statusCode, headers, body: JSON.stringify(body) };
}
