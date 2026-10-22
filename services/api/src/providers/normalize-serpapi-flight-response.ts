import type {
  PriceResult,
  TravelSearchCriteria,
} from "./travel-price-provider.ts";

type SerpApiFlightOffer = {
  price?: unknown;
  booking_token?: unknown;
};

type SerpApiFlightResponse = {
  best_flights?: unknown;
  other_flights?: unknown;
};

/**
 * Converts SerpApi's native Google Flights response into the shared
 * PriceResult format. Keep all SerpApi-specific field access in this module.
 *
 * Invalid individual offers are skipped. A successful response with no
 * usable offers normalizes to an empty list.
 */
export function normalizeSerpApiFlightResponse(
  payload: unknown,
  criteria: TravelSearchCriteria,
  checkedAt: string,
  providerId: string,
  providerName: string,
): PriceResult[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new TypeError("Cannot normalize a malformed SerpApi response.");
  }

  const response = payload as SerpApiFlightResponse;
  const offers = [
    ...asOffers(response.best_flights),
    ...asOffers(response.other_flights),
  ];

  return offers.flatMap((offer): PriceResult[] => {
    if (
      typeof offer.price !== "number"
      || !Number.isFinite(offer.price)
      || offer.price <= 0
    ) {
      return [];
    }

    const offerId = typeof offer.booking_token === "string" && offer.booking_token.length > 0
      ? offer.booking_token
      : undefined;

    return [{
      providerId,
      providerName,
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

function asOffers(value: unknown): SerpApiFlightOffer[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is SerpApiFlightOffer =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );
}
