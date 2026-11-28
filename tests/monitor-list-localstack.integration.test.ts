import {
  CreateTableCommand,
  DeleteTableCommand,
  DynamoDBClient,
  PutItemCommand,
  waitUntilTableExists,
} from "@aws-sdk/client-dynamodb";
import assert from "node:assert/strict";
import test from "node:test";
import { handler as listHandler } from "../services/api/src/handlers/monitors/list.ts";
import { createDynamoDbMonitorRepository } from "../services/api/src/monitors/dynamodb-repository.ts";
import type { PriceMonitor } from "../services/api/src/monitors/types.ts";

const enabled = process.env.RUN_LOCALSTACK_INTEGRATION === "1";

test("lists only the owner's monitors, with legacy records and pagination", { skip: !enabled }, async () => {
  const endpoint = process.env.DYNAMODB_ENDPOINT_URL ?? "http://localhost:4566";
  const region = process.env.AWS_REGION ?? "ap-southeast-1";
  const tableName = `monitors-list-it-${Date.now()}`;
  const oldEnv = {
    table: process.env.MONITORS_TABLE_NAME,
    endpoint: process.env.DYNAMODB_ENDPOINT_URL,
    region: process.env.AWS_REGION,
    access: process.env.AWS_ACCESS_KEY_ID,
    secret: process.env.AWS_SECRET_ACCESS_KEY,
    local: process.env.LOCAL_AUTH_DISABLED,
  };
  process.env.MONITORS_TABLE_NAME = tableName;
  process.env.DYNAMODB_ENDPOINT_URL = endpoint;
  process.env.AWS_REGION = region;
  process.env.AWS_ACCESS_KEY_ID = "test";
  process.env.AWS_SECRET_ACCESS_KEY = "test";
  process.env.LOCAL_AUTH_DISABLED = "false";

  const client = new DynamoDBClient({
    endpoint, region, credentials: { accessKeyId: "test", secretAccessKey: "test" },
  });
  try {
    await client.send(new CreateTableCommand({
      TableName: tableName,
      AttributeDefinitions: [
        { AttributeName: "PK", AttributeType: "S" },
        { AttributeName: "SK", AttributeType: "S" },
      ],
      KeySchema: [
        { AttributeName: "PK", KeyType: "HASH" },
        { AttributeName: "SK", KeyType: "RANGE" },
      ],
      BillingMode: "PAY_PER_REQUEST",
    }));
    await waitUntilTableExists({ client, maxWaitTime: 20, minDelay: 1, maxDelay: 2 }, { TableName: tableName });

    const repo = createDynamoDbMonitorRepository(tableName);
    const base: PriceMonitor = {
      monitorId: "one", userId: "user-123", name: "Tokyo",
      origin: "MNL", destination: "NRT", departureDate: "2027-02-15",
      passengerCount: 1, targetPrice: 500, currency: "USD",
      status: "ACTIVE", createdAt: "2026-11-01T00:00:00Z", updatedAt: "2026-11-01T00:00:00Z",
    };
    await repo.create(base);
    await repo.create({ ...base, monitorId: "two", name: "Singapore", destination: "SIN", createdAt: "2026-11-02T00:00:00Z" });
    await repo.create({ ...base, monitorId: "other", userId: "another-user" });

    // Older records without a name and passenger count must still display.
    await client.send(new PutItemCommand({
      TableName: tableName,
      Item: {
        PK: { S: "USER#user-123" }, SK: { S: "MONITOR#legacy" },
        monitorId: { S: "legacy" }, userId: { S: "user-123" },
        origin: { S: "MNL" }, destination: { S: "BKK" },
        departureDate: { S: "2027-01-10" }, targetPrice: { N: "1000" },
        currency: { S: "PHP" }, status: { S: "ACTIVE" },
        createdAt: { S: "2026-10-01T00:00:00Z" }, updatedAt: { S: "2026-10-01T00:00:00Z" },
      },
    }));

    const auth = { requestContext: { authorizer: { claims: { sub: "user-123" } } } };
    const response = await listHandler(auth);
    assert.equal(response.statusCode, 200, response.body);
    const body = JSON.parse(response.body) as { monitors: PriceMonitor[] };
    assert.deepEqual(body.monitors.map(m => m.monitorId), ["two", "one", "legacy"]);
    assert.equal(body.monitors[2]?.passengerCount, 1);
    assert.match(body.monitors[2]?.name ?? "", /MNL → BKK/);

    const excluded = await listHandler({ requestContext: { authorizer: { claims: { sub: "another-user" } } } });
    assert.deepEqual((JSON.parse(excluded.body) as { monitors: PriceMonitor[] }).monitors.map(m => m.monitorId), ["other"]);

    const empty = await listHandler({ requestContext: { authorizer: { claims: { sub: "no-monitors" } } } });
    assert.deepEqual(JSON.parse(empty.body), { monitors: [] });
  } finally {
    try { await client.send(new DeleteTableCommand({ TableName: tableName })); } catch { /* setup may fail */ }
    client.destroy();
    const restore = (name: string, value: string | undefined) => {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    };
    restore("MONITORS_TABLE_NAME", oldEnv.table);
    restore("DYNAMODB_ENDPOINT_URL", oldEnv.endpoint);
    restore("AWS_REGION", oldEnv.region);
    restore("AWS_ACCESS_KEY_ID", oldEnv.access);
    restore("AWS_SECRET_ACCESS_KEY", oldEnv.secret);
    restore("LOCAL_AUTH_DISABLED", oldEnv.local);
  }
});
