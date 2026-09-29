import type { CognitoAuthClient, CognitoSignUpClient } from "./types.js";

interface CognitoResponse {
  UserSub?: string;
  UserConfirmed?: boolean;
  CodeDeliveryDetails?: { AttributeName?: string; DeliveryMedium?: string; Destination?: string };
  AuthenticationResult?: {
    AccessToken?: string;
    IdToken?: string;
    RefreshToken?: string;
    ExpiresIn?: number;
    TokenType?: string;
  };
  __type?: string;
  message?: string;
}

function cognitoError(payload: CognitoResponse, fallback: string): Error {
  const error = new Error(payload.message || fallback);
  error.name = payload.__type?.split("#").pop() || "CognitoError";
  return error;
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
      if (!response.ok) throw cognitoError(payload, "Unable to register user.");
      if (!payload.UserSub) throw new Error("Cognito did not return a user identifier.");

      const codeDelivery = payload.CodeDeliveryDetails;
      return {
        userSub: payload.UserSub,
        userConfirmed: payload.UserConfirmed === true,
        ...(codeDelivery ? {
          codeDelivery: {
            ...(codeDelivery.Destination ? { destination: codeDelivery.Destination } : {}),
            ...(codeDelivery.DeliveryMedium ? { deliveryMedium: codeDelivery.DeliveryMedium } : {}),
            ...(codeDelivery.AttributeName ? { attributeName: codeDelivery.AttributeName } : {}),
          },
        } : {}),
      };
    },
  };
}

export function createCognitoAuthClient(region: string, clientId: string, endpointUrl = "", fetcher: typeof fetch = fetch): CognitoAuthClient {
  return {
    async authenticate(input) {
      const endpoint = endpointUrl || `https://cognito-idp.${region}.amazonaws.com/`;
      const response = await fetcher(endpoint, {
        method: "POST",
        headers: { "content-type": "application/x-amz-json-1.1", "x-amz-target": "AWSCognitoIdentityProviderService.InitiateAuth" },
        body: JSON.stringify({
          AuthFlow: "USER_PASSWORD_AUTH",
          ClientId: clientId,
          AuthParameters: { USERNAME: input.email, PASSWORD: input.password },
        }),
      });
      const payload = (await response.json()) as CognitoResponse;
      if (!response.ok) throw cognitoError(payload, "Unable to authenticate user.");

      const result = payload.AuthenticationResult;
      if (!result?.AccessToken || !result.IdToken || result.ExpiresIn === undefined || !result.TokenType) {
        throw new Error("Cognito did not return a complete authentication result.");
      }

      return {
        accessToken: result.AccessToken,
        idToken: result.IdToken,
        ...(result.RefreshToken ? { refreshToken: result.RefreshToken } : {}),
        expiresIn: result.ExpiresIn,
        tokenType: result.TokenType,
      };
    },
  };
}


export function createCognitoRefreshClient(region: string, clientId: string, endpointUrl = "", fetcher: typeof fetch = fetch): CognitoRefreshClient {
  return {
    async refresh(input) {
      const endpoint = endpointUrl || `https://cognito-idp.${region}.amazonaws.com/`;
      const response = await fetcher(endpoint, {
        method: "POST",
        headers: { "content-type": "application/x-amz-json-1.1", "x-amz-target": "AWSCognitoIdentityProviderService.InitiateAuth" },
        body: JSON.stringify({
          AuthFlow: "REFRESH_TOKEN_AUTH",
          ClientId: clientId,
          AuthParameters: { REFRESH_TOKEN: input.refreshToken },
        }),
      });
      const payload = (await response.json()) as CognitoResponse;
      if (!response.ok) throw cognitoError(payload, "Unable to refresh user session.");
      const result = payload.AuthenticationResult;
      if (!result?.AccessToken || !result.IdToken || result.ExpiresIn === undefined || !result.TokenType) {
        throw new Error("Cognito did not return a complete refreshed authentication result.");
      }
      return { accessToken: result.AccessToken, idToken: result.IdToken, expiresIn: result.ExpiresIn, tokenType: result.TokenType };
    },
  };
}
