import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cognito from "aws-cdk-lib/aws-cognito";
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
    const common = {
      runtime: lambda.Runtime.NODEJS_22_X,
      timeout: cdk.Duration.seconds(15),
      memorySize: 256,
      environment: {
        COGNITO_USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        COGNITO_REGION: cdk.Stack.of(this).region,
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

    const api = new apigateway.RestApi(this, "Api", {
      restApiName: "travel-price-monitor-api",
      deployOptions: { stageName: "v1" },
    });
    const auth = api.root.addResource("auth");
    auth
      .addResource("register")
      .addMethod("POST", new apigateway.LambdaIntegration(registerLambda));
    auth
      .addResource("login")
      .addMethod("POST", new apigateway.LambdaIntegration(loginLambda));

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
  }
}
