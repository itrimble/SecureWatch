export interface User {
  id: string;
  organizationId: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatarUrl?: string;
  phoneNumber?: string;
  isActive: boolean;
  isVerified: boolean;
  emailVerifiedAt?: Date;
  lastLoginAt?: Date;
  lastLoginIp?: string;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  passwordChangedAt?: Date;
  mustChangePassword: boolean;
  preferences: Record<string, any>;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TokenPayload {
  userId: string;
  email?: string;
  organizationId?: string;
  permissions?: string[];
  roles?: string[];
  type?: 'access';
  jti?: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string | string[];
}

export interface RefreshTokenPayload {
  userId: string;
  organizationId?: string;
  type?: 'refresh';
  deviceInfo?: any;
  ipAddress?: string;
  userAgent?: string;
  jti?: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string | string[];
}

export interface Role {
  id: string;
  organizationId: string;
  name: string;
  displayName?: string;
  description?: string;
  isSystem: boolean;
  isDefault: boolean;
  priority: number;
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  description?: string;
  isSystem: boolean;
  conditions?: any;
}

export interface UserRole {
  userId: string;
  roleId: string;
  assignedAt: Date;
  assignedBy?: string;
  expiresAt?: Date;
}

export interface Session {
  id: string;
  userId: string;
  sessionToken: string;
  refreshToken?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: any;
  expiresAt: Date;
  refreshExpiresAt?: Date;
  lastActivityAt: Date;
  createdAt: Date;
}

export interface OAuthProvider {
  id: string;
  organizationId: string;
  providerName: string;
  clientId: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
  scopes: string[];
  isActive: boolean;
  autoCreateUsers: boolean;
  defaultRoleId?: string;
  attributeMapping: Record<string, string>;
}

export interface OAuthConnection {
  id: string;
  userId: string;
  providerId: string;
  providerUserId: string;
  providerData: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MFAMethod {
  id: string;
  userId: string;
  methodType: 'totp' | 'webauthn' | 'sms' | 'email';
  isPrimary: boolean;
  isVerified: boolean;
  secret?: string;
  recoveryCodes?: string[];
  phoneNumber?: string;
  deviceName?: string;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthAuditLog {
  id: string;
  userId?: string;
  organizationId?: string;
  eventType: string;
  eventStatus: 'success' | 'failure' | 'blocked';
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: any;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
  mfaCode?: string;
  rememberMe?: boolean;
  deviceInfo?: any;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  organizationName?: string;
  acceptTerms: boolean;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface MFASetupResponse {
  secret: string;
  qrCode: string;
  backupCodes: string[];
  method: string;
}

export interface AuthResponse {
  user: Partial<User>;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  requiresMFA?: boolean;
  mfaMethods?: string[];
}

export interface AuthResult {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    avatarUrl?: string;
    organizationId?: string;
  };
  requiresMFA?: boolean;
  mfaMethods?: string[];
  tempToken?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthContext {
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: any;
}

export interface OAuthProfile {
  provider: string;
  providerId: string;
  email: string;
  emailVerified?: boolean;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatarUrl?: string;
  rawProfile?: any;
}