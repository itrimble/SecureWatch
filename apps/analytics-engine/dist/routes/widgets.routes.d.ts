/**
 * Widget Analytics Routes - Merged from analytics-api
 * Ultra-fast endpoints for individual dashboard widgets
 */
import express from 'express';
import { Pool } from 'pg';
import winston from 'winston';
export declare class WidgetRoutes {
    private router;
    private dbPool;
    private logger;
    private cache;
    constructor(dbPool: Pool, logger: winston.Logger);
    private setupRoutes;
    private getTotalEvents;
    private getCriticalAlerts;
    private getActiveSources;
    private getSecurityIncidents;
    private getNetworkActivity;
    private getEventsTimeline;
    private getTopSources;
    private getSystemPerformance;
    private getRecentAlerts;
    private getCacheHitRate;
    getRouter(): express.Router;
}
//# sourceMappingURL=widgets.routes.d.ts.map