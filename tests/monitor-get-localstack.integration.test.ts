
import {
    CreateTableCommand,
    DeleteTableCommand,
    DynamoDBClient,
    waitUntilTableExists,
} from "@aws-sdk/client-dynamodb";
import assert from "node:assert/strict";
import test from "node:test";
import { handler as createHandler } from "../services/api/src/handlers/monitors/create.ts";
import { handler as getHandler } from "../services/api/src/handlers/monitors/get.ts";

const enabled = process.env.RUN_LOCALSTACK_INTEGRATION === "1";

test("creates and retrieves a monitor through LocalStack DynamoDB", { skip: !enabled }, async () => {
  const endpoint = process.env.DYNAMODB_ENDPOINT_URL ?? "http://localhost:4566";
  const region = process.env.AWS_REGION ?? "ap-southeast-1";
  const tableName = `monitors-view-it-${Date.now()}`;
  const userId = "localstack-user-123";

  process.env.MONITORS_TABLE_NAME = tableName;
  process.env.DYNAMODB_ENDPOINT_URL = endpoint;
  process.env.AWS_REGION = region;
  process.env.AWS_ACCESS_KEY_ID = "test";
  process.env.AWS_SECRET_ACCESS_KEY = "test";

  const client = new DynamoDBClient({
    endpoint,
    region,
    credentials: {
      accessKeyId: "test",
      secretAccessKey: "test",
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

    await waitUntilTableExists(
      { client, maxWaitTime: 20, minDelay: 1, maxDelay: 2 },
      { TableName: tableName },
    );

    const departureDate = new Date(Date.now() + 30 * 86400000)
      .toISOString()
      .slice(0, 10);

    const created = await createHandler({
      body: JSON.stringify({
        origin: "MNL",
        destination: "NRT",
        departureDate,
        returnDate: new Date(Date.now() + 37 * 86400000)
          .toISOString()
          .slice(0, 10),
        targetPrice: 500,
        currency: "USD",
      }),
      requestContext: { authorizer: { claims: { sub: userId } } },
    });

    assert.equal(created.statusCode, 201, created.body);
    const monitor = JSON.parse(created.body);

    const retrieved = await getHandler({
      pathParameters: { monitorId: monitor.monitorId },
      requestContext: { authorizer: { claims: { sub: userId } } },
    });

    assert.equal(retrieved.statusCode, 200, retrieved.body);
    assert.deepEqual(JSON.parse(retrieved.body), monitor);

    const otherUser = await getHandler({
      pathParameters: { monitorId: monitor.monitorId },
      requestContext: {
        authorizer: { claims: { sub: "another-user" } },
      },
    });

    assert.equal(otherUser.statusCode, 404);
  } finally {
    try {
      await client.send(new DeleteTableCommand({ TableName: tableName }));
    } catch {
      // The table may not exist if setup failed.
    }
    client.destroy();
  }
});
