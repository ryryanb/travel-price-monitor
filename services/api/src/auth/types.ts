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

export interface AuthenticateUserInput {
  email: string;
  password: string;
}

export interface AuthenticateUserResult {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
}

export interface CognitoAuthClient {
  authenticate(input: AuthenticateUserInput): Promise<AuthenticateUserResult>;
}

export interface ApiGatewayRequest { body?: string | null }

export interface ApiGatewayResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export interface RefreshUserInput {
  refreshToken: string;
}

export interface RefreshUserResult {
  accessToken: string;
  idToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface CognitoRefreshClient {
  refresh(input: RefreshUserInput): Promise<RefreshUserResult>;
}
