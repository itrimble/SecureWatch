export interface ServiceEndpoint {
    name: string;
    url: string;
    healthPath: string;
    metricsPath?: string;
    port: number;
}
export interface DashboardConfig {
    services: ServiceEndpoint[];
    refreshInterval: number;
    timeout: number;
    maxRetries: number;
    dockerComposeFile: string;
    logPaths: Record<string, string>;
}
export declare const defaultConfig: DashboardConfig;
//# sourceMappingURL=dashboard.config.d.ts.map