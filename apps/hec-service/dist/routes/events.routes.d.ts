import { Router } from 'express';
import { TokenService } from '../services/token.service';
import { KafkaService } from '../services/kafka.service';
export declare class EventsRoutes {
    private router;
    private authMiddleware;
    private validationMiddleware;
    private tokenService;
    private kafkaService;
    private kafkaTopic;
    private enableAck;
    constructor(tokenService: TokenService, kafkaService: KafkaService, kafkaTopic?: string, enableAck?: boolean);
    private setupRoutes;
    private handleSingleEvent;
    private handleBatchEvents;
    private handleRawEvent;
    private handleHealthCheck;
    private processHECEvent;
    private handleEventError;
    getRouter(): Router;
}
//# sourceMappingURL=events.routes.d.ts.map