import { createPriceMonitor } from "../../monitors/create.ts";
import type { MonitorRepository } from "../../monitors/types.ts";
import type { ApiGatewayResponse } from "../../auth/types.ts";

interface MonitorRequest {
  body?: string | null;
  requestContext?: {
    authorizer?: {
      claims?: Record<string, unknown>;
      jwt?: { claims?: Record<string, unknown> };
    };
  };
}

type RepositoryFactory = (tableName: string) => MonitorRepository;
const headers = { "content-type": "application/json" };
const env = process.env;

export async function handler(event: MonitorRequest): Promise<ApiGatewayResponse> {
  return handleCreateMonitor(event, async (tableName) => {
    const { createDynamoDbMonitorRepository } = await import("../../monitors/dynamodb-repository.ts");
    return createDynamoDbMonitorRepository(tableName);
  });
}

export async function handleCreateMonitor(
  event: MonitorRequest,
  repositoryFactory: RepositoryFactory,
): Promise<ApiGatewayResponse> {
  try {
    if (!event.body) return response(400, { message: "Request body is required." });
    let input: unknown;
    try {
      input = JSON.parse(event.body) as unknown;
    } catch {
      return response(400, { message: "Request body must be valid JSON." });
    }

    const claims = event.requestContext?.authorizer?.claims ?? event.requestContext?.authorizer?.jwt?.claims;
    const userId = typeof claims?.sub === "string" ? claims.sub : "";
    if (!userId) return response(401, { message: "Authentication is required." });

    const tableName = env.MONITORS_TABLE_NAME;
    if (!tableName) return response(500, { message: "Monitor storage is not configured." });

    const monitor = await createPriceMonitor(input, userId, repositoryFactory(tableName));
    return response(201, monitor);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (
      message.startsWith("Origin must") ||
      message.startsWith("Destination must") ||
      message.startsWith("Departure date") ||
      message.startsWith("Return date") ||
      message.startsWith("Target price") ||
      message.startsWith("Currency must") ||
      message === "Origin and destination must be different." ||
      message === "Request body must be a JSON object."
    ) return response(400, { message });
    return response(502, { message: "Unable to create price monitor." });
  }
}

function response(statusCode: number, body: Record<string, unknown>): ApiGatewayResponse {
  return { statusCode, headers, body: JSON.stringify(body) };
}
