import { DashboardData, LogEntry } from '../types';
import { DashboardConfig } from '../config/dashboard.config';
export declare class DataService {
    private config;
    private apiService;
    private systemService;
    constructor(config: DashboardConfig);
    collectDashboardData(): Promise<DashboardData>;
    private collectServiceStatuses;
    private collectServiceMetrics;
    private collectRecentLogs;
    getDetailedServiceInfo(serviceName: string): Promise<any>;
    restartService(serviceName: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getLogTail(serviceName: string, lines?: number): Promise<LogEntry[]>;
    /**
     * Calculate overall system health based on service statuses and alerts
     */
    private calculateSystemHealth;
    /**
     * Enhanced service status detection with contextual information
     */
    private enhanceServiceStatus;
    private calculateStatusDuration;
    private generateServiceKPIs;
    private getServiceThresholds;
    private generateTroubleshootingInfo;
}
//# sourceMappingURL=data.service.d.ts.map