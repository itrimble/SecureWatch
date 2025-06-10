import { WindowsEventLogConfig } from '../adapters/windows-event-log.adapter';
export declare const highPerformanceConfig: WindowsEventLogConfig;
export declare const domainControllerConfig: WindowsEventLogConfig;
export declare const forensicAnalysisConfig: WindowsEventLogConfig;
export declare const endpointMonitoringConfig: WindowsEventLogConfig;
export declare const developmentConfig: WindowsEventLogConfig;
export declare const wefCollectorConfig: WindowsEventLogConfig;
export declare function getConfigForEnvironment(environment: string): WindowsEventLogConfig;
export declare function validateConfig(config: WindowsEventLogConfig): string[];
export declare const performanceTuningGuide: {
    highVolume: {
        description: string;
        recommendations: string[];
    };
    lowLatency: {
        description: string;
        recommendations: string[];
    };
    resourceConstrained: {
        description: string;
        recommendations: string[];
    };
    forensicAnalysis: {
        description: string;
        recommendations: string[];
    };
};
//# sourceMappingURL=windows-event-log.config.example.d.ts.map