# Travel provider configuration

PROV-002 configures **Amadeus Self-Service APIs** as the initial flight-price provider. Provider configuration lives in `services/api/src/providers/config.ts`; the rest of the monitoring system should depend on the provider-neutral contract in `travel-price-provider.ts`, not vendor credentials or native API payloads.

## Create credentials

Create an application in the [Amadeus for Developers portal](https://developers.amadeus.com/) and obtain its API key and API secret.

The default host is the Amadeus test environment, `https://test.api.amadeus.com`. Start with test credentials. To use the production API, explicitly set `AMADEUS_BASE_URL=https://api.amadeus.com` and provide credentials enabled for production.

## Environment variables

Copy `.env.example` to `.env.local` and configure:

```dotenv
TRAVEL_PROVIDER=amadeus
AMADEUS_CLIENT_ID=your-amadeus-api-key
AMADEUS_CLIENT_SECRET=your-amadeus-api-secret
# Optional; defaults to the test API host.
AMADEUS_BASE_URL=https://test.api.amadeus.com
```

Never commit real credentials or expose them in frontend code. Use the deployment platform's secret manager for deployed environments.

## Behavior and scope

- If `TRAVEL_PROVIDER` is unset, it defaults to `amadeus`.
- Provider identifiers are case-insensitive.
- Unknown providers fail fast with a clear error.
- Both credentials are required.
- The API base URL defaults to the test host and must use HTTPS.
- This story adds configuration validation only. OAuth token acquisition, flight-offer requests, response normalization, and provider registration belong to subsequent integration work.

## Validation

```bash
npm test
npm run typecheck
```
