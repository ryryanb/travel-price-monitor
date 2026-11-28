import assert from "node:assert/strict";
import test from "node:test";
import { handleListMonitors } from "../services/api/src/handlers/monitors/list.ts";
import type { MonitorListRepository, PriceMonitor } from "../services/api/src/monitors/types.ts";

const originalTable = process.env.MONITORS_TABLE_NAME;
const originalLocalMode = process.env.LOCAL_AUTH_DISABLED;
const sample: PriceMonitor = {
  monitorId: "monitor-123",
  userId: "user-123",
  name: "Tokyo Winter Trip",
  origin: "MNL",
  destination: "NRT",
  departureDate: "2027-02-15",
  passengerCount: 1,
  targetPrice: 500,
  currency: "USD",
  status: "ACTIVE",
  createdAt: "2026-10-20T12:00:00.000Z",
  updatedAt: "2026-10-20T12:00:00.000Z",
};
const authenticated = { requestContext: { authorizer: { claims: { sub: "user-123" } } } };

test.afterEach(() => {
  if (originalTable === undefined) delete process.env.MONITORS_TABLE_NAME;
  else process.env.MONITORS_TABLE_NAME = originalTable;
  if (originalLocalMode === undefined) delete process.env.LOCAL_AUTH_DISABLED;
  else process.env.LOCAL_AUTH_DISABLED = originalLocalMode;
});

test("lists monitors for the authenticated owner", async () => {
  process.env.LOCAL_AUTH_DISABLED = "false";
  process.env.MONITORS_TABLE_NAME = "monitors";
  let requestedUser = "";
  let requestedTable = "";
  const repository: MonitorListRepository = {
    async listByUser(userId) { requestedUser = userId; return [sample]; },
  };
  const response = await handleListMonitors(authenticated, (tableName) => {
    requestedTable = tableName;
    return repository;
  });
  assert.equal(response.statusCode, 200);
  assert.equal(requestedUser, "user-123");
  assert.equal(requestedTable, "monitors");
  assert.deepEqual(JSON.parse(response.body), { monitors: [sample] });
  assert.equal(response.headers["access-control-allow-origin"], process.env.WEB_ORIGIN || "http://localhost:5173");
});

test("returns an empty list when no monitors exist", async () => {
  process.env.LOCAL_AUTH_DISABLED = "false";
  process.env.MONITORS_TABLE_NAME = "monitors";
  const response = await handleListMonitors(authenticated, () => ({ async listByUser() { return []; } }));
  assert.equal(response.statusCode, 200);
  assert.deepEqual(JSON.parse(response.body), { monitors: [] });
});

test("requires authenticated claims outside local mode", async () => {
  process.env.LOCAL_AUTH_DISABLED = "false";
  process.env.MONITORS_TABLE_NAME = "monitors";
  const response = await handleListMonitors({}, () => { throw new Error("Must not query"); });
  assert.equal(response.statusCode, 401);
});

test("uses the fixed local user when authentication is disabled", async () => {
  process.env.LOCAL_AUTH_DISABLED = "true";
  process.env.MONITORS_TABLE_NAME = "monitors";
  let requestedUser = "";
  const response = await handleListMonitors({}, () => ({
    async listByUser(userId) { requestedUser = userId; return []; },
  }));
  assert.equal(response.statusCode, 200);
  assert.equal(requestedUser, "local-dev-user");
});

test("reports a missing storage configuration", async () => {
  process.env.LOCAL_AUTH_DISABLED = "false";
  delete process.env.MONITORS_TABLE_NAME;
  const response = await handleListMonitors(authenticated, () => { throw new Error("Must not query"); });
  assert.equal(response.statusCode, 500);
});

test("does not disclose database errors", async () => {
  process.env.LOCAL_AUTH_DISABLED = "false";
  process.env.MONITORS_TABLE_NAME = "monitors";
  const response = await handleListMonitors(authenticated, () => ({
    async listByUser() { throw new Error("sensitive database detail"); },
  }));
  assert.equal(response.statusCode, 502);
  assert.equal(response.body.includes("sensitive database detail"), false);
});
