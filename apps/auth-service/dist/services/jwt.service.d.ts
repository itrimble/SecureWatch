import { TokenPayload, RefreshTokenPayload } from '../types/auth.types';
export declare class JWTService {
    private static readonly TOKEN_BLACKLIST_PREFIX;
    private static readonly REFRESH_TOKEN_PREFIX;
    /**
     * Generate access token
     */
    static generateAccessToken(payload: TokenPayload): string;
    /**
     * Generate refresh token
     */
    static generateRefreshToken(payload: RefreshTokenPayload): Promise<string>;
    /**
     * Verify access token
     */
    static verifyAccessToken(token: string): Promise<TokenPayload>;
    /**
     * Verify refresh token
     */
    static verifyRefreshToken(token: string): Promise<RefreshTokenPayload>;
    /**
     * Revoke access token (add to blacklist)
     */
    static revokeAccessToken(token: string): Promise<void>;
    /**
     * Revoke all tokens for a user
     */
    static revokeAllUserTokens(userId: string): Promise<void>;
    /**
     * Check if token is blacklisted
     */
    private static isTokenBlacklisted;
    /**
     * Generate token pair (access + refresh)
     */
    static generateTokenPair(userId: string, sessionId: string, permissions: string[], roles: string[], organizationId: string, deviceInfo?: any): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    /**
     * Refresh token pair
     */
    static refreshTokenPair(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
}
//# sourceMappingURL=jwt.service.d.ts.map