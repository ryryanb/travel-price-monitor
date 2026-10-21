export const SUPPORTED_TRAVEL_PROVIDERS = ["serpapi"] as const;

export type TravelProviderId = (typeof SUPPORTED_TRAVEL_PROVIDERS)[number];

export interface SerpApiProviderConfig {
  readonly provider: "serpapi";
  readonly apiKey: string;
  /** SerpApi Google Flights search endpoint. */
  readonly baseUrl: string;
}

export type TravelProviderConfig = SerpApiProviderConfig;
export type ProviderEnvironment = Record<string, string | undefined>;

const DEFAULT_SERPAPI_BASE_URL = "https://serpapi.com/search.json";

/**
 * Load and validate settings for the initial SerpApi Google Flights provider.
 * This function does not make network requests; the provider adapter owns API
 * calls and mapping SerpApi results into the normalized application contract.
 */
export function loadTravelProviderConfig(
  env: ProviderEnvironment = process.env,
): TravelProviderConfig {
  const providerValue = (env.TRAVEL_PROVIDER ?? "serpapi").trim().toLowerCase();

  if (!SUPPORTED_TRAVEL_PROVIDERS.includes(providerValue as TravelProviderId)) {
    throw new Error(
      `Unsupported TRAVEL_PROVIDER "${providerValue}". Supported providers: ${SUPPORTED_TRAVEL_PROVIDERS.join(", ")}.`,
    );
  }

  const apiKey = env.SERPAPI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("SERPAPI_API_KEY is required when TRAVEL_PROVIDER=serpapi.");
  }

  const baseUrl = (env.SERPAPI_BASE_URL?.trim() || DEFAULT_SERPAPI_BASE_URL).replace(/\/+$/, "");
  let parsedBaseUrl: URL;
  try {
    parsedBaseUrl = new URL(baseUrl);
  } catch {
    throw new Error("SERPAPI_BASE_URL must be a valid HTTPS URL.");
  }
  if (parsedBaseUrl.protocol !== "https:") {
    throw new Error("SERPAPI_BASE_URL must use HTTPS.");
  }

  return { provider: "serpapi", apiKey, baseUrl };
}
