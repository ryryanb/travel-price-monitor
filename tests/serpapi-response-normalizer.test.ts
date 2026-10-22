import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeSerpApiFlightResponse,
} from "../services/api/src/providers/normalize-serpapi-flight-response.ts";
import type { TravelSearchCriteria } from "../services/api/src/providers/travel-price-provider.ts";

const criteria: TravelSearchCriteria = {
  origin: "MNL",
  destination: "NRT",
  departureDate: "2027-01-10",
  returnDate: "2027-01-20",
  passengerCount: 2,
  currency: "PHP",
};
const checkedAt = "2026-10-22T01:02:03.000Z";
const providerId = "serpapi";
const providerName = "SerpApi Google Flights";

test("normalizes offers from best_flights and other_flights into PriceResult", () => {
  const results = normalizeSerpApiFlightResponse({
    best_flights: [
      { price: 12500, booking_token: "token-123", flights: [{ airline: "Example Air" }] },
      { price: 9900, booking_token: "token-456" },
      { price: "unknown" },
      { price: 0 },
      { price: -5 },
      { price: Number.NaN },
      null,
      "invalid offer",
    ],
    other_flights: [
      { price: 15000 },
      { price: Number.POSITIVE_INFINITY, booking_token: "bad-price" },
    ],
  }, criteria, checkedAt, providerId, providerName);

  assert.deepEqual(results, [
    {
      providerId,
      providerName,
      offerId: "token-123",
      origin: "MNL",
      destination: "NRT",
      departureDate: "2027-01-10",
      returnDate: "2027-01-20",
      price: 12500,
      currency: "PHP",
      checkedAt,
    },
    {
      providerId,
      providerName,
      offerId: "token-456",
      origin: "MNL",
      destination: "NRT",
      departureDate: "2027-01-10",
      returnDate: "2027-01-20",
      price: 9900,
      currency: "PHP",
      checkedAt,
    },
    {
      providerId,
      providerName,
      origin: "MNL",
      destination: "NRT",
      departureDate: "2027-01-10",
      returnDate: "2027-01-20",
      price: 15000,
      currency: "PHP",
      checkedAt,
    },
  ]);
});

test("omits optional return date and offer ID when unavailable", () => {
  const { returnDate: _returnDate, ...oneWayCriteria } = criteria;
  const results = normalizeSerpApiFlightResponse({
    best_flights: [{ price: 4200, departure_token: "not-a-booking-token" }],
  }, oneWayCriteria, checkedAt, providerId, providerName);

  assert.deepEqual(results, [{
    providerId,
    providerName,
    origin: "MNL",
    destination: "NRT",
    departureDate: "2027-01-10",
    price: 4200,
    currency: "PHP",
    checkedAt,
  }]);
});

test("returns an empty list when no usable offers are present", () => {
  assert.deepEqual(
    normalizeSerpApiFlightResponse({}, criteria, checkedAt, providerId, providerName),
    [],
  );
  assert.deepEqual(
    normalizeSerpApiFlightResponse({
      best_flights: "malformed",
      other_flights: [{ price: "not-a-number" }],
    }, criteria, checkedAt, providerId, providerName),
    [],
  );
});

test("rejects a malformed top-level provider payload", () => {
  assert.throws(
    () => normalizeSerpApiFlightResponse(null, criteria, checkedAt, providerId, providerName),
    /malformed SerpApi response/,
  );
  assert.throws(
    () => normalizeSerpApiFlightResponse([], criteria, checkedAt, providerId, providerName),
    /malformed SerpApi response/,
  );
});
