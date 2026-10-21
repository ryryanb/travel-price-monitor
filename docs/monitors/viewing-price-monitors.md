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

The `returnDate` property is omitted for one-way trips.

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
