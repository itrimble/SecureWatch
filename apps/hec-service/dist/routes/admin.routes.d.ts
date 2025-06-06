import { Router } from 'express';
import { TokenService } from '../services/token.service';
import { KafkaService } from '../services/kafka.service';
export declare class AdminRoutes {
    private router;
    private tokenService;
    private kafkaService;
    private startTime;
    constructor(tokenService: TokenService, kafkaService: KafkaService);
    private setupRoutes;
    private getTokens;
    private createToken;
    private deactivateToken;
    private getTokenStats;
    private getMetrics;
    private getHealthStatus;
    private getSystemStatus;
    private clearCache;
    private getKafkaStatus;
    private reconnectKafka;
    getRouter(): Router;
}
//# sourceMappingURL=admin.routes.d.ts.map