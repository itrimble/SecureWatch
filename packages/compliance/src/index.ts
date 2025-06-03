// Compliance System Main Entry Point
export { ComplianceManager, createComplianceSystem } from './services/compliance-manager';

// Core Services
export { EvidenceCollectionService } from './services/evidence-collection-service';
export { AuditTrailService } from './services/audit-trail-service';
export { RiskAssessmentService } from './services/risk-assessment-service';

// Frameworks
export {
  getFrameworkDefinition,
  getAvailableFrameworks,
  createFrameworkFromDefinition,
  getControlMappings,
  getFrameworksByRegulation,
  getFrameworkSummary,
  SOXFramework,
  HIPAAFramework,
  PCIDSSFramework,
  GDPRFramework,
  ISO27001Framework,
  NISTCSFFramework
} from './frameworks';

// Report Templates
export {
  getReportTemplate,
  getAllReportTemplates,
  getReportTemplatesByType,
  getReportTemplatesByFramework,
  SOXComplianceReportTemplate,
  HIPAAComplianceReportTemplate,
  PCIDSSComplianceReportTemplate,
  ExecutiveDashboardTemplate,
  GapAnalysisReportTemplate
} from './templates';

// Types and Schemas
export * from './types/compliance.types';

// Utilities
export { logger } from './utils/logger';

// Version and Constants
export const COMPLIANCE_SYSTEM_VERSION = '1.0.0';

export const COMPLIANCE_FEATURES = {
  EVIDENCE_COLLECTION: 'evidence-collection',
  AUDIT_TRAIL: 'audit-trail',
  RISK_ASSESSMENT: 'risk-assessment',
  REPORT_GENERATION: 'report-generation',
  GAP_ANALYSIS: 'gap-analysis',
  DASHBOARD: 'executive-dashboard',
  AUTOMATION: 'compliance-automation'
} as const;

export const COMPLIANCE_CONSTANTS = {
  // Retention periods (days)
  DEFAULT_RETENTION: {
    AUDIT_LOGS: 2555, // 7 years
    EVIDENCE: 2555, // 7 years
    REPORTS: 2555, // 7 years
    ASSESSMENTS: 1825, // 5 years
    RISK_DATA: 1095 // 3 years
  },
  
  // Risk thresholds
  RISK_LEVELS: {
    CRITICAL: 80,
    HIGH: 60,
    MEDIUM: 40,
    LOW: 20,
    INFO: 0
  },
  
  // Compliance thresholds
  COMPLIANCE_LEVELS: {
    FULL: 95,
    SUBSTANTIAL: 80,
    PARTIAL: 60,
    MINIMAL: 40,
    NON_COMPLIANT: 0
  },
  
  // Assessment frequencies
  ASSESSMENT_FREQUENCIES: {
    CONTINUOUS: 'continuous',
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    QUARTERLY: 'quarterly',
    SEMI_ANNUAL: 'semi-annual',
    ANNUAL: 'annual'
  },
  
  // Evidence age thresholds (days)
  EVIDENCE_AGE: {
    CURRENT: 30,
    RECENT: 90,
    AGING: 180,
    STALE: 365
  }
} as const;

// Configuration interfaces for external use
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

// Default configuration
export const DEFAULT_COMPLIANCE_CONFIG: ComplianceSystemConfig = {
  database: {
    type: 'sqlite',
    connection: './compliance.db'
  },
  compliance: {
    retentionPolicy: COMPLIANCE_CONSTANTS.DEFAULT_RETENTION,
    automation: {
      enabledFrameworks: ['SOX', 'HIPAA', 'PCI-DSS', 'GDPR', 'ISO-27001', 'NIST-CSF'],
      evidenceCollection: true,
      reportGeneration: true,
      riskScoring: true,
      notifications: {
        enabled: true,
        channels: ['email'],
        recipients: {}
      }
    },
    scoring: {
      method: 'weighted'
    }
  },
  services: {
    enableEvidenceCollection: true,
    enableAuditTrail: true,
    enableRiskAssessment: true
  }
};

// Helper function for development
export async function createDevComplianceSystem(customConfig?: Partial<ComplianceSystemConfig>) {
  const config = {
    ...DEFAULT_COMPLIANCE_CONFIG,
    ...customConfig,
    database: {
      ...DEFAULT_COMPLIANCE_CONFIG.database,
      ...(customConfig?.database || {})
    },
    compliance: {
      ...DEFAULT_COMPLIANCE_CONFIG.compliance,
      ...(customConfig?.compliance || {})
    },
    services: {
      ...DEFAULT_COMPLIANCE_CONFIG.services,
      ...(customConfig?.services || {})
    }
  };
  
  return await createComplianceSystem(config);
}