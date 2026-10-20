import assert from "node:assert/strict";
import test from "node:test";
import { handleCreateMonitor } from "../services/api/src/handlers/monitors/create.ts";
import type { MonitorRepository, PriceMonitor } from "../services/api/src/monitors/types.ts";

const originalTableName = process.env.MONITORS_TABLE_NAME;
const departureDate = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
const validInput = { origin: "MNL", destination: "NRT", departureDate, targetPrice: 500 };
const authenticated = { requestContext: { authorizer: { claims: { sub: "user-123" } } } };

test.afterEach(() => {
  if (originalTableName === undefined) delete process.env.MONITORS_TABLE_NAME;
  else process.env.MONITORS_TABLE_NAME = originalTableName;
});

test("creates a monitor for the authenticated user", async () => {
  process.env.MONITORS_TABLE_NAME = "monitors";
  let saved: PriceMonitor | undefined;
  let table = "";
  const repository: MonitorRepository = { async create(monitor) { saved = monitor; } };
  const response = await handleCreateMonitor({
    ...authenticated,
    body: JSON.stringify(validInput),
  }, (tableName) => { table = tableName; return repository; });

  assert.equal(response.statusCode, 201);
  assert.equal(table, "monitors");
  assert.equal(saved?.userId, "user-123");
  assert.equal(saved?.status, "ACTIVE");
  assert.deepEqual(JSON.parse(response.body), saved);
});

test("rejects requests without an authenticated Cognito subject", async () => {
  process.env.MONITORS_TABLE_NAME = "monitors";
  const response = await handleCreateMonitor({ body: JSON.stringify(validInput) }, () => {
    throw new Error("Repository must not be created");
  });
  assert.equal(response.statusCode, 401);
});

test("rejects a missing body and malformed JSON", async () => {
  process.env.MONITORS_TABLE_NAME = "monitors";
  const missing = await handleCreateMonitor({ ...authenticated, body: null }, () => ({ async create() {} }));
  const malformed = await handleCreateMonitor({ ...authenticated, body: "{" }, () => ({ async create() {} }));
  assert.equal(missing.statusCode, 400);
  assert.equal(malformed.statusCode, 400);
});

test("rejects invalid monitor criteria without persisting", async () => {
  process.env.MONITORS_TABLE_NAME = "monitors";
  let persisted = false;
  const response = await handleCreateMonitor({
    ...authenticated,
    body: JSON.stringify({ ...validInput, origin: "not-an-airport" }),
  }, () => ({ async create() { persisted = true; } }));
  assert.equal(response.statusCode, 400);
  assert.equal(persisted, false);
});

test("reports missing storage configuration", async () => {
  delete process.env.MONITORS_TABLE_NAME;
  const response = await handleCreateMonitor({
    ...authenticated,
    body: JSON.stringify(validInput),
  }, () => ({ async create() {} }));
  assert.equal(response.statusCode, 500);
});

test("returns a server error when persistence fails", async () => {
  process.env.MONITORS_TABLE_NAME = "monitors";
  const response = await handleCreateMonitor({
    ...authenticated,
    body: JSON.stringify(validInput),
  }, () => ({ async create() { throw new Error("database unavailable"); } }));
  assert.equal(response.statusCode, 502);
});
