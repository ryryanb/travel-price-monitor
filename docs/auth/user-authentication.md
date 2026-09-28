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

## Scope

This story implements credential authentication and token issuance. Refresh/revocation, logout, confirmation, password reset, and authenticated monitor authorization are separate stories.
