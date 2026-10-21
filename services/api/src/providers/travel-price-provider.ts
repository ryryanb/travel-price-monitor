/**
 * Normalized flight-search criteria shared by all travel-price providers.
 *
 * Keep this independent of any provider's request/response schema so the
 * monitoring system can search through different provider adapters.
 */
export interface TravelSearchCriteria {
  /** Three-letter IATA airport code. */
  origin: string;
  /** Three-letter IATA airport code. */
  destination: string;
  /** Departure date in YYYY-MM-DD format. */
  departureDate: string;
  /** Optional return date in YYYY-MM-DD format; omitted for one-way trips. */
  returnDate?: string;
  /** Three-letter ISO 4217 currency code requested for prices. */
  currency: string;
}

/**
 * A provider-independent representation of one flight offer.
 *
 * Providers should map their native offer fields into this shape before
 * returning results. Prices represent the total offer price for the itinerary
 * in the stated currency.
 */
export interface PriceResult {
  /** Stable identifier for the provider adapter, e.g. "example-flights". */
  providerId: string;
  /** Human-readable provider name. */
  providerName: string;
  /** Provider-specific offer identifier, when available. */
  offerId?: string;
  origin: string;
  destination: string;
  departureDate: string;
  /** Omitted for one-way itineraries. */
  returnDate?: string;
  /** Total itinerary price, expressed in the result's currency. */
  price: number;
  /** Three-letter ISO 4217 currency code for price. */
  currency: string;
  /** Direct booking or offer URL, when the provider supplies one. */
  bookingUrl?: string;
  /** ISO 8601 timestamp at which the price was retrieved. */
  checkedAt: string;
}

/**
 * Adapter contract for a source of travel prices.
 *
 * Implementations are responsible for provider-specific API calls,
 * authentication, response parsing, and mapping into PriceResult. They should
 * reject when a search cannot be completed rather than returning malformed
 * or provider-specific response objects.
 */
export interface TravelPriceProvider {
  /** Stable identifier used for configuration, logs, and attribution. */
  readonly id: string;
  /** Human-readable provider name for logs and displayed results. */
  readonly name: string;

  /**
   * Search for offers matching the supplied criteria.
   *
   * Results must use the normalized PriceResult shape and the requested
   * currency where supported by the provider. An empty array means the search
   * completed successfully but found no matching offers.
   */
  search(criteria: TravelSearchCriteria): Promise<PriceResult[]>;
}
