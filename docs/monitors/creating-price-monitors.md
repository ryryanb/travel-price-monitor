# MON-001 — Create Price Monitor

## Endpoint

`POST /monitors` (API Gateway stage prefix applies, e.g. `/v1/monitors`).

The endpoint requires a valid Cognito User Pool ID token sent as `Authorization: <id-token>`. API Gateway validates the token. API Gateway validates the token, and the owner ID is taken from the verified `sub` claim; clients cannot choose another user's owner ID.

## Request

```json
{
  "origin": "MNL",
  "destination": "NRT",
  "departureDate": "2027-02-15",
  "returnDate": "2027-02-22",
  "targetPrice": 500,
  "currency": "USD"
}
```

- `origin`, `destination`: required three-letter IATA airport codes; normalized to uppercase and must differ.
- `departureDate`: required real calendar date in `YYYY-MM-DD` format, today or later.
- `returnDate`: optional for one-way trips; if supplied, must be a real date on or after departure.
- `targetPrice`: required positive finite number, up to 10,000,000; stored to two decimal places.
- `currency`: optional three-letter currency code, defaults to `USD`, normalized to uppercase.

## Success and errors

A successful request returns `201 Created` with the saved monitor, including generated `monitorId`, authenticated `userId`, `ACTIVE` status, and timestamps.

- `400`: missing/malformed JSON or invalid trip criteria.
- `401`: missing authenticated subject (normally rejected by API Gateway first).
- `500`: monitor table configuration missing.
- `502`: persistence failure.

## Storage

The monitor is stored in DynamoDB using `PK=USER#<userId>` and `SK=MONITOR#<monitorId>`, with a conditional put to prevent accidental overwrite. The table uses on-demand billing. Creating a monitor does not yet execute a flight search or schedule price checks.

## Automated tests

Run from the repository root:

```bash
npm run typecheck && npm test
```

The ordinary monitor service and handler tests use an in-memory repository and do not require AWS resources.

## LocalStack DynamoDB integration test

This opt-in test provisions a temporary DynamoDB table in LocalStack, invokes the real monitor handler, checks the `201` response and reads the saved record back from DynamoDB. It deletes its temporary table at the end. It does not deploy to AWS or call API Gateway.

1. Start LocalStack and wait for the `Ready.` message:

   ```bash
   docker compose up -d
   curl http://localhost:4566/_localstack/health
   ```

2. Install dependencies after pulling the changes so npm updates the lockfile:

   ```bash
   npm install
   ```

3. Run the integration test:

   ```bash
   RUN_LOCALSTACK_INTEGRATION=1 DYNAMODB_ENDPOINT_URL=http://localhost:4566 AWS_REGION=ap-southeast-1 node --experimental-strip-types --test tests/monitor-localstack.integration.test.ts
   ```

4. Re-run the ordinary checks:

   ```bash
   npm run typecheck && npm test
   ```

Without `RUN_LOCALSTACK_INTEGRATION=1`, the integration test is skipped during the normal test suite. Dummy local credentials are used only to sign requests to LocalStack; do not put AWS credentials in this test.
