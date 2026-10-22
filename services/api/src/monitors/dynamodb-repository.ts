import { DynamoDBClient, GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
import type { MonitorReaderRepository, MonitorRepository, PriceMonitor } from "./types.ts";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "ap-southeast-1",
  ...(process.env.DYNAMODB_ENDPOINT_URL ? { endpoint: process.env.DYNAMODB_ENDPOINT_URL } : {}),
});

function stringValue(value: string) { return { S: value }; }

export function createDynamoDbMonitorRepository(tableName: string): MonitorRepository & MonitorReaderRepository {
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
          name: stringValue(monitor.name),
          origin: stringValue(monitor.origin),
          destination: stringValue(monitor.destination),
          departureDate: stringValue(monitor.departureDate),
          ...(monitor.returnDate ? { returnDate: stringValue(monitor.returnDate) } : {}),
          passengerCount: { N: String(monitor.passengerCount) },
          targetPrice: { N: String(monitor.targetPrice) },
          currency: stringValue(monitor.currency),
          status: stringValue(monitor.status),
          createdAt: stringValue(monitor.createdAt),
          updatedAt: stringValue(monitor.updatedAt),
        },
        ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
      }));
    },

    async getById(userId: string, monitorId: string): Promise<PriceMonitor | undefined> {
      const result = await client.send(new GetItemCommand({
        TableName: tableName,
        Key: {
          PK: stringValue(`USER#${userId}`),
          SK: stringValue(`MONITOR#${monitorId}`),
        },
        ConsistentRead: true,
      }));
      const item = result.Item;
      if (!item) return undefined;
      const readString = (name: string): string | undefined => item[name]?.S;
      const readNumber = (name: string): number | undefined => {
        const value = item[name]?.N;
        return value === undefined ? undefined : Number(value);
      };
      const storedMonitorId = readString("monitorId");
      const storedUserId = readString("userId");
      const origin = readString("origin");
      const destination = readString("destination");
      const departureDate = readString("departureDate");
      // Older records predate MON-006; treat them as single-passenger monitors.
      const passengerCount = readNumber("passengerCount") ?? 1;
      const targetPrice = readNumber("targetPrice");
      const currency = readString("currency");
      const status = readString("status");
      const createdAt = readString("createdAt");
      const updatedAt = readString("updatedAt");
      if (!storedMonitorId || !storedUserId || !origin || !destination || !departureDate ||
          !Number.isInteger(passengerCount) || passengerCount < 1 || passengerCount > 9 ||
          targetPrice === undefined || !currency || (status !== "ACTIVE" && status !== "PAUSED") ||
          !createdAt || !updatedAt) {
        throw new Error("Stored monitor record is invalid.");
      }
      const returnDate = readString("returnDate");
      // Preserve compatibility with monitors created before MON-009.
      const name = readString("name") || `${origin} → ${destination} (${departureDate})`;
      return {
        monitorId: storedMonitorId,
        userId: storedUserId,
        name,
        origin,
        destination,
        departureDate,
        ...(returnDate ? { returnDate } : {}),
        passengerCount,
        targetPrice,
        currency,
        status,
        createdAt,
        updatedAt,
      };
    },
  };
}
