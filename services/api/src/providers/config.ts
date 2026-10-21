export const SUPPORTED_TRAVEL_PROVIDERS = ["amadeus"] as const;

export type TravelProviderId = (typeof SUPPORTED_TRAVEL_PROVIDERS)[number];

export interface AmadeusProviderConfig {
  readonly provider: "amadeus";
  readonly clientId: string;
  readonly clientSecret: string;
  readonly baseUrl: string;
}

export type TravelProviderConfig = AmadeusProviderConfig;
export type ProviderEnvironment = Record<string, string | undefined>;

const DEFAULT_AMADEUS_BASE_URL = "https://test.api.amadeus.com";

/**
 * Load and validate provider settings. The test API is the default so new
 * installations do not accidentally send requests to the production API.
 */
export function loadTravelProviderConfig(
  env: ProviderEnvironment = process.env,
): TravelProviderConfig {
  const providerValue = (env.TRAVEL_PROVIDER ?? "amadeus").trim().toLowerCase();

  if (!SUPPORTED_TRAVEL_PROVIDERS.includes(providerValue as TravelProviderId)) {
    throw new Error(
      `Unsupported TRAVEL_PROVIDER "${providerValue}". Supported providers: ${SUPPORTED_TRAVEL_PROVIDERS.join(", ")}.`,
    );
  }

  const clientId = env.AMADEUS_CLIENT_ID?.trim();
  const clientSecret = env.AMADEUS_CLIENT_SECRET?.trim();

  if (!clientId) {
    throw new Error("AMADEUS_CLIENT_ID is required when TRAVEL_PROVIDER=amadeus.");
  }
  if (!clientSecret) {
    throw new Error("AMADEUS_CLIENT_SECRET is required when TRAVEL_PROVIDER=amadeus.");
  }

  const baseUrl = (env.AMADEUS_BASE_URL?.trim() || DEFAULT_AMADEUS_BASE_URL).replace(/\/+$/, "");
  let parsedBaseUrl: URL;
  try {
    parsedBaseUrl = new URL(baseUrl);
  } catch {
    throw new Error("AMADEUS_BASE_URL must be a valid HTTPS URL.");
  }
  if (parsedBaseUrl.protocol !== "https:") {
    throw new Error("AMADEUS_BASE_URL must use HTTPS.");
  }

  return { provider: "amadeus", clientId, clientSecret, baseUrl };
}
