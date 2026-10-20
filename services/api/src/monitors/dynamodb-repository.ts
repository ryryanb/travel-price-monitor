import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { MonitorRepository, PriceMonitor } from "./types.ts";

const region = process.env.AWS_REGION || "ap-southeast-1";
const client = DynamoDBDocumentClient.from(new DynamoDBClient({
  region,
  ...(process.env.DYNAMODB_ENDPOINT_URL ? { endpoint: process.env.DYNAMODB_ENDPOINT_URL } : {}),
}));

export function createDynamoDbMonitorRepository(tableName: string): MonitorRepository {
  return {
    async create(monitor: PriceMonitor): Promise<void> {
      await client.send(new PutCommand({
        TableName: tableName,
        Item: {
          ...monitor,
          PK: `USER#${monitor.userId}`,
          SK: `MONITOR#${monitor.monitorId}`,
          entityType: "PRICE_MONITOR",
        },
        ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
      }));
    },
  };
}
