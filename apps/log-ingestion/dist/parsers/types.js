// SecureWatch Parser Framework Types
// Enhanced parsing framework with community integration and ECS normalization
// Error handling
export class ParserError extends Error {
    parserId;
    phase;
    cause;
    constructor(parserId, phase, message, cause) {
        super(`Parser ${parserId} failed during ${phase}: ${message}`);
        this.parserId = parserId;
        this.phase = phase;
        this.cause = cause;
        this.name = 'ParserError';
    }
}
export class ParserValidationError extends ParserError {
    constructor(parserId, message, cause) {
        super(parserId, 'validation', message, cause);
        this.name = 'ParserValidationError';
    }
}
export class ParserNormalizationError extends ParserError {
    constructor(parserId, message, cause) {
        super(parserId, 'normalization', message, cause);
        this.name = 'ParserNormalizationError';
    }
}
//# sourceMappingURL=types.js.map