import type { SerpApiProviderConfig } from "./config.ts";
import type {
  PriceResult,
  TravelPriceProvider,
  TravelSearchCriteria,
} from "./travel-price-provider.ts";

type SerpApiResponse = {
  error?: unknown;
  best_flights?: unknown;
  other_flights?: unknown;
};

type FlightOffer = {
  price?: unknown;
  booking_token?: unknown;
  flights?: unknown;
};

export type SerpApiFetchResponse = Pick<Response, "ok" | "status" | "json">;
export type SerpApiFetch = (url: URL) => Promise<SerpApiFetchResponse>;

export class TravelProviderSearchError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "TravelProviderSearchError";
  }
}

/**
 * Sends flight searches to SerpApi's Google Flights engine and normalizes
 * returned offers into the provider-independent PriceResult contract.
 */
export class SerpApiTravelPriceProvider implements TravelPriceProvider {
  readonly id = "serpapi";
  readonly name = "SerpApi Google Flights";

  private readonly config: SerpApiProviderConfig;
  private readonly fetchImpl: SerpApiFetch;
  private readonly now: () => Date;

  constructor(
    config: SerpApiProviderConfig,
    fetchImpl: SerpApiFetch = (url) => fetch(url),
    now: () => Date = () => new Date(),
  ) {
    this.config = config;
    this.fetchImpl = fetchImpl;
    this.now = now;
  }

  async search(criteria: TravelSearchCriteria): Promise<PriceResult[]> {
    const url = new URL(this.config.baseUrl);
    url.searchParams.set("engine", "google_flights");
    url.searchParams.set("departure_id", criteria.origin);
    url.searchParams.set("arrival_id", criteria.destination);
    url.searchParams.set("outbound_date", criteria.departureDate);
    if (criteria.returnDate) url.searchParams.set("return_date", criteria.returnDate);
    url.searchParams.set("currency", criteria.currency);
    url.searchParams.set("adults", String(criteria.passengerCount ?? 1));
    url.searchParams.set("api_key", this.config.apiKey);

    let response: SerpApiFetchResponse;
    try {
      response = await this.fetchImpl(url);
    } catch (error) {
      throw new TravelProviderSearchError("Unable to reach the flight-search provider.", { cause: error });
    }

    if (!response.ok) {
      throw new TravelProviderSearchError(
        `Flight-search provider returned HTTP ${response.status}.`,
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      throw new TravelProviderSearchError("Flight-search provider returned invalid JSON.", { cause: error });
    }

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new TravelProviderSearchError("Flight-search provider returned an unexpected response.");
    }

    const body = payload as SerpApiResponse;
    if (typeof body.error === "string" && body.error.trim()) {
      throw new TravelProviderSearchError("Flight-search provider rejected the search request.");
    }

    const offers = [
      ...asOffers(body.best_flights),
      ...asOffers(body.other_flights),
    ];
    const checkedAt = this.now().toISOString();

    return offers.flatMap((offer): PriceResult[] => {
      if (typeof offer.price !== "number" || !Number.isFinite(offer.price) || offer.price <= 0) {
        return [];
      }

      const offerId = typeof offer.booking_token === "string" && offer.booking_token.length > 0
        ? offer.booking_token
        : undefined;

      return [{
        providerId: this.id,
        providerName: this.name,
        ...(offerId ? { offerId } : {}),
        origin: criteria.origin,
        destination: criteria.destination,
        departureDate: criteria.departureDate,
        ...(criteria.returnDate ? { returnDate: criteria.returnDate } : {}),
        price: offer.price,
        currency: criteria.currency,
        checkedAt,
      }];
    });
  }
}

function asOffers(value: unknown): FlightOffer[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is FlightOffer => Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );
}
