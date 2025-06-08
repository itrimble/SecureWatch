import { Router } from 'express';
import { EnhancedLogProcessor } from '../services/enhanced-log-processor';
export declare class ParserManagementRoutes {
    private router;
    private processor;
    constructor(processor: EnhancedLogProcessor);
    private setupRoutes;
    private listParsers;
    private getParserStats;
    private getParserMetrics;
    private getParser;
    private toggleParser;
    private testParser;
    private validateParser;
    private parseWithParser;
    private getParsersByCategory;
    private getParsersBySource;
    private resetParserMetrics;
    private getTopPerformers;
    getRouter(): Router;
}
//# sourceMappingURL=parser-management.routes.d.ts.map