import assert from "node:assert/strict";
import test from "node:test";
import type { SerpApiProviderConfig } from "../services/api/src/providers/config.ts";
import {
  SerpApiTravelPriceProvider,
  TravelProviderSearchError,
  type SerpApiFetch,
} from "../services/api/src/providers/serpapi-travel-price-provider.ts";
import type { TravelSearchCriteria } from "../services/api/src/providers/travel-price-provider.ts";

const config: SerpApiProviderConfig = {
  provider: "serpapi",
  apiKey: "test-secret",
  baseUrl: "https://serpapi.example/search.json",
};

const criteria: TravelSearchCriteria = {
  origin: "MNL",
  destination: "NRT",
  departureDate: "2027-01-10",
  returnDate: "2027-01-20",
  passengerCount: 2,
  currency: "PHP",
};

function response(payload: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    async json() { return payload; },
  };
}

test("submits the monitor criteria to Google Flights and normalizes returned offers", async () => {
  let requestedUrl: URL | undefined;
  const fetchImpl: SerpApiFetch = async (url) => {
    requestedUrl = url;
    return response({
      best_flights: [
        { price: 12500, booking_token: "token-123", flights: [] },
        { price: 9900, booking_token: "token-456", flights: [] },
        { price: "unknown", flights: [] },
      ],
      other_flights: [{ price: 15000, flights: [] }],
    });
  };
  const provider = new SerpApiTravelPriceProvider(
    config,
    fetchImpl,
    () => new Date("2026-10-22T01:02:03.000Z"),
  );

  const results = await provider.search(criteria);

  assert.ok(requestedUrl);
  assert.equal(requestedUrl.searchParams.get("engine"), "google_flights");
  assert.equal(requestedUrl.searchParams.get("departure_id"), "MNL");
  assert.equal(requestedUrl.searchParams.get("arrival_id"), "NRT");
  assert.equal(requestedUrl.searchParams.get("outbound_date"), "2027-01-10");
  assert.equal(requestedUrl.searchParams.get("return_date"), "2027-01-20");
  assert.equal(requestedUrl.searchParams.get("currency"), "PHP");
  assert.equal(requestedUrl.searchParams.get("adults"), "2");
  assert.equal(requestedUrl.searchParams.get("api_key"), "test-secret");
  assert.deepEqual(results, [
    {
      providerId: "serpapi",
      providerName: "SerpApi Google Flights",
      offerId: "token-123",
      origin: "MNL",
      destination: "NRT",
      departureDate: "2027-01-10",
      returnDate: "2027-01-20",
      price: 12500,
      currency: "PHP",
      checkedAt: "2026-10-22T01:02:03.000Z",
    },
    {
      providerId: "serpapi",
      providerName: "SerpApi Google Flights",
      offerId: "token-456",
      origin: "MNL",
      destination: "NRT",
      departureDate: "2027-01-10",
      returnDate: "2027-01-20",
      price: 9900,
      currency: "PHP",
      checkedAt: "2026-10-22T01:02:03.000Z",
    },
    {
      providerId: "serpapi",
      providerName: "SerpApi Google Flights",
      origin: "MNL",
      destination: "NRT",
      departureDate: "2027-01-10",
      returnDate: "2027-01-20",
      price: 15000,
      currency: "PHP",
      checkedAt: "2026-10-22T01:02:03.000Z",
    },
  ]);
});

test("omits return date for one-way searches and defaults passenger count to one", async () => {
  let requestedUrl: URL | undefined;
  const provider = new SerpApiTravelPriceProvider(config, async (url) => {
    requestedUrl = url;
    return response({ best_flights: [], other_flights: [] });
  });
  const { returnDate: _returnDate, passengerCount: _passengerCount, ...oneWay } = criteria;
  await provider.search(oneWay);
  assert.equal(requestedUrl?.searchParams.has("return_date"), false);
  assert.equal(requestedUrl?.searchParams.get("adults"), "1");
});

test("returns an empty list when a successful search has no offers", async () => {
  const provider = new SerpApiTravelPriceProvider(config, async () => response({}));
  assert.deepEqual(await provider.search(criteria), []);
});

test("rejects provider HTTP errors without exposing the API key", async () => {
  const provider = new SerpApiTravelPriceProvider(config, async () => response({}, false, 429));
  await assert.rejects(
    provider.search(criteria),
    (error: unknown) => error instanceof TravelProviderSearchError
      && /HTTP 429/.test(error.message)
      && !error.message.includes(config.apiKey),
  );
});

test("rejects provider API errors and malformed responses", async () => {
  const apiErrorProvider = new SerpApiTravelPriceProvider(config, async () =>
    response({ error: "Invalid API key" }));
  const malformedProvider = new SerpApiTravelPriceProvider(config, async () =>
    response("not an object"));

  await assert.rejects(apiErrorProvider.search(criteria), /rejected the search request/);
  await assert.rejects(malformedProvider.search(criteria), /unexpected response/);
});

test("wraps network failures in a provider-specific error", async () => {
  const provider = new SerpApiTravelPriceProvider(config, async () => {
    throw new Error("socket error");
  });
  await assert.rejects(provider.search(criteria), /Unable to reach the flight-search provider/);
});
