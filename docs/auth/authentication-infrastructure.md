# Authentication Infrastructure

The CDK stack in `infrastructure/cdk/` creates the Cognito User Pool, User Pool App Client with `USER_PASSWORD_AUTH`, register/login Lambda functions, and API Gateway routes `POST /v1/auth/register` and `POST /v1/auth/login`.

## Install

```bash
npm --prefix infrastructure/cdk install
```

## AWS

```bash
npm --prefix infrastructure/cdk run synth
npm --prefix infrastructure/cdk run deploy
```

The deployment outputs the User Pool ID, App Client ID, and authentication URLs.

## LocalStack

Start LocalStack, then run:

```bash
npm run dev:infra
npm --prefix infrastructure/cdk run synth:local
npm --prefix infrastructure/cdk run deploy:local
```

Use the emitted API URL to call the register and login endpoints. Cognito may require confirmation after registration.

For deterministic local verification, create a disposable user, confirm it, and set a permanent password through the LocalStack Cognito endpoint using the AWS CLI.

## Security

Passwords are sent only to Cognito and are never stored by the application. Tokens are credentials and must not be logged. The development User Pool uses `RemovalPolicy.DESTROY`; change this for production.