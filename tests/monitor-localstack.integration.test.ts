import assert from "node:assert/strict";
import test from "node:test";
import {
  CreateTableCommand,
  DeleteTableCommand,
  DynamoDBClient,
  GetItemCommand,
  waitUntilTableExists,
} from "@aws-sdk/client-dynamodb";
import { handler } from "../services/api/src/handlers/monitors/create.ts";

const enabled = process.env.RUN_LOCALSTACK_INTEGRATION === "1";

test("creates a monitor and persists it to LocalStack DynamoDB", { skip: !enabled }, async () => {
  const endpoint = process.env.DYNAMODB_ENDPOINT_URL ?? "http://localhost:4566";
  const region = process.env.AWS_REGION ?? "ap-southeast-1";
  const tableName = `travel-price-monitor-monitors-it-${Date.now()}`;
  const originalEnv = {
    table: process.env.MONITORS_TABLE_NAME,
    endpoint: process.env.DYNAMODB_ENDPOINT_URL,
    region: process.env.AWS_REGION,
    accessKey: process.env.AWS_ACCESS_KEY_ID,
    secretKey: process.env.AWS_SECRET_ACCESS_KEY,
  };

  process.env.MONITORS_TABLE_NAME = tableName;
  process.env.DYNAMODB_ENDPOINT_URL = endpoint;
  process.env.AWS_REGION = region;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID ?? "test";
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY ?? "test";
  process.env.AWS_ACCESS_KEY_ID = accessKeyId;
  process.env.AWS_SECRET_ACCESS_KEY = secretAccessKey;

  const client = new DynamoDBClient({
    endpoint,
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
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
    await waitUntilTableExists({ client, maxWaitTime: 20 }, { TableName: tableName });

    const departureDate = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const response = await handler({
      body: JSON.stringify({
        origin: "MNL",
        destination: "NRT",
        departureDate,
        targetPrice: 500,
        currency: "USD",
      }),
      requestContext: { authorizer: { claims: { sub: "localstack-user-123" } } },
    });

    assert.equal(response.statusCode, 201, response.body);
    const monitor = JSON.parse(response.body) as {
      monitorId: string;
      userId: string;
      origin: string;
      destination: string;
      status: string;
      targetPrice: number;
      currency: string;
    };
    assert.ok(monitor.monitorId);
    assert.equal(monitor.userId, "localstack-user-123");
    assert.equal(monitor.status, "ACTIVE");

    const persisted = await client.send(new GetItemCommand({
      TableName: tableName,
      Key: {
        PK: { S: `USER#${monitor.userId}` },
        SK: { S: `MONITOR#${monitor.monitorId}` },
      },
      ConsistentRead: true,
    }));

    assert.equal(persisted.Item?.monitorId?.S, monitor.monitorId);
    assert.equal(persisted.Item?.userId?.S, "localstack-user-123");
    assert.equal(persisted.Item?.origin?.S, "MNL");
    assert.equal(persisted.Item?.destination?.S, "NRT");
    assert.equal(persisted.Item?.status?.S, "ACTIVE");
    assert.equal(persisted.Item?.targetPrice?.N, "500");
    assert.equal(persisted.Item?.currency?.S, "USD");
  } finally {
    try {
      await client.send(new DeleteTableCommand({ TableName: tableName }));
    } catch {
      // The table may not have been created if setup failed.
    }
    client.destroy();

    if (originalEnv.table === undefined) delete process.env.MONITORS_TABLE_NAME;
    else process.env.MONITORS_TABLE_NAME = originalEnv.table;
    if (originalEnv.endpoint === undefined) delete process.env.DYNAMODB_ENDPOINT_URL;
    else process.env.DYNAMODB_ENDPOINT_URL = originalEnv.endpoint;
    if (originalEnv.region === undefined) delete process.env.AWS_REGION;
    else process.env.AWS_REGION = originalEnv.region;
    if (originalEnv.accessKey === undefined) delete process.env.AWS_ACCESS_KEY_ID;
    else process.env.AWS_ACCESS_KEY_ID = originalEnv.accessKey;
    if (originalEnv.secretKey === undefined) delete process.env.AWS_SECRET_ACCESS_KEY;
    else process.env.AWS_SECRET_ACCESS_KEY = originalEnv.secretKey;
  }
});
