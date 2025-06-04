import { DashboardData } from '../types';
import { DashboardConfig } from '../config/dashboard.config';
export declare class DashboardUI {
    private config;
    private screen;
    private grid;
    private widgets;
    private currentData;
    constructor(config: DashboardConfig);
    private setupLayout;
    private setupKeyBindings;
    update(data: DashboardData): void;
    private updateServiceStatus;
    private updateSystemResources;
    private updatePlatformMetrics;
    private updateDockerServices;
    private updateRecentAlerts;
    private updateRecentLogs;
    private updateStatusBar;
    private formatServiceStatus;
    private formatDockerStatus;
    private formatSeverity;
    private formatUptime;
    private showHelp;
    private showDetailedView;
    render(): void;
    destroy(): void;
}
//# sourceMappingURL=dashboard.ui.d.ts.map