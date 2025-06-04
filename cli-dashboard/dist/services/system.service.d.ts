import { SystemResourceUsage, DockerServiceStatus, LogEntry } from '../types';
export declare class SystemService {
    getSystemResources(): Promise<SystemResourceUsage>;
    private getCpuUsage;
    private getMemoryInfo;
    private getDiskUsage;
    private parseSize;
    getDockerServices(composeFile: string): Promise<DockerServiceStatus[]>;
    getRecentLogs(logPath: string, lines?: number): Promise<LogEntry[]>;
    private extractServiceFromPath;
    checkProcessByPort(port: number): Promise<boolean>;
    getProcessInfo(port: number): Promise<{
        pid?: number;
        command?: string;
    } | null>;
}
//# sourceMappingURL=system.service.d.ts.map