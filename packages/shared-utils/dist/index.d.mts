import { z } from 'zod';

declare const emailSchema: z.ZodString;
declare const uuidSchema: z.ZodString;
declare const ipv4Schema: z.ZodString;
declare const validateEmail: (email: string) => boolean;
declare const validateUUID: (uuid: string) => boolean;
declare const validateIPv4: (ip: string) => boolean;

declare const formatTimestamp: (date: Date | string) => string;
declare const formatShortDate: (date: Date | string) => string;
declare const formatBytes: (bytes: number) => string;
declare const formatNumber: (num: number) => string;

declare const LOG_LEVELS: {
    readonly ERROR: "error";
    readonly WARN: "warn";
    readonly INFO: "info";
    readonly DEBUG: "debug";
};
declare const HTTP_STATUS_CODES: {
    readonly OK: 200;
    readonly CREATED: 201;
    readonly BAD_REQUEST: 400;
    readonly UNAUTHORIZED: 401;
    readonly FORBIDDEN: 403;
    readonly NOT_FOUND: 404;
    readonly INTERNAL_SERVER_ERROR: 500;
};
declare const TIME_RANGES: {
    readonly LAST_HOUR: "1h";
    readonly LAST_24_HOURS: "24h";
    readonly LAST_7_DAYS: "7d";
    readonly LAST_30_DAYS: "30d";
};
declare const ALERT_SEVERITY: {
    readonly LOW: "low";
    readonly MEDIUM: "medium";
    readonly HIGH: "high";
    readonly CRITICAL: "critical";
};

/**
 * Simple Circuit Breaker implementation
 */
declare class CircuitBreaker {
    private threshold;
    private timeout;
    private failureCount;
    private lastFailureTime;
    private state;
    constructor(threshold?: number, timeout?: number);
    execute<T>(fn: () => Promise<T>): Promise<T>;
    private onSuccess;
    private onFailure;
    getState(): "CLOSED" | "OPEN" | "HALF_OPEN";
}

export { ALERT_SEVERITY, CircuitBreaker, HTTP_STATUS_CODES, LOG_LEVELS, TIME_RANGES, emailSchema, formatBytes, formatNumber, formatShortDate, formatTimestamp, ipv4Schema, uuidSchema, validateEmail, validateIPv4, validateUUID };
