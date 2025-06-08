import { JobQueue } from '../services/JobQueue';
import { QueryExecutorService } from '../services/QueryExecutor';
import { WebSocketService } from '../services/WebSocketService';
declare const router: import("express-serve-static-core").Router;
export declare function initializeJobRoutes(queue: JobQueue, executor: QueryExecutorService, webSocket: WebSocketService): void;
export { router as jobsRouter };
//# sourceMappingURL=jobs.d.ts.map