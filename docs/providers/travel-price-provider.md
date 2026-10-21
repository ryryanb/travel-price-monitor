# Travel-price provider interface

## Purpose

The monitoring system depends on a stable contract rather than a provider's API schema. Each travel-price source implements `TravelPriceProvider` in `services/api/src/providers/travel-price-provider.ts`.

## Contract

- `id`: stable, machine-readable provider identifier.
- `name`: human-readable provider name.
- `search(criteria)`: asynchronously returns normalized `PriceResult[]`.
- Criteria include origin, destination, departure date, optional return date, optional passenger count, and currency.
- An empty array means a successful search returned no matching offers.
- A failed search rejects with an error; it must not disguise provider failure as an empty result.
- Provider-native responses are normalized inside the adapter.
- Prices are total itinerary prices paired with their ISO 4217 currency code.
- Dates use `YYYY-MM-DD`; `checkedAt` uses an ISO 8601 timestamp.
- `offerId` and `bookingUrl` are optional.

## Initial implementation

`SerpApiTravelPriceProvider` sends Google Flights searches through SerpApi and normalizes returned offers. See [Submitting flight searches](./submitting-flight-searches.md) and [provider configuration](./configuration.md).

## Adding another provider

1. Implement `TravelPriceProvider`.
2. Translate `TravelSearchCriteria` into the provider's search request.
3. Normalize returned offers into `PriceResult`.
4. Add adapter tests for mapping, empty results, and provider errors.
5. Register or inject the adapter in the application layer.
