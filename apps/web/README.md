# Travel Price Monitor — Web

SvelteKit + TypeScript frontend for Travel Price Monitor.

## Run locally

```bash
cd apps/web
cp .env.example .env
# Edit .env and set PUBLIC_API_BASE_URL to your API Gateway base URL.
npm install
npm run dev
```

Open the local URL printed by Vite.

## Create Monitor Form (UI-005)

The form collects a monitor name, origin and destination IATA codes, departure date, optional return date, passenger count, target price, and currency. It validates the criteria before submitting to `POST /monitors`.

The API currently expects a Cognito ID token in the `Authorization` header. When the frontend authentication flow is connected, it should store the current ID token for the page to read at `sessionStorage["travelPriceMonitor.idToken"]`. If no token is present, the form displays a sign-in-required message and does not send a request.

Because this app is built as a static site for S3/CloudFront, `PUBLIC_API_BASE_URL` is read at build time. Configure it in `.env` before running `npm run build`. The API must allow the frontend origin through CORS.

## Commands

- `npm run dev` — local development server
- `npm run check` — Svelte/TypeScript diagnostics
- `npm run build` — static production build for hosting on S3/CloudFront
- `npm run preview` — preview the production build
