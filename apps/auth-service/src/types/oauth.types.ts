export interface OAuthProfile {
  provider: 'google' | 'microsoft' | 'okta';
  providerId: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
  locale?: string;
  emailVerified?: boolean;
  rawProfile?: any;
}

export interface OAuthUser {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  provider: string;
  providerId: string;
  isActive: boolean;
  roles: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string[];
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  scope?: string[];
  tenant?: string; // For Microsoft
}