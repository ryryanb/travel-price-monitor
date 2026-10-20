import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import type { MonitorRepository, PriceMonitor } from "./types.ts";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "ap-southeast-1",
  ...(process.env.DYNAMODB_ENDPOINT_URL ? { endpoint: process.env.DYNAMODB_ENDPOINT_URL } : {}),
});

function stringValue(value: string) { return { S: value }; }

export function createDynamoDbMonitorRepository(tableName: string): MonitorRepository {
  return {
    async create(monitor: PriceMonitor): Promise<void> {
      await client.send(new PutItemCommand({
        TableName: tableName,
        Item: {
          PK: stringValue(`USER#${monitor.userId}`),
          SK: stringValue(`MONITOR#${monitor.monitorId}`),
          entityType: stringValue("PRICE_MONITOR"),
          monitorId: stringValue(monitor.monitorId),
          userId: stringValue(monitor.userId),
          origin: stringValue(monitor.origin),
          destination: stringValue(monitor.destination),
          departureDate: stringValue(monitor.departureDate),
          ...(monitor.returnDate ? { returnDate: stringValue(monitor.returnDate) } : {}),
          targetPrice: { N: String(monitor.targetPrice) },
          currency: stringValue(monitor.currency),
          status: stringValue(monitor.status),
          createdAt: stringValue(monitor.createdAt),
          updatedAt: stringValue(monitor.updatedAt),
        },
        ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
      }));
    },
  };
}
