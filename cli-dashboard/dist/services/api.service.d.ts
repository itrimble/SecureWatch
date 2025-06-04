import { ServiceStatus, ServiceMetrics, AlertInfo } from '../types';
import { ServiceEndpoint } from '../config/dashboard.config';
export declare class ApiService {
    private timeout;
    private axiosInstance;
    constructor(timeout?: number);
    checkServiceHealth(service: ServiceEndpoint): Promise<ServiceStatus>;
    getServiceMetrics(service: ServiceEndpoint): Promise<ServiceMetrics | null>;
    getRecentAlerts(): Promise<AlertInfo[]>;
    getLogIngestionStats(): Promise<any>;
    getSearchApiStats(): Promise<any>;
}
//# sourceMappingURL=api.service.d.ts.map