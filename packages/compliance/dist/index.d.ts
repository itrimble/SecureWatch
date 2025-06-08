export { ComplianceManager, createComplianceSystem } from './services/compliance-manager';
export { EvidenceCollectionService } from './services/evidence-collection-service';
export { AuditTrailService } from './services/audit-trail-service';
export { RiskAssessmentService } from './services/risk-assessment-service';
export { getFrameworkDefinition, getAvailableFrameworks, createFrameworkFromDefinition, getControlMappings, getFrameworksByRegulation, getFrameworkSummary, SOXFramework, HIPAAFramework, PCIDSSFramework, GDPRFramework, ISO27001Framework, NISTCSFFramework } from './frameworks';
export { getReportTemplate, getAllReportTemplates, getReportTemplatesByType, getReportTemplatesByFramework, SOXComplianceReportTemplate, HIPAAComplianceReportTemplate, PCIDSSComplianceReportTemplate, ExecutiveDashboardTemplate, GapAnalysisReportTemplate } from './templates';
export * from './types/compliance.types';
export { logger } from './utils/logger';
export declare const COMPLIANCE_SYSTEM_VERSION = "1.0.0";
export declare const COMPLIANCE_FEATURES: {
    readonly EVIDENCE_COLLECTION: "evidence-collection";
    readonly AUDIT_TRAIL: "audit-trail";
    readonly RISK_ASSESSMENT: "risk-assessment";
    readonly REPORT_GENERATION: "report-generation";
    readonly GAP_ANALYSIS: "gap-analysis";
    readonly DASHBOARD: "executive-dashboard";
    readonly AUTOMATION: "compliance-automation";
};
export declare const COMPLIANCE_CONSTANTS: {
    readonly DEFAULT_RETENTION: {
        readonly AUDIT_LOGS: 2555;
        readonly EVIDENCE: 2555;
        readonly REPORTS: 2555;
        readonly ASSESSMENTS: 1825;
        readonly RISK_DATA: 1095;
    };
    readonly RISK_LEVELS: {
        readonly CRITICAL: 80;
        readonly HIGH: 60;
        readonly MEDIUM: 40;
        readonly LOW: 20;
        readonly INFO: 0;
    };
    readonly COMPLIANCE_LEVELS: {
        readonly FULL: 95;
        readonly SUBSTANTIAL: 80;
        readonly PARTIAL: 60;
        readonly MINIMAL: 40;
        readonly NON_COMPLIANT: 0;
    };
    readonly ASSESSMENT_FREQUENCIES: {
        readonly CONTINUOUS: "continuous";
        readonly DAILY: "daily";
        readonly WEEKLY: "weekly";
        readonly MONTHLY: "monthly";
        readonly QUARTERLY: "quarterly";
        readonly SEMI_ANNUAL: "semi-annual";
        readonly ANNUAL: "annual";
    };
    readonly EVIDENCE_AGE: {
        readonly CURRENT: 30;
        readonly RECENT: 90;
        readonly AGING: 180;
        readonly STALE: 365;
    };
};
export interface ComplianceSystemConfig {
    database: {
        type: 'sqlite' | 'mysql' | 'postgresql';
        connection: string | {
            host: string;
            port: number;
            database: string;
            user: string;
            password: string;
        };
    };
    compliance?: {
        retentionPolicy?: {
            auditLogs?: number;
            evidence?: number;
            reports?: number;
            assessments?: number;
        };
        automation?: {
            enabledFrameworks?: string[];
            evidenceCollection?: boolean;
            reportGeneration?: boolean;
            riskScoring?: boolean;
            notifications?: {
                enabled?: boolean;
                channels?: ('email' | 'webhook' | 'sms')[];
                recipients?: Record<string, string[]>;
            };
        };
        scoring?: {
            method?: 'weighted' | 'simple' | 'risk-based';
            weights?: Record<string, number>;
        };
    };
    services?: {
        enableEvidenceCollection?: boolean;
        enableAuditTrail?: boolean;
        enableRiskAssessment?: boolean;
    };
}
export declare const DEFAULT_COMPLIANCE_CONFIG: ComplianceSystemConfig;
export declare function createDevComplianceSystem(customConfig?: Partial<ComplianceSystemConfig>): Promise<any>;
//# sourceMappingURL=index.d.ts.map