# Travel-price provider interface

## Purpose

The monitoring system must depend on a stable contract rather than a provider's API schema. Each travel-price source should be implemented as an adapter that satisfies `TravelPriceProvider` in `services/api/src/providers/travel-price-provider.ts`.

The initial MVP focuses on flight prices. This contract intentionally covers the current flight-search criteria without introducing provider-specific fields or committing the project to a particular vendor.

## Contract

- `id`: stable, machine-readable provider identifier.
- `name`: human-readable provider name.
- `search(criteria)`: asynchronously returns normalized `PriceResult[]`.
- An empty array means a successful search returned no matching offers.
- A failed search should reject with an error; it should not disguise a provider failure as an empty result.
- Provider-native responses must be mapped to the shared result shape inside the adapter. Monitoring and alerting code must not depend on provider-specific payloads.
- Prices are total itinerary prices, paired with their ISO 4217 currency code. An adapter should request the desired currency where supported and report the actual currency returned.
- Dates use `YYYY-MM-DD`; `checkedAt` uses an ISO 8601 timestamp.
- `offerId` and `bookingUrl` are optional because not all providers expose them.

## Example adapter shape

```ts
import type {
  PriceResult,
  TravelPriceProvider,
  TravelSearchCriteria,
} from "../../providers/travel-price-provider.ts";

export class ExampleFlightProvider implements TravelPriceProvider {
  readonly id = "example-flight-provider";
  readonly name = "Example Flight Provider";

  async search(criteria: TravelSearchCriteria): Promise<PriceResult[]> {
    // Call the provider API, then map its response into PriceResult[].
    // Keep credentials and provider-specific parsing inside this adapter.
    void criteria;
    return [];
  }
}
```

The example is illustrative only; it does not call a real provider. No scraping implementation, provider credentials, concrete vendor integration, or runtime provider selection is introduced by this story.

## Adding another provider

1. Implement `TravelPriceProvider`.
2. Translate `TravelSearchCriteria` into that provider's search request.
3. Normalize every returned offer into `PriceResult`.
4. Add adapter-specific tests for mapping, empty results, and provider errors.
5. Register or inject the adapter in the application layer in a separate integration story.
