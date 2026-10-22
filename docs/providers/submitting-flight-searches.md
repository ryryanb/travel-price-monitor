# Submitting flight searches

PROV-003 implements the first concrete adapter for the provider-neutral `TravelPriceProvider` interface: `SerpApiTravelPriceProvider`.

## Search behavior

The adapter sends an HTTPS request to the configured SerpApi endpoint with the Google Flights engine and the monitor's origin, destination, departure date, optional return date, passenger count, and currency. It authenticates using `SERPAPI_API_KEY`.

- One-way searches omit `return_date`.
- Passenger count defaults to one if omitted.
- The provider-specific response mapping is isolated in `normalize-serpapi-flight-response.ts`; the rest of the application consumes only the shared `PriceResult` shape.
- Results from `best_flights` and `other_flights` are normalized into `PriceResult`.
- Results with missing, non-numeric, non-finite, or non-positive prices are ignored.
- The provider's `booking_token`, when present, is preserved as `offerId`; no booking URL is fabricated when the provider does not return one.
- Optional fields such as `offerId` and `returnDate` are omitted when unavailable.
- A successful search with no usable offers returns an empty list.
- Network failures, non-success HTTP responses, invalid JSON, and provider-reported errors reject with `TravelProviderSearchError`. Provider failures are not represented as an empty result.

## Normalized result contract

Each returned result contains:

- Provider identity (`providerId`, `providerName`)
- Route and dates from the requested search criteria (`origin`, `destination`, `departureDate`, and optional `returnDate`)
- A positive finite numeric total price and the requested currency (`price`, `currency`)
- Retrieval timestamp (`checkedAt`)
- Optional provider offer identifier (`offerId`)

Raw provider fields such as `best_flights`, `other_flights`, and individual flight segment structures are not exposed through `PriceResult`.

## Example

```ts
import { loadTravelProviderConfig } from "../../providers/config.ts";
import { SerpApiTravelPriceProvider } from "../../providers/serpapi-travel-price-provider.ts";

const provider = new SerpApiTravelPriceProvider(loadTravelProviderConfig());
const results = await provider.search({
  origin: "MNL",
  destination: "NRT",
  departureDate: "2027-01-10",
  returnDate: "2027-01-20",
  passengerCount: 1,
  currency: "PHP",
});
```

This adapter performs a live provider request when called. It does not create a monitor, persist observations, schedule searches, or send alerts; those workflows remain separate responsibilities. Tests inject a fake fetch function and do not require a paid SerpApi account or network access.
