import type { CognitoSignUpClient } from "./types.js";

interface CognitoResponse {
  UserSub?: string;
  UserConfirmed?: boolean;
  CodeDeliveryDetails?: { AttributeName?: string; DeliveryMedium?: string; Destination?: string };
  __type?: string;
  message?: string;
}

export function createCognitoSignUpClient(region: string, clientId: string, endpointUrl = "", fetcher: typeof fetch = fetch): CognitoSignUpClient {
  return {
    async signUp(input) {
      const endpoint = endpointUrl || `https://cognito-idp.${region}.amazonaws.com/`;
      const response = await fetcher(endpoint, {
        method: "POST",
        headers: { "content-type": "application/x-amz-json-1.1", "x-amz-target": "AWSCognitoIdentityProviderService.SignUp" },
        body: JSON.stringify({ ClientId: clientId, Username: input.email, Password: input.password, UserAttributes: [{ Name: "email", Value: input.email }] }),
      });
      const payload = (await response.json()) as CognitoResponse;
      if (!response.ok) {
        const error = new Error(payload.message || "Unable to register user.");
        error.name = payload.__type?.split("#").pop() || "CognitoError";
        throw error;
      }
      if (!payload.UserSub) throw new Error("Cognito did not return a user identifier.");
      return {
        userSub: payload.UserSub,
        userConfirmed: payload.UserConfirmed === true,
        ...(payload.CodeDeliveryDetails ? { codeDelivery: { destination: payload.CodeDeliveryDetails.Destination, deliveryMedium: payload.CodeDeliveryDetails.DeliveryMedium, attributeName: payload.CodeDeliveryDetails.AttributeName } } : {}),
      };
    },
  };
}
