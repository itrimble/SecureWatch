import { ServiceStatus, AlertInfo, SystemHealth } from '../types';
/**
 * Enhanced status formatter for SecureWatch CLI Dashboard
 * Provides granular status representation with visual indicators and context
 */
export declare class StatusFormatter {
    /**
     * Get status symbol and color for service status
     */
    static getStatusIndicator(status: ServiceStatus['status']): {
        symbol: string;
        color: string;
        label: string;
    };
    /**
     * Format service status with enhanced visual representation
     */
    static formatServiceStatus(service: ServiceStatus, includeDetails?: boolean): string;
    /**
     * Format service status with detailed context and troubleshooting info
     */
    static formatDetailedServiceStatus(service: ServiceStatus): string[];
    /**
     * Format system health overview
     */
    static formatSystemHealth(health: SystemHealth): string;
    /**
     * Format alert with enhanced context
     */
    static formatAlert(alert: AlertInfo): string;
    /**
     * Format system resources with progress bars
     */
    static formatSystemResources(resources: any): string[];
    /**
     * Create ASCII progress bar
     */
    static createProgressBar(current: number, max: number, width?: number): string;
    /**
     * Create health score bar
     */
    static createHealthBar(score: number): string;
    /**
     * Format uptime duration
     */
    static formatUptime(uptimeSeconds: number): string;
    /**
     * Format general duration
     */
    static formatDuration(seconds: number): string;
    /**
     * Format log entry with level indicators
     */
    static formatLogEntry(entry: any): string;
    /**
     * Generate troubleshooting suggestions for a service
     */
    static generateTroubleshootingText(service: ServiceStatus): string[];
}
//# sourceMappingURL=status-formatter.d.ts.map