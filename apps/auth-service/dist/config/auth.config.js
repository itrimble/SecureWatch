// Validate required environment variables at startup
if (!process.env.JWT_ACCESS_SECRET) {
    throw new Error('JWT_ACCESS_SECRET environment variable is required');
}
if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET environment variable is required');
}
export const authConfig = {
    jwt: {
        accessTokenSecret: process.env.JWT_ACCESS_SECRET,
        refreshTokenSecret: process.env.JWT_REFRESH_SECRET,
        accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
        refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
        issuer: process.env.JWT_ISSUER || 'securewatch',
        audience: process.env.JWT_AUDIENCE || 'securewatch-api',
    },
    bcrypt: {
        saltRounds: 12,
    },
    session: {
        maxConcurrentSessions: 5,
        sessionTimeout: '24h',
    },
    password: {
        minLength: 12,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        preventReuse: 5, // Remember last 5 passwords
        maxAge: 90, // Days before password expires
    },
    mfa: {
        issuer: 'SecureWatch SIEM',
        window: 1, // Accept codes from 1 window before/after
        backupCodesCount: 10,
    },
    oauth: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
            callbackUrl: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
        },
        microsoft: {
            clientId: process.env.MICROSOFT_CLIENT_ID || '',
            clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
            callbackUrl: process.env.MICROSOFT_CALLBACK_URL || '/auth/microsoft/callback',
            tenant: process.env.MICROSOFT_TENANT || 'common',
        },
        okta: {
            domain: process.env.OKTA_DOMAIN || '',
            clientId: process.env.OKTA_CLIENT_ID || '',
            clientSecret: process.env.OKTA_CLIENT_SECRET || '',
            callbackUrl: process.env.OKTA_CALLBACK_URL || '/auth/okta/callback',
        },
    },
    security: {
        maxLoginAttempts: 5,
        lockoutDuration: '30m',
        passwordResetExpiry: '1h',
        emailVerificationExpiry: '24h',
        rateLimiting: {
            login: {
                windowMs: 15 * 60 * 1000, // 15 minutes
                max: 5, // 5 requests per window
            },
            passwordReset: {
                windowMs: 60 * 60 * 1000, // 1 hour
                max: 3, // 3 requests per window
            },
        },
    },
};
//# sourceMappingURL=auth.config.js.map