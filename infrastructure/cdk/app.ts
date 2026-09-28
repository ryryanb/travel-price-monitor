#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { AuthApiStack } from "./auth-api-stack.js";
const app = new cdk.App();
new AuthApiStack(app, "TravelPriceMonitorAuthApiStack");