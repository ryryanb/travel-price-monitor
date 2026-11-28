import type { ApiGatewayResponse } from "../../auth/types.ts";
import type { MonitorListRepository } from "../../monitors/types.ts";

interface MonitorRequest {
  requestContext?: {
    authorizer?: {
      claims?: Record<string, unknown>;
      jwt?: { claims?: Record<string, unknown> };
    };
  };
}

type RepositoryFactory = (tableName: string) => MonitorListRepository | Promise<MonitorListRepository>;
const headers = {
  "content-type": "application/json",
  "access-control-allow-origin": process.env.WEB_ORIGIN || "http://localhost:5173",
  "access-control-allow-headers": "Content-Type,Authorization",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "vary": "Origin",
};
const env = process.env;

export async function handler(event: MonitorRequest): Promise<ApiGatewayResponse> {
  return handleListMonitors(event, async (tableName) => {
    const { createDynamoDbMonitorRepository } = await import("../../monitors/dynamodb-repository.ts");
    return createDynamoDbMonitorRepository(tableName);
  });
}

export async function handleListMonitors(
  event: MonitorRequest,
  repositoryFactory: RepositoryFactory,
): Promise<ApiGatewayResponse> {
  const claims = event.requestContext?.authorizer?.claims ?? event.requestContext?.authorizer?.jwt?.claims;
  const userId = env.LOCAL_AUTH_DISABLED === "true"
    ? "local-dev-user"
    : typeof claims?.sub === "string" ? claims.sub : "";
  if (!userId) return response(401, { message: "Authentication is required." });

  const tableName = env.MONITORS_TABLE_NAME;
  if (!tableName) return response(500, { message: "Monitor storage is not configured." });

  try {
    const monitors = await (await repositoryFactory(tableName)).listByUser(userId);
    return response(200, { monitors });
  } catch {
    return response(502, { message: "Unable to list price monitors." });
  }
}

function response(statusCode: number, body: Record<string, unknown>): ApiGatewayResponse {
  return { statusCode, headers, body: JSON.stringify(body) };
}
