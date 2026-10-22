# Travel Price Monitor — Web

SvelteKit + TypeScript frontend for Travel Price Monitor.

## Run the frontend against LocalStack

These instructions assume you run Docker Compose and the LocalStack integration from the repository root on macOS.

### 1. Start LocalStack

From the repository root:

```bash
npm run dev:infra
curl http://localhost:4566/_localstack/health
```

Wait until LocalStack reports that its services are available.

### 2. Deploy the API stack to LocalStack

Install the CDK dependencies if you have not already:

```bash
npm --prefix infrastructure/cdk install
```

Deploy the stack to LocalStack. On macOS, Lambda containers use `host.docker.internal` to reach the LocalStack endpoint on the host:

```bash
LOCALSTACK_ENDPOINT_URL=http://host.docker.internal:4566 \
WEB_ORIGIN=http://localhost:5173 \
npm --prefix infrastructure/cdk run deploy:local
```

This stack creates the LocalStack Cognito User Pool, app client, API Gateway routes, and DynamoDB table. The Lambda functions use the LocalStack endpoint for Cognito and DynamoDB calls.

### 3. Get the LocalStack API base URL

List the stack outputs:

```bash
aws --endpoint-url=http://localhost:4566 \
  --region ap-southeast-1 \
  --no-sign-request \
  cloudformation describe-stacks \
  --stack-name TravelPriceMonitorAuthApiStack \
  --query 'Stacks[0].Outputs'
``

If your AWS CLI requires credentials, set disposable LocalStack-only credentials in that terminal first:

```bash
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=ap-southeast-1
``

Find the API ID using the LocalStack API Gateway endpoint:

```bash
aws --endpoint-url=http://localhost:4566 apigateway get-rest-apis \
  --query 'items[].{id:id,name:name}'
``

For LocalStack, the frontend API base URL is typically:

```text
http://localhost:4566/restapis/<API_ID>/v1/_user_request_
``

Replace `<API_ID>` with the ID for `travel-price-monitor-api`. If your LocalStack version prints an invocation URL in the stack outputs, prefer that URL.

### 4. Configure and start the frontend

```bash
cd apps/web
cp .env.example .env
``

Set `PUBLIC_API_BASE_URL` in `apps/web/.env` to the LocalStack API base URL from step 3, for example:

```dotenv
PUBLIC_API_BASE_URL=http://localhost:4566/restapis/<API_ID>/v1/_user_request_
``

Then install and start the web app:

```bash
npm install
npm run check
npm run dev
``

Open the local Vite URL, normally `http://localhost:5173`.

### 5. Sign in before submitting the form

UI-005 currently implements the create form, not a login screen. The form expects a Cognito ID token in `sessionStorage["travelPriceMonitor.idToken"]`.

If you already have a confirmed LocalStack Cognito user, call the LocalStack `POST /auth/login` endpoint with that user's credentials. Use the `LoginUrl` output if provided by CDK; otherwise, the URL is the LocalStack API base URL plus `/auth/login`.

```bash
curl -sS -X POST "$LOCALSTACK_API_BASE_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"YOUR_LOCAL_TEST_EMAIL","password":"YOUR_LOCAL_TEST_PASSWORD"}'
```

The response includes `idToken`. Copy that token into the browser developer console on the frontend tab:

```js
sessionStorage.setItem("travelPriceMonitor.idToken", "PASTE_LOCAL_ID_TOKEN_HERE");
location.reload();
```

Use only a disposable LocalStack test account and token. Do not commit tokens or add them to `.env`.

If you do not have a confirmed LocalStack user yet, follow `docs/auth/authentication-infrastructure.md` to create and confirm a disposable test user. LocalStack/Cognito support can vary by edition and version; if the API Gateway Cognito authorizer rejects a valid local ID token, check the LocalStack logs and authorizer support before debugging the form itself.

### 6. Test monitor creation

Enter a monitor name, route (for example `MNL` → `NRT`), future travel dates, passenger count, currency, and target price. Submit the form.

A successful request should show the created monitor name and ID. You can verify the record in LocalStack DynamoDB:

```bash
aws --endpoint-url=http://localhost:4566 \
  --region ap-southeast-1 \
  dynamodb scan \
  --table-name travel-price-monitor-monitors
``

If the API URL is wrong, inspect the LocalStack API Gateway routes and stack outputs. If the browser reports a CORS error, redeploy the API after setting `WEB_ORIGIN=http://localhost:5173` and make sure the deployed Lambda functions include the matching `Access-Control-Allow-Origin` header.

## Create Monitor Form (UI-005)

The form collects a monitor name, origin and destination IATA codes, departure date, optional return date, passenger count, target price, and currency. It validates the criteria before submitting to `POST /monitors`.

The API expects a Cognito ID token in the `Authorization` header. The form reads the token from `sessionStorage["travelPriceMonitor.idToken"]`; if no token is present, it displays a sign-in-required message and does not send the request.

Because this app is built as a static site for S3/CloudFront, `PUBLIC_API_BASE_URL` is read at build time. Configure it in `.env` before running `npm run build`. The API must allow the frontend origin through CORS.

## Commands

- `npm run dev` — local development server
- `npm run check` — Svelte/TypeScript diagnostics
- `npm run build` — static production build for hosting on S3/CloudFront
- `npm run preview` — preview the production build
