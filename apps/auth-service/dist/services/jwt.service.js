import jwt from 'jsonwebtoken';
import { authConfig } from '../config/auth.config';
import { redis } from '../utils/redis';
import { DatabaseService } from './database.service';
export class JWTService {
    static TOKEN_BLACKLIST_PREFIX = 'blacklist:token:';
    static REFRESH_TOKEN_PREFIX = 'refresh:token:';
    /**
     * Generate access token
     */
    static generateAccessToken(payload) {
        const options = {
            expiresIn: authConfig.jwt.accessTokenExpiry,
            issuer: authConfig.jwt.issuer,
            audience: authConfig.jwt.audience,
            algorithm: 'RS256',
        };
        return jwt.sign(payload, authConfig.jwt.accessTokenSecret, options);
    }
    /**
     * Generate refresh token
     */
    static async generateRefreshToken(payload) {
        const options = {
            expiresIn: authConfig.jwt.refreshTokenExpiry,
            issuer: authConfig.jwt.issuer,
            audience: authConfig.jwt.audience,
            algorithm: 'RS256',
        };
        const token = jwt.sign(payload, authConfig.jwt.refreshTokenSecret, options);
        // Store refresh token in Redis for tracking
        const key = `${this.REFRESH_TOKEN_PREFIX}${payload.userId}:${payload.sessionId}`;
        await redis.setex(key, 7 * 24 * 60 * 60, // 7 days in seconds
        JSON.stringify({
            token,
            deviceInfo: payload.deviceInfo,
            createdAt: new Date().toISOString(),
        }));
        return token;
    }
    /**
     * Verify access token
     */
    static async verifyAccessToken(token) {
        // Check if token is blacklisted
        const isBlacklisted = await this.isTokenBlacklisted(token);
        if (isBlacklisted) {
            throw new Error('Token has been revoked');
        }
        const options = {
            issuer: authConfig.jwt.issuer,
            audience: authConfig.jwt.audience,
            algorithms: ['RS256'],
        };
        try {
            const decoded = jwt.verify(token, authConfig.jwt.accessTokenSecret, options);
            return decoded;
        }
        catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                throw new Error('Access token has expired');
            }
            else if (error instanceof jwt.JsonWebTokenError) {
                throw new Error('Invalid access token');
            }
            throw error;
        }
    }
    /**
     * Verify refresh token
     */
    static async verifyRefreshToken(token) {
        const options = {
            issuer: authConfig.jwt.issuer,
            audience: authConfig.jwt.audience,
            algorithms: ['RS256'],
        };
        try {
            const decoded = jwt.verify(token, authConfig.jwt.refreshTokenSecret, options);
            // Check if refresh token exists in Redis
            const key = `${this.REFRESH_TOKEN_PREFIX}${decoded.userId}:${decoded.sessionId}`;
            const storedData = await redis.get(key);
            if (!storedData) {
                throw new Error('Refresh token not found or expired');
            }
            const parsedData = JSON.parse(storedData);
            if (parsedData.token !== token) {
                throw new Error('Invalid refresh token');
            }
            return decoded;
        }
        catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                throw new Error('Refresh token has expired');
            }
            else if (error instanceof jwt.JsonWebTokenError) {
                throw new Error('Invalid refresh token');
            }
            throw error;
        }
    }
    /**
     * Revoke access token (add to blacklist)
     */
    static async revokeAccessToken(token) {
        try {
            const decoded = jwt.decode(token);
            if (!decoded || !decoded.exp) {
                return;
            }
            const ttl = decoded.exp - Math.floor(Date.now() / 1000);
            if (ttl > 0) {
                await redis.setex(`${this.TOKEN_BLACKLIST_PREFIX}${token}`, ttl, 'revoked');
            }
        }
        catch (error) {
            console.error('Error revoking token:', error);
        }
    }
    /**
     * Revoke all tokens for a user
     */
    static async revokeAllUserTokens(userId) {
        // Get all refresh tokens for the user
        const pattern = `${this.REFRESH_TOKEN_PREFIX}${userId}:*`;
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    }
    /**
     * Check if token is blacklisted
     */
    static async isTokenBlacklisted(token) {
        const result = await redis.get(`${this.TOKEN_BLACKLIST_PREFIX}${token}`);
        return result !== null;
    }
    /**
     * Generate token pair (access + refresh)
     */
    static async generateTokenPair(userId, sessionId, permissions, roles, organizationId, deviceInfo) {
        const tokenPayload = {
            userId,
            sessionId,
            organizationId,
            permissions,
            roles,
            type: 'access',
        };
        const refreshPayload = {
            userId,
            sessionId,
            organizationId,
            type: 'refresh',
            deviceInfo,
        };
        const accessToken = this.generateAccessToken(tokenPayload);
        const refreshToken = await this.generateRefreshToken(refreshPayload);
        return { accessToken, refreshToken };
    }
    /**
     * Refresh token pair
     */
    static async refreshTokenPair(refreshToken) {
        const decoded = await this.verifyRefreshToken(refreshToken);
        // Revoke old refresh token
        const key = `${this.REFRESH_TOKEN_PREFIX}${decoded.userId}:${decoded.sessionId}`;
        await redis.del(key);
        // Fetch current permissions and roles from database
        const userPerms = await DatabaseService.getUserPermissions(decoded.userId);
        const permissions = userPerms?.permissions || [];
        const roles = userPerms?.roles || [];
        return this.generateTokenPair(decoded.userId, decoded.sessionId, permissions, roles, decoded.organizationId, decoded.deviceInfo);
    }
}
//# sourceMappingURL=jwt.service.js.map