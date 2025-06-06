"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthMiddleware = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
class AuthMiddleware {
    constructor(tokenService) {
        this.authenticateToken = async (req, res, next) => {
            try {
                req.clientIp = this.getClientIp(req);
                const authHeader = req.headers.authorization;
                if (!authHeader) {
                    logger_1.default.warn('Missing Authorization header', {
                        ip: req.clientIp,
                        userAgent: req.headers['user-agent'],
                        path: req.path
                    });
                    res.status(401).json({
                        text: 'Unauthorized: Missing Authorization header',
                        code: 401
                    });
                    return;
                }
                const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/);
                if (!tokenMatch) {
                    logger_1.default.warn('Invalid Authorization format', {
                        ip: req.clientIp,
                        authHeader: authHeader.substring(0, 20) + '...',
                        path: req.path
                    });
                    res.status(401).json({
                        text: 'Unauthorized: Invalid Authorization format. Use "Bearer <token>"',
                        code: 401
                    });
                    return;
                }
                const tokenString = tokenMatch[1];
                const token = await this.tokenService.validateToken(tokenString);
                if (!token) {
                    logger_1.default.warn('Invalid or expired token', {
                        ip: req.clientIp,
                        token: tokenString.substring(0, 8) + '...',
                        path: req.path
                    });
                    res.status(401).json({
                        text: 'Unauthorized: Invalid or expired token',
                        code: 401
                    });
                    return;
                }
                if (token.allowedSources || token.allowedIndexes) {
                    const source = req.body?.source || req.query.source;
                    const index = req.body?.index || req.query.index;
                    if (token.allowedSources && source && !token.allowedSources.includes(source)) {
                        logger_1.default.warn('Token not allowed for source', {
                            tokenId: token.id,
                            requestedSource: source,
                            allowedSources: token.allowedSources,
                            ip: req.clientIp
                        });
                        res.status(403).json({
                            text: `Forbidden: Token not allowed for source "${source}"`,
                            code: 403
                        });
                        return;
                    }
                    if (token.allowedIndexes && index && !token.allowedIndexes.includes(index)) {
                        logger_1.default.warn('Token not allowed for index', {
                            tokenId: token.id,
                            requestedIndex: index,
                            allowedIndexes: token.allowedIndexes,
                            ip: req.clientIp
                        });
                        res.status(403).json({
                            text: `Forbidden: Token not allowed for index "${index}"`,
                            code: 403
                        });
                        return;
                    }
                }
                req.hecToken = token;
                logger_1.default.debug('Token authenticated successfully', {
                    tokenId: token.id,
                    tokenName: token.name,
                    ip: req.clientIp,
                    path: req.path
                });
                next();
            }
            catch (error) {
                logger_1.default.error('Authentication error', {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    ip: req.clientIp,
                    path: req.path
                });
                res.status(500).json({
                    text: 'Internal Server Error during authentication',
                    code: 500
                });
            }
        };
        this.checkRateLimit = async (req, res, next) => {
            try {
                if (!req.hecToken) {
                    res.status(401).json({
                        text: 'Unauthorized: Token required for rate limiting',
                        code: 401
                    });
                    return;
                }
                let estimatedEvents = 1;
                if (req.body) {
                    if (Array.isArray(req.body)) {
                        estimatedEvents = req.body.length;
                    }
                    else if (req.body.events && Array.isArray(req.body.events)) {
                        estimatedEvents = req.body.events.length;
                    }
                }
                const isAllowed = await this.tokenService.checkRateLimit(req.hecToken, estimatedEvents);
                if (!isAllowed) {
                    logger_1.default.warn('Rate limit exceeded', {
                        tokenId: req.hecToken.id,
                        estimatedEvents,
                        maxEventsPerSecond: req.hecToken.maxEventsPerSecond,
                        ip: req.clientIp
                    });
                    res.status(429).json({
                        text: 'Rate limit exceeded',
                        code: 429
                    });
                    return;
                }
                next();
            }
            catch (error) {
                logger_1.default.error('Rate limit check error', {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    tokenId: req.hecToken?.id,
                    ip: req.clientIp
                });
                res.status(500).json({
                    text: 'Internal Server Error during rate limit check',
                    code: 500
                });
            }
        };
        this.logRequest = (req, res, next) => {
            const startTime = Date.now();
            logger_1.default.info('HEC request received', {
                method: req.method,
                path: req.path,
                ip: req.clientIp,
                userAgent: req.headers['user-agent'],
                contentLength: req.headers['content-length'],
                tokenId: req.hecToken?.id,
                tokenName: req.hecToken?.name
            });
            res.on('finish', () => {
                const duration = Date.now() - startTime;
                logger_1.default.info('HEC request completed', {
                    method: req.method,
                    path: req.path,
                    statusCode: res.statusCode,
                    duration,
                    ip: req.clientIp,
                    tokenId: req.hecToken?.id,
                    contentLength: res.get('content-length')
                });
            });
            next();
        };
        this.tokenService = tokenService;
    }
    getClientIp(req) {
        const forwarded = req.headers['x-forwarded-for'];
        const realIp = req.headers['x-real-ip'];
        const cfConnectingIp = req.headers['cf-connecting-ip'];
        return (cfConnectingIp ||
            realIp ||
            (forwarded && forwarded.split(',')[0]) ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket?.remoteAddress ||
            'unknown');
    }
}
exports.AuthMiddleware = AuthMiddleware;
//# sourceMappingURL=auth.middleware.js.map