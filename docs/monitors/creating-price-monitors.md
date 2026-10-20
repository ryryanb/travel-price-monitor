# MON-001 — Create Price Monitor

## Endpoint

`POST /monitors` (API Gateway stage prefix applies, e.g. `/v1/monitors`).

The endpoint requires a valid Cognito User Pool access token. Send it as:

`Authorization: Bearer <access-token>`

The API Gateway Cognito authorizer validates the token. The owner ID is taken from the verified `sub` claim; clients cannot choose another user's owner ID.

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

## Success

Returns `201 Created` with the saved monitor, including generated `monitorId`, authenticated `userId`, `ACTIVE` status, and creation/update timestamps.

## Errors

- `400`: missing/malformed JSON or invalid trip criteria.
- `401`: missing authenticated subject (normally the API Gateway authorizer rejects invalid tokens before invoking Lambda).
- `500`: monitor table configuration missing.
- `502`: persistence failure.

## Storage and behavior

The monitor is stored in DynamoDB using `PK=USER#<userId>` and `SK=MONITOR#<monitorId>`, with a conditional put to prevent accidental overwrite. The table uses on-demand billing. Creating a monitor does not yet execute a flight search or schedule price checks; those are separate stories.

## Local acceptance gate

Run from the repository root:

```bash
npm run typecheck && npm test
```

The monitor service and handler tests use an in-memory repository, so they do not require deployed AWS resources.
