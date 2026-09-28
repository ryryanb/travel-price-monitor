# Travel Price Monitor

A serverless travel price monitoring platform that tracks travel prices over time and sends alerts when monitored prices meet user-defined thresholds.

## Project Status

🚧 **Early development — MVP foundation**

This project is being developed as a project focused on serverless architecture, event-driven systems, cloud infrastructure, and automated price monitoring.

## Planned MVP

The MVP will allow users to:

* Create a flight price monitor
* Specify origin and destination
* Specify departure and return dates
* Define a maximum target price
* Schedule automated price checks
* Retrieve and normalize price information from a supported provider
* Store price observations
* Compare current prices with previous observations
* Trigger alerts when the target price is reached
* Receive email notifications
* View monitored trips and their latest prices

## Planned Architecture

| Component      | Technology                   |
| -------------- | ---------------------------- |
| Frontend       | SvelteKit + TypeScript       |
| Backend        | AWS Lambda + TypeScript      |
| API            | Amazon API Gateway           |
| Database       | Amazon DynamoDB              |
| Scheduling     | Amazon EventBridge Scheduler |
| Queueing       | Amazon SQS                   |
| Authentication | Amazon Cognito               |
| Notifications  | Amazon SES                   |
| Object Storage | Amazon S3                    |
| CDN            | Amazon CloudFront            |
| Infrastructure | AWS CDK                      |
| CI/CD          | GitHub Actions               |
| Observability  | Amazon CloudWatch            |

## Development Principles

* Serverless-first architecture
* Event-driven processing
* Infrastructure as code
* Secure handling of credentials and secrets
* Provider abstraction for travel-price sources
* Idempotent scheduled processing
* Resilient external-service integration
* Automated testing and CI/CD
* Minimize unnecessary infrastructure and operating costs

## MVP Scope

The initial MVP will focus on **flight price monitoring**.

Hotels, trains, activities, flexible-destination searches, multiple providers, and other travel categories may be introduced in later versions.

## Repository Structure

The project is organized into separate application, service, infrastructure, shared-code, documentation, and testing areas.

```text
apps/
└── web/                    # SvelteKit frontend

services/
└── api/                    # Backend/API services

infrastructure/
└── cdk/                    # AWS CDK infrastructure

packages/
└── shared/                 # Shared TypeScript types and utilities

docs/
├── architecture/           # Architecture and design documentation
└── README.md

tests/                      # Cross-component and integration tests
```

Implementation will be added to these areas through subsequent development stories.

## Development

### Prerequisites

* Node.js 22
* npm

### Local development

The local development environment uses Docker Compose with LocalStack to emulate the AWS services used by the MVP. This allows AWS-dependent development to happen without connecting the application to a deployed AWS environment.

Prerequisites:

* Node.js 22
* npm
* Docker with Docker Compose

Start the local AWS services:

```bash
npm run dev:infra
```

Check that the local infrastructure is running:

```bash
docker compose ps
```

Stop the local infrastructure:

```bash
npm run dev:infra:down
```

Follow LocalStack logs:

```bash
npm run dev:infra:logs
```

The LocalStack endpoint is `http://localhost:4566` and the local AWS region is `ap-southeast-1`.

See [Local Development](docs/local-development.md) for configuration, environment variables, and the expected local workflow.

### Automated testing

The project uses Node.js 22's built-in test runner for the current test suite. This keeps the early project scaffold dependency-light while providing a standard automated test command. Application and SvelteKit-specific testing tools can be introduced when those components are implemented.

Run the test suite once:

```bash
npm test
```

Run the test suite in watch mode during development:

```bash
npm run test:watch
```

Continuous integration runs type checking and automated tests for pushes and pull requests targeting `main`.

### TypeScript

The project uses TypeScript with strict type checking enabled.

Run the TypeScript compiler without emitting JavaScript:

```bash
npm run typecheck
```

The shared TypeScript configuration is defined in `tsconfig.base.json`. Individual applications and services will extend this configuration as they are introduced.

## License

This project is licensed under the MIT License.
