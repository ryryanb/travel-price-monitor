import assert from "node:assert/strict";
import test from "node:test";
import { loadTravelProviderConfig } from "../services/api/src/providers/config.ts";

const credentials = {
  AMADEUS_CLIENT_ID: "test-client-id",
  AMADEUS_CLIENT_SECRET: "test-client-secret",
};

test("defaults to Amadeus test API and loads credentials", () => {
  assert.deepEqual(loadTravelProviderConfig(credentials), {
    provider: "amadeus",
    clientId: "test-client-id",
    clientSecret: "test-client-secret",
    baseUrl: "https://test.api.amadeus.com",
  });
});

test("normalizes provider name, trims credentials, and removes trailing slashes", () => {
  const config = loadTravelProviderConfig({
    ...credentials,
    TRAVEL_PROVIDER: " AMADEUS ",
    AMADEUS_CLIENT_ID: " id ",
    AMADEUS_CLIENT_SECRET: " secret ",
    AMADEUS_BASE_URL: "https://api.amadeus.com///",
  });

  assert.equal(config.provider, "amadeus");
  assert.equal(config.clientId, "id");
  assert.equal(config.clientSecret, "secret");
  assert.equal(config.baseUrl, "https://api.amadeus.com");
});

test("rejects unsupported provider names", () => {
  assert.throws(
    () => loadTravelProviderConfig({ ...credentials, TRAVEL_PROVIDER: "unknown" }),
    /Unsupported TRAVEL_PROVIDER/,
  );
});

test("requires client ID and client secret", () => {
  assert.throws(
    () => loadTravelProviderConfig({ AMADEUS_CLIENT_SECRET: "secret" }),
    /AMADEUS_CLIENT_ID is required/,
  );
  assert.throws(
    () => loadTravelProviderConfig({ AMADEUS_CLIENT_ID: "id" }),
    /AMADEUS_CLIENT_SECRET is required/,
  );
});

test("rejects malformed and non-HTTPS base URLs", () => {
  assert.throws(
    () => loadTravelProviderConfig({ ...credentials, AMADEUS_BASE_URL: "not-a-url" }),
    /AMADEUS_BASE_URL must be a valid HTTPS URL/,
  );
  assert.throws(
    () => loadTravelProviderConfig({ ...credentials, AMADEUS_BASE_URL: "http://localhost:3000" }),
    /AMADEUS_BASE_URL must use HTTPS/,
  );
});
