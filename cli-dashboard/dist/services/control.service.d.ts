export interface ServiceControlResult {
    success: boolean;
    message: string;
    output?: string;
}
export declare class ServiceControlService {
    private projectRoot;
    private servicesConfig;
    constructor();
    private initializeServiceConfigs;
    startService(serviceName: string): Promise<ServiceControlResult>;
    stopService(serviceName: string): Promise<ServiceControlResult>;
    restartService(serviceName: string): Promise<ServiceControlResult>;
    getServiceLogs(serviceName: string, lines?: number): Promise<string[]>;
    getServiceStatus(serviceName: string): Promise<string>;
    startAllServices(): Promise<ServiceControlResult[]>;
    stopAllServices(): Promise<ServiceControlResult[]>;
    healthCheckAll(): Promise<Map<string, boolean>>;
    restartAllServices(): Promise<ServiceControlResult[]>;
    runHealthCheck(): Promise<ServiceControlResult>;
}
//# sourceMappingURL=control.service.d.ts.map