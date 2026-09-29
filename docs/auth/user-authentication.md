# User Authentication

## Endpoint

`POST /auth/login` authenticates a registered user with Amazon Cognito.

### Request

```json
{"email":"user@example.com","password":"password1"}
```

The email is trimmed and normalized to lowercase. The password is passed directly to Cognito and is never stored or logged.

### Success

HTTP `200 OK` returns Cognito-issued access and ID tokens, plus a refresh token when Cognito provides one.

### Error mapping

| Condition | HTTP status |
|---|---:|
| Missing/invalid JSON body | 400 |
| Invalid email or missing password | 400 |
| Invalid credentials | 401 |
| Account not confirmed or password reset required | 403 |
| Authentication service configuration failure | 500 |
| Unexpected Cognito failure | 502 |

Unknown users and incorrect passwords intentionally return the same `401` response.

### Cognito configuration

The API uses Cognito's `USER_PASSWORD_AUTH` flow. The User Pool App Client must permit that flow.

Required: `COGNITO_USER_POOL_CLIENT_ID`; `COGNITO_REGION` defaults to `ap-southeast-1`; `COGNITO_ENDPOINT_URL` is optional for LocalStack.

Tokens are credentials and must not be logged.

## Session persistence

`POST /auth/refresh` accepts a Cognito refresh token and returns a new access token and ID token without requiring the user to enter their password again.

### Request

```json
{"refreshToken":"cognito-refresh-token"}
```

### Success

HTTP `200 OK` returns a refreshed access token, ID token, expiry, and token type. Cognito manages the refresh-token lifetime; the API does not issue or replace the refresh token.

### Errors

| Condition | HTTP status |
|---|---:|
| Missing/invalid JSON body | 400 |
| Missing refresh token | 400 |
| Invalid or expired refresh token | 401 |
| Unexpected Cognito failure | 502 |

The client should keep the refresh token in a secure client-side session mechanism and use it only to obtain new short-lived tokens. Tokens must never be logged or exposed in URLs.

## Scope

This story implements credential authentication, token issuance, and session refresh. Logout/revocation, confirmation, password reset, and authenticated monitor authorization are separate stories.
