import type { ApiGatewayResponse } from "../../auth/types.ts";
import type { MonitorReaderRepository } from "../../monitors/types.ts";

interface MonitorRequest {
  pathParameters?: Record<string, string | undefined> | null;
  requestContext?: {
    authorizer?: {
      claims?: Record<string, unknown>;
      jwt?: { claims?: Record<string, unknown> };
    };
  };
}

type RepositoryFactory = (tableName: string) => MonitorReaderRepository | Promise<MonitorReaderRepository>;
const headers = { "content-type": "application/json", "access-control-allow-origin": process.env.WEB_ORIGIN || "http://localhost:5173", "access-control-allow-headers": "Content-Type,Authorization", "access-control-allow-methods": "GET,POST,OPTIONS", "vary": "Origin" };
const env = process.env;

export async function handler(event: MonitorRequest): Promise<ApiGatewayResponse> {
  return handleGetMonitor(event, async (tableName) => {
    const { createDynamoDbMonitorRepository } = await import("../../monitors/dynamodb-repository.ts");
    return createDynamoDbMonitorRepository(tableName);
  });
}

export async function handleGetMonitor(
  event: MonitorRequest,
  repositoryFactory: RepositoryFactory,
): Promise<ApiGatewayResponse> {
  const claims = event.requestContext?.authorizer?.claims ?? event.requestContext?.authorizer?.jwt?.claims;
  const userId = typeof claims?.sub === "string" ? claims.sub : "";
  if (!userId) return response(401, { message: "Authentication is required." });

  const monitorId = event.pathParameters?.monitorId?.trim();
  if (!monitorId) return response(400, { message: "Monitor ID is required." });

  const tableName = env.MONITORS_TABLE_NAME;
  if (!tableName) return response(500, { message: "Monitor storage is not configured." });

  try {
    const monitor = await (await repositoryFactory(tableName)).getById(userId, monitorId);
    if (!monitor) return response(404, { message: "Monitor not found." });
    return response(200, monitor as unknown as Record<string, unknown>);
  } catch {
    return response(502, { message: "Unable to retrieve price monitor." });
  }
}

function response(statusCode: number, body: Record<string, unknown>): ApiGatewayResponse {
  return { statusCode, headers, body: JSON.stringify(body) };
}
