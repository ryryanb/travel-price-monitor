import { DynamoDBClient, GetItemCommand, PutItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import type { AttributeValue } from "@aws-sdk/client-dynamodb";
import type { MonitorListRepository, MonitorReaderRepository, MonitorRepository, PriceMonitor } from "./types.ts";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "ap-southeast-1",
  ...(process.env.DYNAMODB_ENDPOINT_URL ? { endpoint: process.env.DYNAMODB_ENDPOINT_URL } : {}),
});

function stringValue(value: string) { return { S: value }; }

function readMonitor(item: Record<string, AttributeValue>): PriceMonitor {
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
  // Support monitors created before MON-006 and MON-009.
  const passengerCount = readNumber("passengerCount") ?? 1;
  const targetPrice = readNumber("targetPrice");
  const currency = readString("currency");
  const status = readString("status");
  const createdAt = readString("createdAt");
  const updatedAt = readString("updatedAt");
  if (!storedMonitorId || !storedUserId || !origin || !destination || !departureDate ||
      !Number.isInteger(passengerCount) || passengerCount < 1 || passengerCount > 9 ||
      targetPrice === undefined || !Number.isFinite(targetPrice) || !currency ||
      (status !== "ACTIVE" && status !== "PAUSED") || !createdAt || !updatedAt) {
    throw new Error("Stored monitor record is invalid.");
  }
  const returnDate = readString("returnDate");
  return {
    monitorId: storedMonitorId,
    userId: storedUserId,
    name: readString("name") || `${origin} → ${destination} (${departureDate})`,
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
}

export function createDynamoDbMonitorRepository(tableName: string): MonitorRepository & MonitorReaderRepository & MonitorListRepository {
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
      if (!result.Item) return undefined;
      const monitor = readMonitor(result.Item);
      if (monitor.userId !== userId) throw new Error("Stored monitor owner is invalid.");
      return monitor;
    },,
    
    async listByUser(userId: string): Promise<PriceMonitor[]> {
      const monitors: PriceMonitor[] = [];
      let nextKey: Record<string, AttributeValue> | undefined;
      do {
        // Query just this user's monitor sort keys, never scan the table.
        const page = await client.send(new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: "PK = :user AND begins_with(SK, :monitor)",
          ExpressionAttributeValues: {
            ":user": stringValue(`USER#${userId}`),
            ":monitor": stringValue("MONITOR#"),
          },
          ConsistentRead: true,
          ...(nextKey ? { ExclusiveStartKey: nextKey } : {}),
        }));
        for (const item of page.Items ?? []) {
          const monitor = readMonitor(item);
          if (monitor.userId !== userId) throw new Error("Stored monitor owner is invalid.");
          monitors.push(monitor);
        }
        nextKey = page.LastEvaluatedKey;
      } while (nextKey && Object.keys(nextKey).length > 0);

      return monitors.sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt) || a.monitorId.localeCompare(b.monitorId)
      );
    }
  };
}
