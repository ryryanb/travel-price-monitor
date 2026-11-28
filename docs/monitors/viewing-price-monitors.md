# MON-011 — View Monitor

## Endpoint

`GET /monitors/{monitorId}` (API Gateway stage prefix applies, e.g. `/v1/monitors/{monitorId}`).

The endpoint requires a valid Cognito User Pool ID token in the `Authorization` header. API Gateway validates the token, and the monitor is looked up using the verified `sub` claim together with the requested monitor ID. The owner ID is never accepted from a query string or request body.

## Success response

A successful request returns `200 OK` and the monitor details:

```json
{
  "monitorId": "monitor-123",
  "userId": "cognito-user-sub",
  "name": "Tokyo Winter Trip",
  "origin": "MNL",
  "destination": "NRT",
  "departureDate": "2027-02-15",
  "returnDate": "2027-02-22",
  "targetPrice": 500,
  "currency": "USD",
  "status": "ACTIVE",
  "createdAt": "2026-10-20T12:00:00.000Z",
  "updatedAt": "2026-10-20T12:00:00.000Z"
}
```

The `name` field contains the user-provided monitor name. The `returnDate` property is omitted for one-way trips. Older stored records without a name are returned with a fallback label based on their route and departure date.

## Errors

- `400`: monitor ID is missing.
- `401`: no authenticated Cognito subject is available (normally rejected by API Gateway first).
- `404`: no monitor with that ID exists for the authenticated user. A monitor belonging to another user also returns `404`, avoiding disclosure of its existence.
- `500`: monitor table configuration is missing.
- `502`: storage lookup failed or a stored record is invalid.

## Storage and authorization

The repository performs a DynamoDB `GetItem` using the existing composite key: `PK=USER#<authenticated-user-id>` and `SK=MONITOR#<monitor-id>`. A strongly consistent read is requested. The user ID is derived only from the validated authorizer claims, so knowing another monitor's ID does not grant access.

## Tests

Run the standard checks from the repository root:

```bash
npm run typecheck && npm test
```

## MON-016 — List My Monitors

### Endpoint

`GET /monitors` (under the configured API Gateway stage, for example `/v1/monitors`).

The response is a `200 OK` JSON object with a `monitors` array, even when the list is empty:

```json
{
  "monitors": [
    {
      "monitorId": "monitor-123",
      "userId": "cognito-user-sub",
      "name": "Tokyo Winter Trip",
      "origin": "MNL",
      "destination": "NRT",
      "departureDate": "2027-02-15",
      "returnDate": "2027-02-22",
      "passengerCount": 1,
      "targetPrice": 500,
      "currency": "USD",
      "status": "ACTIVE",
      "createdAt": "2026-10-20T12:00:00.000Z",
      "updatedAt": "2026-10-20T12:00:00.000Z"
    }
  ]
}
```

Results are sorted by creation timestamp, newest first. The DynamoDB implementation queries `PK=USER#<current-user-id>` with `begins_with(SK, 'MONITOR#')`, follows `LastEvaluatedKey` for all result pages, and never performs a table scan. Legacy records without `name` or `passengerCount` use the same fallbacks as the single-monitor endpoint.

In Cognito mode, the caller's verified `sub` claim selects the user partition. In explicit LocalStack development mode (`LOCAL_AUTH_DISABLED=true`), the fixed `local-dev-user` partition is used and API Gateway authorization is off. This mode is intended only for local development; do not expose it publicly or enable it for production deployments.

### Frontend

Visit `/monitors` to see your saved flight monitors. The page shows each monitor's name, route, dates, passenger count, target fare, and current stored status. It includes a refresh action and loading, error, and empty states. Use the Create monitor link to add a new monitor.

Configure `PUBLIC_API_BASE_URL` to point to your deployed API stage, and `PUBLIC_LOCAL_AUTH_DISABLED=true` only for the local unauthenticated setup.

### Errors

- `401` if authentication is required and the authorizer subject is unavailable.
- `500` if the monitor table name is not configured.
- `502` for database errors or invalid stored monitor records (without exposing internal details).

### Tests

```bash
npm run typecheck
npm test
npm --prefix apps/web run check

# With LocalStack running:
npm run test:localstack
```

The LocalStack integration test exercises ownership isolation, ordering, older records, and empty lists. The DynamoDB repository processes all result pages, rather than returning only the first page.
