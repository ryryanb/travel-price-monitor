Yes. For this project, I’d keep the AWS deployment process as a simple sequence you can reuse whenever you want to deploy the current infrastructure.

## 1. Configure/use the AWS profile

You already have the `travel-price-monitor` profile configured:

```bash
aws sts get-caller-identity --profile travel-price-monitor
```

You should see account `286799647933`.

---

## 2. Bootstrap CDK — first time only

From the repository root:

```bash
AWS_PROFILE=travel-price-monitor AWS_REGION=ap-southeast-1 \
npx cdk bootstrap \
  aws://286799647933/ap-southeast-1 \
  --cloudformation-execution-policies \
  arn:aws:iam::aws:policy/AdministratorAccess
```

You **do not normally need to run this every time** you deploy.

It creates the CDK bootstrap environment (`CDKToolkit`) that CDK uses for deployments.

### Important

The reason we're currently using `AdministratorAccess` for the **CDK CloudFormation execution role** is that your stack creates IAM roles. We discovered that the earlier `PowerUserAccess` bootstrap wasn't sufficient.

This is separate from your own `travel-price-monitor-deployer` IAM user permissions.

---

## 3. Go to the CDK project

```bash
cd infrastructure/cdk
```

---

## 4. Install CDK dependencies — first time / after dependency changes

```bash
npm install
```

---

## 5. Synthesize the CloudFormation template

```bash
AWS_PROFILE=travel-price-monitor AWS_REGION=ap-southeast-1 \
npx cdk synth
```

This doesn't deploy anything. It verifies that CDK can construct the CloudFormation template.

---

## 6. Review the deployment differences

```bash
AWS_PROFILE=travel-price-monitor AWS_REGION=ap-southeast-1 \
npx cdk diff
```

For a brand-new stack, you'll see resources marked `[+]`.

For an existing stack, this lets you review what will change before deployment.

---

## 7. Deploy

```bash
AWS_PROFILE=travel-price-monitor AWS_REGION=ap-southeast-1 \
npx cdk deploy --require-approval never
```

After deployment, CDK prints outputs such as:

```text
ApiBaseUrl
RegisterUrl
LoginUrl
UserPoolId
UserPoolClientId
```

---

# 8. Test the deployed registration endpoint

For our current AUTH-001/AUTH-002 infrastructure:

```bash
curl -i \
  -X POST \
  "https://YOUR_API_ID.execute-api.ap-southeast-1.amazonaws.com/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-email@example.com","password":"TestPassword1"}'
```

---

# 9. Confirm the Cognito user

After receiving the verification email, you can confirm the user through the AWS CLI:

```bash
AWS_PROFILE=travel-price-monitor AWS_REGION=ap-southeast-1 \
aws cognito-idp confirm-sign-up \
  --client-id YOUR_USER_POOL_CLIENT_ID \
  --username your-test-email@example.com \
  --confirmation-code YOUR_CODE
```

---

# 10. Test login

```bash
curl -i \
  -X POST \
  "https://YOUR_API_ID.execute-api.ap-southeast-1.amazonaws.com/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-email@example.com","password":"TestPassword1"}'
```

Don't save or paste the returned tokens into GitHub or share them.

---

# 11. Destroy the application when you're finished testing

Since you're planning to develop more features before another AWS deployment:

```bash
AWS_PROFILE=travel-price-monitor AWS_REGION=ap-southeast-1 \
npx cdk destroy TravelPriceMonitorAuthApiStack
```

Or, without confirmation:

```bash
AWS_PROFILE=travel-price-monitor AWS_REGION=ap-southeast-1 \
npx cdk destroy TravelPriceMonitorAuthApiStack --force
```

This destroys the **application resources**, including the Cognito User Pool.

### Do NOT run this

```bash
npx cdk destroy CDKToolkit
```

Keep `CDKToolkit` bootstrapped.

---

## The short version you'll normally use

Once the environment has already been bootstrapped:

```bash
cd infrastructure/cdk

npm install

AWS_PROFILE=travel-price-monitor AWS_REGION=ap-southeast-1 \
npx cdk synth

AWS_PROFILE=travel-price-monitor AWS_REGION=ap-southeast-1 \
npx cdk diff

AWS_PROFILE=travel-price-monitor AWS_REGION=ap-southeast-1 \
npx cdk deploy --require-approval never
```

And when you're done with AWS testing:

```bash
AWS_PROFILE=travel-price-monitor AWS_REGION=ap-southeast-1 \
npx cdk destroy TravelPriceMonitorAuthApiStack
```

### One thing I'd add to the repo

It would be useful to document this as something like:

```text
docs/deployment/aws-deployment.md
```

so you don't have to reconstruct the process later—especially the **bootstrap → synth → diff → deploy → test → destroy** sequence and the distinction between the CDK bootstrap environment and the application stack.
