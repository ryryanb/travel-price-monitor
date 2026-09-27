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

The repository will eventually contain:

```text
apps/
services/
infrastructure/
packages/
docs/
tests/
```

These directories will be introduced as their corresponding implementation stories are completed.

## License

This project is licensed under the MIT License.
