# Travel provider configuration

PROV-002 configures SerpApi's Google Flights search API as the initial flight-price source. PROV-003 implements the adapter that submits searches and normalizes results. Provider settings live in `services/api/src/providers/config.ts`; monitoring code should depend on the provider-neutral contract, not vendor credentials or native API payloads.

## Create credentials

Review SerpApi's current Google Flights API documentation and plans at [SerpApi Google Flights API](https://serpapi.com/google-flights-api). Create an account and generate an API key. Check current plan limits and pricing before relying on it for scheduled monitoring.

## Environment variables

Copy `.env.example` to `.env.local` and configure:

```dotenv
TRAVEL_PROVIDER=serpapi
SERPAPI_API_KEY=your-serpapi-api-key
# Optional; defaults to the standard search endpoint.
SERPAPI_BASE_URL=https://serpapi.com/search.json
```

Never commit real credentials or expose them in frontend code. Use the deployment platform's secret manager for deployed environments.

## Behavior and scope

- If `TRAVEL_PROVIDER` is unset, it defaults to `serpapi`.
- Provider identifiers are case-insensitive.
- Unknown providers fail fast with a clear error.
- `SERPAPI_API_KEY` is required.
- The endpoint defaults to SerpApi's search endpoint and must use HTTPS.
- `SerpApiTravelPriceProvider` submits Google Flights searches, maps valid offers to `PriceResult`, and rejects provider failures instead of reporting them as empty searches.
- The adapter can be tested with an injected fetch function, without a real API key or network request.

## Validation

```bash
npm test
npm run typecheck
```
