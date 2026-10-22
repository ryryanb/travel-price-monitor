import { createPriceMonitor, MonitorValidationError, validateCreateMonitorInput } from "../../monitors/create.ts";
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

type RepositoryFactory = (tableName: string) => MonitorRepository | Promise<MonitorRepository>;
const headers = { "content-type": "application/json", "access-control-allow-origin": process.env.WEB_ORIGIN || "http://localhost:5173", "access-control-allow-headers": "Content-Type,Authorization", "access-control-allow-methods": "GET,POST,OPTIONS", "vary": "Origin" };
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

  // Validate all user-provided criteria before initializing storage or attempting persistence.
  let validInput: ReturnType<typeof validateCreateMonitorInput>;
  try {
    validInput = validateCreateMonitorInput(input);
  } catch (error) {
    if (error instanceof MonitorValidationError) return response(400, { message: error.message });
    return response(500, { message: "Unable to validate price monitor criteria." });
  }

  const tableName = env.MONITORS_TABLE_NAME;
  if (!tableName) return response(500, { message: "Monitor storage is not configured." });

  try {
    const repository = await repositoryFactory(tableName);
    const monitor = await createPriceMonitor(validInput, userId, repository);
    return response(201, monitor as unknown as Record<string, unknown>);
  } catch {
    return response(502, { message: "Unable to create price monitor." });
  }
}

function response(statusCode: number, body: Record<string, unknown>): ApiGatewayResponse {
  return { statusCode, headers, body: JSON.stringify(body) };
}
