/**
 * KQL Analytics Engine - Main Service Entry Point
 * Enterprise-grade analytics engine for SecureWatch SIEM platform
 */
declare class AnalyticsEngineService {
    private app;
    private dbPool;
    private redisClient;
    private server;
    constructor();
    /**
     * Setup database connection pool
     */
    private setupDatabase;
    /**
     * Setup Redis connection
     */
    private setupRedis;
    /**
     * Setup Express middleware
     */
    private setupMiddleware;
    /**
     * Setup API routes
     */
    private setupRoutes;
    /**
     * Setup error handling middleware
     */
    private setupErrorHandling;
    /**
     * Start the server
     */
    start(): Promise<void>;
    /**
     * Graceful shutdown
     */
    private shutdown;
}
export { AnalyticsEngineService };
//# sourceMappingURL=index.d.ts.map