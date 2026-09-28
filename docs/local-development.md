# Local Development

## Purpose

This document describes how to run the Travel Price Monitor development environment locally.

The MVP uses AWS-managed services in production. During local development, Docker Compose runs LocalStack as an AWS service emulator so that AWS-dependent application code can be developed without requiring a deployed AWS environment.

## Prerequisites

Install:

- Node.js 22
- npm
- Docker
- Docker Compose

The repository pins the Node.js major version through `.nvmrc`.

Verify the tools:

```bash
node --version
npm --version
docker --version
docker compose version
```

## Initial setup

From the repository root:

```bash
npm install
```

Create a local environment file when application configuration is needed:

```bash
cp .env.example .env.local
```

Do not commit `.env.local`. It is intended for developer-specific values.

## Start local AWS services

Start the LocalStack environment:

```bash
npm run dev:infra
```

The local AWS-compatible endpoint is:

```text
http://localhost:4566
```

The configured local AWS region is:

```text
ap-southeast-1
```

Check the container:

```bash
docker compose ps
```

View logs:

```bash
npm run dev:infra:logs
```

## Stop local services

Stop the containers while retaining the named LocalStack volume:

```bash
npm run dev:infra:down
```

The named volume preserves LocalStack state between container restarts.

To remove the local service containers and their persisted volume:

```bash
docker compose down -v
```

Use this only when a clean local AWS state is required.

## Local AWS configuration

When application code begins using the AWS SDK, local development should point AWS clients at the LocalStack endpoint rather than production AWS resources.

The intended local configuration is:

| Setting | Local value |
|---|---|
| AWS endpoint | `http://localhost:4566` |
| AWS region | `ap-southeast-1` |
| Credentials | Local development credentials only |
| Environment | `development` |

The application should keep endpoint configuration separate from production configuration so that deployed Lambdas use normal AWS service endpoints.

No real AWS credentials should be required for the LocalStack environment.

## Local service scope

The initial LocalStack configuration provides emulated endpoints for the AWS services planned for the MVP:

- DynamoDB
- S3
- SES
- Cognito
- API Gateway
- Lambda
- EventBridge
- SQS

Not every service is required by the application immediately. Services can be reduced later if the MVP implementation establishes a smaller local dependency set.

## TypeScript validation

Run strict TypeScript validation with:

```bash
npm run typecheck
```

## Expected development workflow

As application components are introduced, the normal local workflow will be:

```text
1. npm install
       |
       v
2. npm run dev:infra
       |
       v
3. Start the frontend/backend development processes
       |
       v
4. Develop against LocalStack
       |
       v
5. npm run typecheck / tests
       |
       v
6. npm run dev:infra:down
```

The frontend and backend start commands will be added when their respective applications are implemented. SETUP-007 establishes the shared local infrastructure and development conventions; it does not prematurely create application runtime code.

## Production boundary

Local development must not silently fall back to production AWS resources.

Production AWS configuration belongs to deployment/infrastructure stories and should use AWS-managed configuration, IAM roles, and secrets rather than local developer credentials.

## Troubleshooting

### Docker is not running

Start Docker Desktop (or the Docker daemon) and rerun:

```bash
npm run dev:infra
```

### Port 4566 is already in use

Find the process/container using port 4566 and stop it, or change the host-side port mapping in `docker-compose.yml`. Keep the container port at `4566`.

### Reset local AWS state

Run:

```bash
docker compose down -v
npm run dev:infra
```

This removes the persisted LocalStack volume and starts a fresh local environment.
