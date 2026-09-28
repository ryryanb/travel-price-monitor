# MVP Application Architecture

## 1. Purpose

This document defines the MVP architecture for Travel Price Monitor.

The MVP monitors flight prices for user-defined searches, checks prices on a schedule, stores observations, compares current prices with alert thresholds, and sends email notifications when a threshold is met.

The architecture is intentionally serverless and separates the web application, synchronous API operations, scheduled price checks, persistence, and notifications.

## 2. MVP Scope

The MVP supports:

- User registration and authentication
- Creating, viewing, updating, pausing, and deleting flight-price monitors
- Origin and destination airports
- Departure and return dates
- Passenger count
- Maximum target price
- Scheduled price checks
- Price observation storage
- Threshold comparison
- Email alerts
- Dashboard display of monitor status and latest price

The MVP initially supports one legitimate travel-price provider. Additional providers and travel categories are future extensions.

## 3. High-Level Architecture

```text
                         +----------------------+
                         |      Web Browser     |
                         +----------+-----------+
                                    |
                                    | HTTPS
                                    v
                         +----------------------+
                         |   SvelteKit Web App  |
                         |      (S3/CloudFront) |
                         +----------+-----------+
                                    |
                                    | HTTPS API
                                    v
                         +----------------------+
                         |      API Gateway     |
                         +----------+-----------+
                                    |
                                    v
                         +----------------------+
                         |   API Lambda(s)      |
                         |  Authentication*     |
                         |  Monitor CRUD        |
                         +----+------------+----+
                              |            |
                              |            |
                              v            v
                       +-------------+  +----------------+
                       |  DynamoDB   |  |    Cognito     |
                       | Monitors &  |  | User identity  |
                       | observations|  +----------------+
                       +------+------+
                              ^
                              |
                              | write observations / update status
                              |
+----------------+    trigger |    +----------------------+
| EventBridge    +------------+--->| Check Lambda         |
| Scheduler      |                 | Price-check worker   |
+----------------+                 +----------+-----------+
                                             |
                                             | provider API
                                             v
                                  +----------------------+
                                  | Travel Price Provider|
                                  +----------------------+
                                             |
                                             | normalized result
                                             v
                                  +----------------------+
                                  | Check / Compare      |
                                  | threshold logic      |
                                  +----------+-----------+
                                             |
                              alert required |
                                             v
                                  +----------------------+
                                  |       SES            |
                                  |   Email delivery     |
                                  +----------------------+
```

`*` Cognito is the identity service; API Lambda validates authenticated requests and applies application authorization.

## 4. Component Responsibilities

### 4.1 SvelteKit Web Application

**Technology:** TypeScript + SvelteKit

Responsibilities:

- Render the user interface
- Provide monitor creation and management screens
- Display current monitor state and latest price
- Display price history
- Submit authenticated API requests
- Show success, validation, and error states

The frontend does not directly access DynamoDB, SES, EventBridge, or the external travel provider.

### 4.2 CloudFront and S3

Responsibilities:

- Deliver the static web application assets
- Provide HTTPS delivery and caching
- Reduce direct load on application infrastructure

The frontend deployment strategy may evolve with SvelteKit requirements, but the MVP keeps the web delivery layer separate from backend APIs.

### 4.3 Amazon Cognito

Responsibilities:

- User registration
- Login
- Token issuance
- Password and account lifecycle
- Authentication identity

Cognito handles authentication; application authorization remains the responsibility of the API layer.

### 4.4 API Gateway

Responsibilities:

- Expose HTTPS API endpoints
- Route requests to API Lambda functions
- Enforce API-level request boundaries
- Integrate authentication context with the backend

Representative endpoints:

- `POST /auth/register`
- `POST /monitors`
- `GET /monitors`
- `GET /monitors/{id}`
- `PATCH /monitors/{id}`
- `DELETE /monitors/{id}`
- `POST /monitors/{id}/pause`
- `POST /monitors/{id}/resume`
- `GET /monitors/{id}/history`

### 4.5 API Lambda

Responsibilities:

- Validate request input
- Enforce user ownership and authorization
- Execute monitor CRUD operations
- Read monitor and history data
- Return API responses
- Keep application/business logic separate from infrastructure configuration

The API Lambda does not perform scheduled price checks synchronously with user requests.

### 4.6 DynamoDB

Responsibilities:

- Store monitor definitions
- Store normalized price observations
- Store monitor status and scheduling metadata
- Support queries by user and monitor

The MVP uses DynamoDB as the primary application datastore.

Price observations are stored as historical records rather than overwriting the previous price.

### 4.7 EventBridge Scheduler

Responsibilities:

- Trigger scheduled monitor checks
- Invoke the price-check workflow according to each monitor's configured frequency
- Keep scheduling independent from the web/API request lifecycle

A schedule should not itself contain business logic. It triggers the checking workflow.

### 4.8 Price-Check Lambda

Responsibilities:

1. Receive a monitor check request.
2. Load the monitor configuration.
3. Validate that the monitor is active.
4. Call the configured travel-price provider through the provider abstraction.
5. Normalize the provider response.
6. Store the price observation.
7. Compare the current price with the configured threshold.
8. Initiate notification when the alert condition is met.
9. Record check status and timing metadata.
10. Handle provider failures without corrupting historical data.

The price-check Lambda is deliberately separate from API Lambda responsibilities.

### 4.9 Travel Price Provider

The provider integration is isolated behind a common interface:

```text
TravelPriceProvider.search(criteria) -> PriceResults
```

Responsibilities:

- Translate application search criteria into provider-specific requests
- Authenticate with the provider when required
- Retrieve price data
- Normalize provider-specific responses into application models

Provider credentials are configuration/secrets, not source code.

The MVP should use a provider that permits the intended automated access. Web scraping is not the architectural foundation of the MVP.

### 4.10 Amazon SES

Responsibilities:

- Send threshold alert emails
- Provide a single notification mechanism for the MVP

The notification component receives an application-level alert request rather than knowing how price checks are performed.

## 5. Main Data Flows

### 5.1 Create Monitor

```text
Browser
  -> API Gateway
  -> API Lambda
  -> validate request
  -> DynamoDB
  -> response to Browser
```

The API creates the monitor and its scheduling metadata. Scheduling infrastructure is responsible for subsequent checks.

### 5.2 Scheduled Price Check

```text
EventBridge Scheduler
  -> Price-Check Lambda
  -> DynamoDB (load monitor)
  -> Travel Price Provider
  -> normalize result
  -> DynamoDB (store observation)
  -> threshold comparison
  -> SES when alert condition is met
```

### 5.3 View History

```text
Browser
  -> API Gateway
  -> API Lambda
  -> DynamoDB
  -> API response
  -> Browser
```

The browser never reads DynamoDB directly.

### 5.4 Alert

```text
Price-Check Lambda
  -> threshold evaluation
  -> notification request
  -> SES
  -> user's email
  -> record alert/check state in DynamoDB
```

## 6. Separation of Responsibilities

| Concern | Component |
|---|---|
| User interface | SvelteKit |
| Static web delivery | S3 + CloudFront |
| Authentication | Cognito |
| HTTPS API entry point | API Gateway |
| Synchronous application operations | API Lambda |
| Monitor persistence | DynamoDB |
| Scheduled execution | EventBridge Scheduler |
| Price retrieval | Price-Check Lambda + provider adapter |
| External travel-price access | Travel Price Provider |
| Price history | DynamoDB |
| Threshold evaluation | Price-Check Lambda |
| Email delivery | SES |
| Infrastructure definition | AWS CDK |
| Logs/metrics | CloudWatch |
| Distributed tracing | OpenTelemetry |

## 7. Important Design Decisions

### Serverless-first

The MVP uses managed AWS services and Lambda rather than always-running application servers.

This keeps the baseline infrastructure small and allows scheduled workloads to run only when needed.

### Asynchronous scheduled checking

Price checks are not performed as part of a user's API request. Scheduled work is isolated so provider latency or failure does not block normal dashboard operations.

### Provider abstraction

Provider-specific code is isolated behind an interface. This allows additional providers to be added without redesigning monitors, history, alerts, or the frontend.

### DynamoDB as the source of application state

Monitor definitions, observations, and relevant status are persisted in DynamoDB. External provider responses are normalized before being stored.

### Email-only notifications for MVP

SES email is sufficient for the initial alert channel. SMS, push notifications, and other channels are deferred.

### No direct frontend access to AWS data stores

The browser communicates with the application API rather than directly accessing DynamoDB or other backend services. This centralizes authorization and business rules.

### Infrastructure as code

AWS resources are defined with AWS CDK and TypeScript rather than manually configured as the normal deployment path.

## 8. Reliability Boundaries

The architecture treats the external provider as an unreliable dependency.

The price-check workflow should support:

- Request timeouts
- Retries with backoff where appropriate
- Rate limiting
- Provider-specific error handling
- Circuit-breaking behavior if needed
- Idempotent processing
- Logging of failed checks
- Preservation of previously stored observations when a new check fails

A failed provider request must not be interpreted as a zero price or overwrite a valid historical observation.

## 9. Security Boundaries

- Authentication is handled by Cognito.
- API authorization verifies that a user can access the requested monitor.
- Provider API credentials are never stored in source control.
- Local environment files are excluded from Git.
- Production secrets should be supplied through AWS-managed configuration/secrets mechanisms.
- The frontend must not receive provider credentials.
- Backend components use least-privilege IAM permissions.

## 10. MVP vs Future Architecture

The MVP intentionally does not require:

- SQS-based worker fan-out
- Multiple travel providers
- Hotel, train, or activity monitoring
- Flexible-destination searches
- SMS or push notifications
- Collaborative monitors
- Complex analytics
- Machine-learning price prediction

SQS and additional workers can be introduced when monitoring volume justifies asynchronous fan-out.

## 11. Deployment Shape

The intended deployment is:

```text
GitHub Actions
    |
    +--> SvelteKit build --> S3 --> CloudFront
    |
    +--> CDK deployment --> AWS infrastructure
                              |
                              +--> API Gateway
                              +--> Lambda
                              +--> DynamoDB
                              +--> Cognito
                              +--> EventBridge Scheduler
                              +--> SES
                              +--> CloudWatch
```

CI/CD implementation is covered by later setup stories and is not required for this architecture document.

## 12. Architectural Goal

The MVP should remain small enough to operate cheaply while keeping clear boundaries between:

1. presentation,
2. authenticated API operations,
3. scheduled price checking,
4. provider integration,
5. persistence,
6. threshold evaluation, and
7. notification delivery.

Those boundaries are intended to make later expansion—additional providers, travel categories, higher monitoring volume, and richer alerting—possible without replacing the core application model.
