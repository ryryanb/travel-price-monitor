import assert from "node:assert/strict";
import test from "node:test";
import { handleGetMonitor } from "../services/api/src/handlers/monitors/get.ts";
import type { MonitorReaderRepository, PriceMonitor } from "../services/api/src/monitors/types.ts";

const originalTableName = process.env.MONITORS_TABLE_NAME;
const monitor: PriceMonitor = {
  monitorId: "monitor-123",
  userId: "user-123",
  name: "Tokyo Winter Trip",
  origin: "MNL",
  destination: "NRT",
  departureDate: "2027-02-15",
  returnDate: "2027-02-22",
  passengerCount: 1,
  targetPrice: 500,
  currency: "USD",
  status: "ACTIVE",
  createdAt: "2026-10-20T12:00:00.000Z",
  updatedAt: "2026-10-20T12:00:00.000Z",
};
const authenticated = { requestContext: { authorizer: { claims: { sub: "user-123" } } } };

test.afterEach(() => {
  if (originalTableName === undefined) delete process.env.MONITORS_TABLE_NAME;
  else process.env.MONITORS_TABLE_NAME = originalTableName;
});

test("returns monitor details for its authenticated owner", async () => {
  process.env.MONITORS_TABLE_NAME = "monitors";
  let requestedUser = "";
  let requestedId = "";
  let requestedTable = "";
  const repository: MonitorReaderRepository = {
    async getById(userId, monitorId) {
      requestedUser = userId;
      requestedId = monitorId;
      return monitor;
    },
  };
  const response = await handleGetMonitor({
    ...authenticated,
    pathParameters: { monitorId: monitor.monitorId },
  }, (tableName) => { requestedTable = tableName; return repository; });

  assert.equal(response.statusCode, 200);
  assert.equal(requestedUser, "user-123");
  assert.equal(requestedId, "monitor-123");
  assert.equal(requestedTable, "monitors");
  assert.deepEqual(JSON.parse(response.body), monitor);
});

test("requires authentication", async () => {
  process.env.MONITORS_TABLE_NAME = "monitors";
  const response = await handleGetMonitor({ pathParameters: { monitorId: "monitor-123" } }, () => {
    throw new Error("Repository must not be created");
  });
  assert.equal(response.statusCode, 401);
});

test("requires a monitor ID", async () => {
  process.env.MONITORS_TABLE_NAME = "monitors";
  const response = await handleGetMonitor(authenticated, () => ({ async getById() { return undefined; } }));
  assert.equal(response.statusCode, 400);
});

test("returns 404 when the monitor does not exist", async () => {
  process.env.MONITORS_TABLE_NAME = "monitors";
  const response = await handleGetMonitor({
    ...authenticated,
    pathParameters: { monitorId: "missing" },
  }, () => ({ async getById() { return undefined; } }));
  assert.equal(response.statusCode, 404);
});

test("returns 500 when storage is not configured", async () => {
  delete process.env.MONITORS_TABLE_NAME;
  const response = await handleGetMonitor({
    ...authenticated,
    pathParameters: { monitorId: "monitor-123" },
  }, () => ({ async getById() { return undefined; } }));
  assert.equal(response.statusCode, 500);
});

test("returns a generic error when storage fails", async () => {
  process.env.MONITORS_TABLE_NAME = "monitors";
  const response = await handleGetMonitor({
    ...authenticated,
    pathParameters: { monitorId: "monitor-123" },
  }, () => ({ async getById() { throw new Error("sensitive database detail"); } }));
  assert.equal(response.statusCode, 502);
  assert.equal(response.body.includes("sensitive database detail"), false);
});
