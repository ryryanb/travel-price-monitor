import { createCognitoRefreshClient } from "../../auth/cognito.ts";
import { refreshUserSession } from "../../auth/refresh.ts";
import type { ApiGatewayRequest, ApiGatewayResponse } from "../../auth/types.ts";

const headers = { "content-type": "application/json" };
const environment = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

export async function handler(event: ApiGatewayRequest): Promise<ApiGatewayResponse> {
  try {
    if (!event.body) return response(400, { message: "Request body is required." });

    const input = JSON.parse(event.body) as unknown;
    const clientId = environment.COGNITO_USER_POOL_CLIENT_ID;
    if (!clientId) return response(500, { message: "Authentication service is not configured." });

    const client = createCognitoRefreshClient(
      environment.COGNITO_REGION || environment.AWS_REGION || "ap-southeast-1",
      clientId,
      environment.COGNITO_ENDPOINT_URL || "",
    );
    const result = await refreshUserSession(input, client);

    return response(200, {
      accessToken: result.accessToken,
      idToken: result.idToken,
      expiresIn: result.expiresIn,
      tokenType: result.tokenType,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return response(400, { message: "Request body must be valid JSON." });
    }

    const name = error instanceof Error ? error.name : "";
    const message = error instanceof Error ? error.message : "";

    if (
      name === "NotAuthorizedException" ||
      name === "UserNotFoundException" ||
      name === "InvalidRefreshTokenException"
    ) {
      return response(401, { message: "Invalid or expired refresh token." });
    }

    if (name === "InvalidParameterException" || message.includes("Refresh token is required")) {
      return response(400, { message: message || "Invalid session refresh request." });
    }

    return response(502, { message: "Unable to refresh user session." });
  }
}

function response(statusCode: number, body: Record<string, unknown>): ApiGatewayResponse {
  return { statusCode, headers, body: JSON.stringify(body) };
}
