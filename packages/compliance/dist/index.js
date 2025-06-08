"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_COMPLIANCE_CONFIG = exports.COMPLIANCE_CONSTANTS = exports.COMPLIANCE_FEATURES = exports.COMPLIANCE_SYSTEM_VERSION = exports.logger = exports.GapAnalysisReportTemplate = exports.ExecutiveDashboardTemplate = exports.PCIDSSComplianceReportTemplate = exports.HIPAAComplianceReportTemplate = exports.SOXComplianceReportTemplate = exports.getReportTemplatesByFramework = exports.getReportTemplatesByType = exports.getAllReportTemplates = exports.getReportTemplate = exports.NISTCSFFramework = exports.ISO27001Framework = exports.GDPRFramework = exports.PCIDSSFramework = exports.HIPAAFramework = exports.SOXFramework = exports.getFrameworkSummary = exports.getFrameworksByRegulation = exports.getControlMappings = exports.createFrameworkFromDefinition = exports.getAvailableFrameworks = exports.getFrameworkDefinition = exports.RiskAssessmentService = exports.AuditTrailService = exports.EvidenceCollectionService = exports.createComplianceSystem = exports.ComplianceManager = void 0;
exports.createDevComplianceSystem = createDevComplianceSystem;
// Compliance System Main Entry Point
var compliance_manager_1 = require("./services/compliance-manager");
Object.defineProperty(exports, "ComplianceManager", { enumerable: true, get: function () { return compliance_manager_1.ComplianceManager; } });
Object.defineProperty(exports, "createComplianceSystem", { enumerable: true, get: function () { return compliance_manager_1.createComplianceSystem; } });
// Core Services
var evidence_collection_service_1 = require("./services/evidence-collection-service");
Object.defineProperty(exports, "EvidenceCollectionService", { enumerable: true, get: function () { return evidence_collection_service_1.EvidenceCollectionService; } });
var audit_trail_service_1 = require("./services/audit-trail-service");
Object.defineProperty(exports, "AuditTrailService", { enumerable: true, get: function () { return audit_trail_service_1.AuditTrailService; } });
var risk_assessment_service_1 = require("./services/risk-assessment-service");
Object.defineProperty(exports, "RiskAssessmentService", { enumerable: true, get: function () { return risk_assessment_service_1.RiskAssessmentService; } });
// Frameworks
var frameworks_1 = require("./frameworks");
Object.defineProperty(exports, "getFrameworkDefinition", { enumerable: true, get: function () { return frameworks_1.getFrameworkDefinition; } });
Object.defineProperty(exports, "getAvailableFrameworks", { enumerable: true, get: function () { return frameworks_1.getAvailableFrameworks; } });
Object.defineProperty(exports, "createFrameworkFromDefinition", { enumerable: true, get: function () { return frameworks_1.createFrameworkFromDefinition; } });
Object.defineProperty(exports, "getControlMappings", { enumerable: true, get: function () { return frameworks_1.getControlMappings; } });
Object.defineProperty(exports, "getFrameworksByRegulation", { enumerable: true, get: function () { return frameworks_1.getFrameworksByRegulation; } });
Object.defineProperty(exports, "getFrameworkSummary", { enumerable: true, get: function () { return frameworks_1.getFrameworkSummary; } });
Object.defineProperty(exports, "SOXFramework", { enumerable: true, get: function () { return frameworks_1.SOXFramework; } });
Object.defineProperty(exports, "HIPAAFramework", { enumerable: true, get: function () { return frameworks_1.HIPAAFramework; } });
Object.defineProperty(exports, "PCIDSSFramework", { enumerable: true, get: function () { return frameworks_1.PCIDSSFramework; } });
Object.defineProperty(exports, "GDPRFramework", { enumerable: true, get: function () { return frameworks_1.GDPRFramework; } });
Object.defineProperty(exports, "ISO27001Framework", { enumerable: true, get: function () { return frameworks_1.ISO27001Framework; } });
Object.defineProperty(exports, "NISTCSFFramework", { enumerable: true, get: function () { return frameworks_1.NISTCSFFramework; } });
// Report Templates
var templates_1 = require("./templates");
Object.defineProperty(exports, "getReportTemplate", { enumerable: true, get: function () { return templates_1.getReportTemplate; } });
Object.defineProperty(exports, "getAllReportTemplates", { enumerable: true, get: function () { return templates_1.getAllReportTemplates; } });
Object.defineProperty(exports, "getReportTemplatesByType", { enumerable: true, get: function () { return templates_1.getReportTemplatesByType; } });
Object.defineProperty(exports, "getReportTemplatesByFramework", { enumerable: true, get: function () { return templates_1.getReportTemplatesByFramework; } });
Object.defineProperty(exports, "SOXComplianceReportTemplate", { enumerable: true, get: function () { return templates_1.SOXComplianceReportTemplate; } });
Object.defineProperty(exports, "HIPAAComplianceReportTemplate", { enumerable: true, get: function () { return templates_1.HIPAAComplianceReportTemplate; } });
Object.defineProperty(exports, "PCIDSSComplianceReportTemplate", { enumerable: true, get: function () { return templates_1.PCIDSSComplianceReportTemplate; } });
Object.defineProperty(exports, "ExecutiveDashboardTemplate", { enumerable: true, get: function () { return templates_1.ExecutiveDashboardTemplate; } });
Object.defineProperty(exports, "GapAnalysisReportTemplate", { enumerable: true, get: function () { return templates_1.GapAnalysisReportTemplate; } });
// Types and Schemas
__exportStar(require("./types/compliance.types"), exports);
// Utilities
var logger_1 = require("./utils/logger");
Object.defineProperty(exports, "logger", { enumerable: true, get: function () { return logger_1.logger; } });
// Version and Constants
exports.COMPLIANCE_SYSTEM_VERSION = '1.0.0';
exports.COMPLIANCE_FEATURES = {
    EVIDENCE_COLLECTION: 'evidence-collection',
    AUDIT_TRAIL: 'audit-trail',
    RISK_ASSESSMENT: 'risk-assessment',
    REPORT_GENERATION: 'report-generation',
    GAP_ANALYSIS: 'gap-analysis',
    DASHBOARD: 'executive-dashboard',
    AUTOMATION: 'compliance-automation'
};
exports.COMPLIANCE_CONSTANTS = {
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
};
// Default configuration
exports.DEFAULT_COMPLIANCE_CONFIG = {
    database: {
        type: 'sqlite',
        connection: './compliance.db'
    },
    compliance: {
        retentionPolicy: exports.COMPLIANCE_CONSTANTS.DEFAULT_RETENTION,
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
async function createDevComplianceSystem(customConfig) {
    const config = {
        ...exports.DEFAULT_COMPLIANCE_CONFIG,
        ...customConfig,
        database: {
            ...exports.DEFAULT_COMPLIANCE_CONFIG.database,
            ...(customConfig?.database || {})
        },
        compliance: {
            ...exports.DEFAULT_COMPLIANCE_CONFIG.compliance,
            ...(customConfig?.compliance || {})
        },
        services: {
            ...exports.DEFAULT_COMPLIANCE_CONFIG.services,
            ...(customConfig?.services || {})
        }
    };
    return await createComplianceSystem(config);
}
//# sourceMappingURL=index.js.map