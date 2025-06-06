declare class HECService {
    private app;
    private config;
    private tokenService;
    private kafkaService;
    private eventsRoutes;
    private adminRoutes;
    constructor();
    private loadConfig;
    private setupLogging;
    private initializeServices;
    private setupMiddleware;
    private setupRoutes;
    private setupErrorHandling;
    start(): Promise<void>;
    private shutdown;
}
export default HECService;
//# sourceMappingURL=index.d.ts.map