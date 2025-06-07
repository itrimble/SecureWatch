"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
const errorHandler = (error, req, res, next) => {
    // If response already sent, delegate to default Express error handler
    if (res.headersSent) {
        return next(error);
    }
    const status = error.status || error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    // Log error details
    logger_1.default.error('Request error', {
        error: {
            message: error.message,
            stack: error.stack,
            status
        },
        request: {
            method: req.method,
            url: req.url,
            headers: req.headers,
            body: req.body,
            params: req.params,
            query: req.query
        },
        user: req.user?.sub,
        organizationId: req.headers['x-organization-id']
    });
    // Send error response
    res.status(status).json({
        error: status < 500 ? message : 'Internal Server Error',
        message: status < 500 ? message : 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
    });
};
exports.errorHandler = errorHandler;
