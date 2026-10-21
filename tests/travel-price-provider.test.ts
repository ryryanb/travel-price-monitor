import assert from "node:assert/strict";
import test from "node:test";
import type {
  PriceResult,
  TravelPriceProvider,
  TravelSearchCriteria,
} from "../services/api/src/providers/travel-price-provider.ts";

const criteria: TravelSearchCriteria = {
  origin: "MNL",
  destination: "NRT",
  departureDate: "2027-01-10",
  returnDate: "2027-01-20",
  currency: "PHP",
};

class StubTravelPriceProvider implements TravelPriceProvider {
  readonly id = "stub-flight-provider";
  readonly name = "Stub Flight Provider";

  async search(searchCriteria: TravelSearchCriteria): Promise<PriceResult[]> {
    assert.equal(searchCriteria.origin, criteria.origin);
    assert.equal(searchCriteria.destination, criteria.destination);
    assert.equal(searchCriteria.departureDate, criteria.departureDate);
    assert.equal(searchCriteria.returnDate, criteria.returnDate);
    assert.equal(searchCriteria.currency, criteria.currency);

    return [{
      providerId: this.id,
      providerName: this.name,
      offerId: "offer-123",
      origin: searchCriteria.origin,
      destination: searchCriteria.destination,
      departureDate: searchCriteria.departureDate,
      ...(searchCriteria.returnDate ? { returnDate: searchCriteria.returnDate } : {}),
      price: 12500,
      currency: "PHP",
      bookingUrl: "https://example.com/booking/offer-123",
      checkedAt: "2026-10-21T12:00:00.000Z",
    }];
  }
}

test("provider adapters expose normalized results through the shared contract", async () => {
  const provider: TravelPriceProvider = new StubTravelPriceProvider();
  const results = await provider.search(criteria);

  assert.equal(provider.id, "stub-flight-provider");
  assert.equal(provider.name, "Stub Flight Provider");
  assert.deepEqual(results, [{
    providerId: "stub-flight-provider",
    providerName: "Stub Flight Provider",
    offerId: "offer-123",
    origin: "MNL",
    destination: "NRT",
    departureDate: "2027-01-10",
    returnDate: "2027-01-20",
    price: 12500,
    currency: "PHP",
    bookingUrl: "https://example.com/booking/offer-123",
    checkedAt: "2026-10-21T12:00:00.000Z",
  }]);
});

test("provider adapters may return no offers for a successful search", async () => {
  const provider: TravelPriceProvider = {
    id: "empty-provider",
    name: "Empty Provider",
    async search() {
      return [];
    },
  };

  assert.deepEqual(await provider.search(criteria), []);
});
