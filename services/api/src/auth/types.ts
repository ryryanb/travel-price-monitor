export interface RegisterUserInput {
  email: string;
  password: string;
}

export interface RegisterUserResult {
  userSub: string;
  userConfirmed: boolean;
  codeDelivery?: {
    destination?: string;
    deliveryMedium?: string;
    attributeName?: string;
  };
}

export interface CognitoSignUpClient {
  signUp(input: RegisterUserInput): Promise<RegisterUserResult>;
}

export interface ApiGatewayRequest { body?: string | null }

export interface ApiGatewayResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}
