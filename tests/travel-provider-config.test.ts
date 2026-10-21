import assert from "node:assert/strict";
import test from "node:test";
import { loadTravelProviderConfig } from "../services/api/src/providers/config.ts";

const credentials = { SERPAPI_API_KEY: "test-serpapi-key" };

test("defaults to SerpApi Google Flights endpoint", () => {
  assert.deepEqual(loadTravelProviderConfig(credentials), {
    provider: "serpapi",
    apiKey: "test-serpapi-key",
    baseUrl: "https://serpapi.com/search.json",
  });
});

test("normalizes provider name, trims API key, and removes trailing slashes", () => {
  const config = loadTravelProviderConfig({
    ...credentials,
    TRAVEL_PROVIDER: " SERPAPI ",
    SERPAPI_API_KEY: " test-key ",
    SERPAPI_BASE_URL: "https://serpapi.com/search.json///",
  });

  assert.equal(config.provider, "serpapi");
  assert.equal(config.apiKey, "test-key");
  assert.equal(config.baseUrl, "https://serpapi.com/search.json");
});

test("rejects unsupported provider names", () => {
  assert.throws(
    () => loadTravelProviderConfig({ ...credentials, TRAVEL_PROVIDER: "unknown" }),
    /Unsupported TRAVEL_PROVIDER/,
  );
});

test("requires the SerpApi API key", () => {
  assert.throws(
    () => loadTravelProviderConfig({ TRAVEL_PROVIDER: "serpapi" }),
    /SERPAPI_API_KEY is required/,
  );
});

test("rejects malformed and non-HTTPS base URLs", () => {
  assert.throws(
    () => loadTravelProviderConfig({ ...credentials, SERPAPI_BASE_URL: "not-a-url" }),
    /SERPAPI_BASE_URL must be a valid HTTPS URL/,
  );
  assert.throws(
    () => loadTravelProviderConfig({ ...credentials, SERPAPI_BASE_URL: "http://localhost:3000" }),
    /SERPAPI_BASE_URL must use HTTPS/,
  );
});
