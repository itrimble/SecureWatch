export declare const authConfig: {
    jwt: {
        accessTokenSecret: string;
        refreshTokenSecret: string;
        accessTokenExpiry: string;
        refreshTokenExpiry: string;
        issuer: string;
        audience: string;
    };
    bcrypt: {
        saltRounds: number;
    };
    session: {
        maxConcurrentSessions: number;
        sessionTimeout: string;
    };
    password: {
        minLength: number;
        requireUppercase: boolean;
        requireLowercase: boolean;
        requireNumbers: boolean;
        requireSpecialChars: boolean;
        preventReuse: number;
        maxAge: number;
    };
    mfa: {
        issuer: string;
        window: number;
        backupCodesCount: number;
    };
    oauth: {
        google: {
            clientId: string;
            clientSecret: string;
            callbackUrl: string;
        };
        microsoft: {
            clientId: string;
            clientSecret: string;
            callbackUrl: string;
            tenant: string;
        };
        okta: {
            domain: string;
            clientId: string;
            clientSecret: string;
            callbackUrl: string;
        };
    };
    security: {
        maxLoginAttempts: number;
        lockoutDuration: string;
        passwordResetExpiry: string;
        emailVerificationExpiry: string;
        rateLimiting: {
            login: {
                windowMs: number;
                max: number;
            };
            passwordReset: {
                windowMs: number;
                max: number;
            };
        };
    };
};
//# sourceMappingURL=auth.config.d.ts.map