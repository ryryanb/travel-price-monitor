import type { SerpApiProviderConfig } from "./config.ts";
import { normalizeSerpApiFlightResponse } from "./normalize-serpapi-flight-response.ts";
import type {
  PriceResult,
  TravelPriceProvider,
  TravelSearchCriteria,
} from "./travel-price-provider.ts";

type SerpApiResponse = {
  error?: unknown;
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
 * Sends flight searches to SerpApi's Google Flights engine. Response mapping
 * lives in normalize-serpapi-flight-response.ts so it can be tested separately.
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

    return normalizeSerpApiFlightResponse(
      payload,
      criteria,
      this.now().toISOString(),
      this.id,
      this.name,
    );
  }
}
