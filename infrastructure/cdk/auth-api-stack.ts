import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export class AuthApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: "travel-price-monitor-users",
      signInAliases: { email: true },
      selfSignUpEnabled: true,
      autoVerify: { email: true },
      passwordPolicy: { minLength: 8, requireLowercase: true, requireUppercase: true, requireDigits: true, requireSymbols: false },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    const userPoolClient = userPool.addClient("WebClient", {
      userPoolClientName: "travel-price-monitor-web-client",
      authFlows: { userPassword: true },
      preventUserExistenceErrors: true,
      generateSecret: false,
      refreshTokenValidity: cdk.Duration.days(30),
    });
    const monitorsTable = new dynamodb.Table(this, "MonitorsTable", {
      tableName: "travel-price-monitor-monitors",
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    // Set LOCALSTACK_ENDPOINT_URL when deploying locally (for example,
    // http://host.docker.internal:4566 on macOS). Lambda containers then
    // route Cognito and DynamoDB SDK calls back to LocalStack rather than AWS.
    const localStackEndpoint = process.env.LOCALSTACK_ENDPOINT_URL || "";

    const common = {
      runtime: lambda.Runtime.NODEJS_22_X,
      timeout: cdk.Duration.seconds(15),
      memorySize: 256,
      environment: {
        COGNITO_USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        COGNITO_REGION: cdk.Stack.of(this).region,
        COGNITO_ENDPOINT_URL: localStackEndpoint,
      },
      bundling: {
        target: "node22",
        format: nodejs.OutputFormat.ESM,
        minify: false,
        sourceMap: true,
      },
    };

    const currentFile = fileURLToPath(import.meta.url);
    const currentDirectory = path.dirname(currentFile);
    const repositoryRoot = path.resolve(currentDirectory, "../..");

    const registerLambda = new nodejs.NodejsFunction(this, "RegisterLambda", {
      ...common,
      entry: path.join(
        repositoryRoot,
        "services/api/src/handlers/auth/register.ts",
      ),
      projectRoot: repositoryRoot,
      functionName: "travel-price-monitor-auth-register",
    });

    const loginLambda = new nodejs.NodejsFunction(this, "LoginLambda", {
      ...common,
      entry: path.join(
        repositoryRoot,
        "services/api/src/handlers/auth/login.ts",
      ),
      projectRoot: repositoryRoot,
      functionName: "travel-price-monitor-auth-login",
    });

    const refreshLambda = new nodejs.NodejsFunction(this, "RefreshLambda", {
      ...common,
      entry: path.join(
        repositoryRoot,
        "services/api/src/handlers/auth/refresh.ts",
      ),
      projectRoot: repositoryRoot,
      functionName: "travel-price-monitor-auth-refresh",
    });

    const createMonitorLambda = new nodejs.NodejsFunction(this, "CreateMonitorLambda", {
      runtime: lambda.Runtime.NODEJS_22_X,
      timeout: cdk.Duration.seconds(15),
      memorySize: 256,
      entry: path.join(repositoryRoot, "services/api/src/handlers/monitors/create.ts"),
      projectRoot: repositoryRoot,
      functionName: "travel-price-monitor-create-monitor",
      environment: {
        MONITORS_TABLE_NAME: monitorsTable.tableName,
        DYNAMODB_ENDPOINT_URL: localStackEndpoint,
      },
      bundling: {
        target: "node22",
        format: nodejs.OutputFormat.ESM,
        minify: false,
        sourceMap: true,
      },
    });
    monitorsTable.grantWriteData(createMonitorLambda);

    const getMonitorLambda = new nodejs.NodejsFunction(this, "GetMonitorLambda", {
      runtime: lambda.Runtime.NODEJS_22_X,
      timeout: cdk.Duration.seconds(15),
      memorySize: 256,
      entry: path.join(repositoryRoot, "services/api/src/handlers/monitors/get.ts"),
      projectRoot: repositoryRoot,
      functionName: "travel-price-monitor-get-monitor",
      environment: {
        MONITORS_TABLE_NAME: monitorsTable.tableName,
        DYNAMODB_ENDPOINT_URL: localStackEndpoint,
      },
      bundling: {
        target: "node22",
        format: nodejs.OutputFormat.ESM,
        minify: false,
        sourceMap: true,
      },
    });
    monitorsTable.grantReadData(getMonitorLambda);

    const api = new apigateway.RestApi(this, "Api", {
      restApiName: "travel-price-monitor-api",
      deployOptions: { stageName: "v1" },
      // The browser sends a preflight request before authenticated JSON calls.
      // Keep local origins explicit; add the deployed frontend origin via WEB_ORIGIN.
      defaultCorsPreflightOptions: {
        allowOrigins: [
          "http://localhost:5173",
          "http://127.0.0.1:5173",
          ...(process.env.WEB_ORIGIN ? [process.env.WEB_ORIGIN] : []),
        ],
        allowMethods: ["GET", "POST", "OPTIONS"],
        allowHeaders: ["Content-Type", "Authorization"],
        maxAge: cdk.Duration.hours(1),
      },
    });
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, "ApiAuthorizer", { cognitoUserPools: [userPool] });
    const auth = api.root.addResource("auth");
    auth
      .addResource("register")
      .addMethod("POST", new apigateway.LambdaIntegration(registerLambda));
    auth
      .addResource("login")
      .addMethod("POST", new apigateway.LambdaIntegration(loginLambda));
    auth
      .addResource("refresh")
      .addMethod("POST", new apigateway.LambdaIntegration(refreshLambda));

    const monitors = api.root.addResource("monitors");
    monitors.addMethod(
      "POST",
      new apigateway.LambdaIntegration(createMonitorLambda),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO_USER_POOLS,
      },
    );
    monitors.addResource("{monitorId}").addMethod(
      "GET",
      new apigateway.LambdaIntegration(getMonitorLambda),
      {
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO_USER_POOLS,
      },
    );

    new cdk.CfnOutput(this, "UserPoolId", { value: userPool.userPoolId });
    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: userPoolClient.userPoolClientId,
    });
    new cdk.CfnOutput(this, "ApiBaseUrl", { value: api.urlForPath("/") });
    new cdk.CfnOutput(this, "RegisterUrl", {
      value: api.urlForPath("/auth/register"),
    });
    new cdk.CfnOutput(this, "LoginUrl", {
      value: api.urlForPath("/auth/login"),
    });
    new cdk.CfnOutput(this, "RefreshUrl", {
      value: api.urlForPath("/auth/refresh"),
    });
    new cdk.CfnOutput(this, "CreateMonitorUrl", {
      value: api.urlForPath("/monitors"),
    });
    new cdk.CfnOutput(this, "GetMonitorUrlTemplate", {
      value: api.urlForPath("/monitors/{monitorId}"),
    });
    new cdk.CfnOutput(this, "MonitorsTableName", {
      value: monitorsTable.tableName,
    });
  }
}
