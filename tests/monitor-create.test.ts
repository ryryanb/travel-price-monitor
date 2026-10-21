import assert from "node:assert/strict";
import test from "node:test";
import { createPriceMonitor, validateCreateMonitorInput } from "../services/api/src/monitors/create.ts";
import type { MonitorRepository, PriceMonitor } from "../services/api/src/monitors/types.ts";

const futureDate = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
const returnDate = new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10);
const validInput = { origin: " mnl ", destination: "nrt", departureDate: futureDate, returnDate, targetPrice: 425.5, currency: "usd" };

test("normalizes valid monitor criteria", () => {
  assert.deepEqual(validateCreateMonitorInput(validInput), { origin: "MNL", destination: "NRT", departureDate: futureDate, returnDate, targetPrice: 425.5, currency: "USD" });
});

test("rejects identical airports", () => {
  assert.throws(() => validateCreateMonitorInput({ ...validInput, destination: "MNL" }), /must be different/);
});

test("requires an origin airport code", () => {
  for (const origin of [undefined, null, "", "   ", "Manila", "MN", "MNL1", 123]) {
    assert.throws(() => validateCreateMonitorInput({ ...validInput, origin }), /Origin must be a three-letter IATA airport code/);
  }
});

test("normalizes origin input by trimming whitespace and uppercasing", () => {
  assert.equal(validateCreateMonitorInput({ ...validInput, origin: "  ceb " }).origin, "CEB");
});

test("rejects invalid destination airport codes", () => {
  assert.throws(() => validateCreateMonitorInput({ ...validInput, destination: "Tokyo" }), /Destination must be a three-letter IATA airport code/);
});

test("rejects past and impossible departure dates", () => {
  assert.throws(() => validateCreateMonitorInput({ ...validInput, departureDate: "2020-02-30" }), /valid YYYY-MM-DD/);
  assert.throws(() => validateCreateMonitorInput({ ...validInput, departureDate: "2020-01-01" }), /cannot be in the past/);
});

test("rejects a return date before departure", () => {
  assert.throws(() => validateCreateMonitorInput({ ...validInput, returnDate: "2020-01-01" }), /Return date cannot be before/);
});

test("requires a positive finite target price", () => {
  for (const targetPrice of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, "100"]) {
    assert.throws(() => validateCreateMonitorInput({ ...validInput, targetPrice }), /Target price must be/);
  }
});

test("creates and persists an active monitor for the authenticated user", async () => {
  let saved: PriceMonitor | undefined;
  const repository: MonitorRepository = { async create(monitor) { saved = monitor; } };
  const now = new Date("2026-10-20T12:00:00.000Z");
  const result = await createPriceMonitor(validInput, "cognito-user-sub", repository, now);
  assert.ok(saved);
  assert.equal(result.monitorId, saved.monitorId);
  assert.equal(result.userId, "cognito-user-sub");
  assert.equal(result.status, "ACTIVE");
  assert.equal(result.createdAt, now.toISOString());
  assert.equal(result.updatedAt, now.toISOString());
  assert.equal(result.targetPrice, 425.5);
  assert.equal(result.currency, "USD");
});

test("does not accept a missing authenticated user", async () => {
  await assert.rejects(() => createPriceMonitor(validInput, "", { async create() {} }), /Authenticated user is required/);
});
