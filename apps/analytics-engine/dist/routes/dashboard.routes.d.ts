/**
 * Dashboard Analytics Routes - Merged from analytics-api
 * Fast endpoints using pre-computed continuous aggregates
 */
import express from 'express';
import { Pool } from 'pg';
import winston from 'winston';
export declare class DashboardRoutes {
    private router;
    private dbPool;
    private logger;
    private cache;
    constructor(dbPool: Pool, logger: winston.Logger);
    private setupRoutes;
    private getRealtimeOverview;
    private getHourlyTrends;
    private getTopEvents;
    private getSourceHealth;
    private getDailySummary;
    private getAlertPerformance;
    private getCacheStats;
    private calculatePercentChange;
    getRouter(): express.Router;
}
//# sourceMappingURL=dashboard.routes.d.ts.map