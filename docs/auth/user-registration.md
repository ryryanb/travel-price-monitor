# User Registration

## Endpoint

`POST /auth/register` accepts a JSON request containing an email address and password.

### Request

```json
{
  "email": "user@example.com",
  "password": "password1"
}
```

### Success

The endpoint returns HTTP `201 Created` with the Cognito user identifier and confirmation state. If Cognito requires email confirmation, the response includes delivery metadata.

### Validation

- Email is trimmed, normalized to lowercase, and validated for basic email syntax.
- Password must contain at least eight characters before the request is sent to Cognito.
- Cognito remains the authoritative source for the production password policy and account lifecycle.

### Error mapping

| Condition | HTTP status |
|---|---:|
| Missing/invalid JSON body | 400 |
| Invalid email or password | 400 |
| Email already registered | 409 |
| Authentication service configuration failure | 500 |
| Unexpected Cognito failure | 502 |

The API does not store plaintext passwords. Password handling and user identity are delegated to Amazon Cognito.

## Configuration

The API requires `COGNITO_USER_POOL_CLIENT_ID`. `COGNITO_REGION` defaults to `ap-southeast-1`. `COGNITO_ENDPOINT_URL` can point the service at LocalStack during local development and should be empty for AWS Cognito.

## Scope

This story implements registration. Login, token refresh, logout, email-confirmation workflows, and authenticated monitor authorization are separate authentication stories.
