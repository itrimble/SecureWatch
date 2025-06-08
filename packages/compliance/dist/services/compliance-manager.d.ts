import { EventEmitter } from 'events';
import { DatabaseConfig, ComplianceConfig, ComplianceFramework, ComplianceFrameworkType, ComplianceDashboard, ComplianceAssessment, ComplianceEvidence, ComplianceGap, GapAnalysisRequest } from '../types/compliance.types';
interface ComplianceManagerConfig {
    database: DatabaseConfig;
    compliance?: Partial<ComplianceConfig>;
    services?: {
        enableEvidenceCollection?: boolean;
        enableAuditTrail?: boolean;
        enableRiskAssessment?: boolean;
    };
}
interface ServiceHealth {
    service: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastCheck: Date;
    error?: string;
}
export declare class ComplianceManager extends EventEmitter {
    private config;
    private evidenceService?;
    private auditService?;
    private riskService?;
    private frameworks;
    private initialized;
    private healthCheckInterval?;
    constructor(config: ComplianceManagerConfig);
    initialize(): Promise<void>;
    private initializeServices;
    private loadFrameworks;
    private setupEventHandlers;
    private startHealthMonitoring;
    getFramework(type: ComplianceFrameworkType): ComplianceFramework | undefined;
    getEnabledFrameworks(): ComplianceFramework[];
    updateFrameworkStatus(frameworkId: string, enabled: boolean): Promise<void>;
    collectEvidence(request: {
        frameworkId: string;
        controlIds: string[];
        evidenceType: any;
        source: string;
        data: any;
    }): Promise<ComplianceEvidence>;
    scheduleEvidenceCollection(frameworkId: string, schedule: string): Promise<void>;
    runComplianceAssessment(frameworkId: string, scope?: any): Promise<ComplianceAssessment>;
    private evaluateControlCompliance;
    private calculateOverallStatus;
    runGapAnalysis(request: GapAnalysisRequest): Promise<ComplianceGap[]>;
    private calculateMaturityLevel;
    private calculateGapSeverity;
    private generateRemediationSteps;
    private estimateRemediationCost;
    private estimateRemediationEffort;
    getComplianceDashboard(): Promise<ComplianceDashboard>;
    private calculateComplianceScore;
    private getLatestAssessment;
    private logComplianceEvent;
    private handleAuditAlert;
    checkHealth(): Promise<ServiceHealth[]>;
    performMaintenance(): Promise<void>;
    shutdown(): Promise<void>;
    private uuidv4;
}
export declare function createComplianceSystem(config: ComplianceManagerConfig): Promise<ComplianceManager>;
export {};
//# sourceMappingURL=compliance-manager.d.ts.map