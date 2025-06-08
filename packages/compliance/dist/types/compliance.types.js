"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseConfigSchema = exports.ComplianceConfigSchema = exports.ComplianceDashboardSchema = exports.ComplianceGapSchema = exports.ComplianceReportSchema = exports.ReportTemplateSchema = exports.ComplianceAssessmentSchema = exports.ComplianceRiskSchema = exports.AuditEventSchema = exports.EvidenceCollectionRuleSchema = exports.ComplianceEvidenceSchema = exports.ComplianceFrameworkSchema = exports.ComplianceCategorySchema = exports.ComplianceControlSchema = exports.ReportFormatSchema = exports.RiskLevelSchema = exports.EvidenceTypeSchema = exports.AutomationLevelSchema = exports.ComplianceStatusSchema = exports.ComplianceFrameworkTypeSchema = void 0;
const zod_1 = require("zod");
// Base Enums
exports.ComplianceFrameworkTypeSchema = zod_1.z.enum([
    'SOX',
    'HIPAA',
    'PCI-DSS',
    'GDPR',
    'ISO-27001',
    'NIST-CSF',
    'NIST-800-53',
    'NIST-800-171',
    'CIS',
    'COBIT',
    'FISMA',
    'CCPA',
    'FedRAMP',
    'CMMC'
]);
exports.ComplianceStatusSchema = zod_1.z.enum([
    'compliant',
    'non_compliant',
    'partially_compliant',
    'not_applicable',
    'in_remediation',
    'compensating_control'
]);
exports.AutomationLevelSchema = zod_1.z.enum(['full', 'partial', 'manual']);
exports.EvidenceTypeSchema = zod_1.z.enum([
    'configuration',
    'log_data',
    'screenshot',
    'document',
    'api_response',
    'scan_result',
    'user_attestation',
    'system_report',
    'policy_document',
    'process_output',
    'database_query',
    'file_integrity',
    'network_capture',
    'access_review',
    'vulnerability_scan'
]);
exports.RiskLevelSchema = zod_1.z.enum(['critical', 'high', 'medium', 'low', 'info']);
exports.ReportFormatSchema = zod_1.z.enum(['pdf', 'csv', 'json', 'xml', 'docx', 'xlsx', 'html']);
// Compliance Framework Definitions
exports.ComplianceControlSchema = zod_1.z.object({
    id: zod_1.z.string(),
    controlId: zod_1.z.string(), // Original ID in the framework (e.g., "CC6.1" for SOX)
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    categoryId: zod_1.z.string(),
    requirements: zod_1.z.array(zod_1.z.string()),
    evidenceTypes: zod_1.z.array(exports.EvidenceTypeSchema),
    automationLevel: exports.AutomationLevelSchema,
    implementationGuidance: zod_1.z.string().optional(),
    testingProcedures: zod_1.z.array(zod_1.z.string()).optional(),
    references: zod_1.z.array(zod_1.z.string()).optional(),
    mappedControls: zod_1.z.array(zod_1.z.object({
        frameworkId: zod_1.z.string(),
        controlId: zod_1.z.string()
    })).optional(),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    riskWeight: zod_1.z.number().min(1).max(10).default(5)
});
exports.ComplianceCategorySchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    parentId: zod_1.z.string().optional(),
    order: zod_1.z.number()
});
exports.ComplianceFrameworkSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: exports.ComplianceFrameworkTypeSchema,
    name: zod_1.z.string(),
    version: zod_1.z.string(),
    description: zod_1.z.string(),
    effectiveDate: zod_1.z.date(),
    categories: zod_1.z.array(exports.ComplianceCategorySchema),
    controls: zod_1.z.array(exports.ComplianceControlSchema),
    metadata: zod_1.z.record(zod_1.z.any()).default({})
});
// Evidence Collection
exports.ComplianceEvidenceSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: exports.EvidenceTypeSchema,
    source: zod_1.z.string(),
    collectedAt: zod_1.z.date(),
    collectorId: zod_1.z.string(), // User or system that collected
    data: zod_1.z.any(),
    hash: zod_1.z.string(), // SHA-256 hash for integrity
    size: zod_1.z.number(), // Size in bytes
    retention: zod_1.z.object({
        policy: zod_1.z.string(),
        expiresAt: zod_1.z.date().optional()
    }).optional(),
    metadata: zod_1.z.record(zod_1.z.any()).default({})
});
exports.EvidenceCollectionRuleSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    frameworkId: zod_1.z.string(),
    controlIds: zod_1.z.array(zod_1.z.string()),
    evidenceType: exports.EvidenceTypeSchema,
    automation: zod_1.z.object({
        enabled: zod_1.z.boolean(),
        schedule: zod_1.z.string().optional(), // Cron expression
        lastRun: zod_1.z.date().optional(),
        nextRun: zod_1.z.date().optional()
    }),
    collector: zod_1.z.object({
        type: zod_1.z.enum(['api', 'script', 'query', 'manual']),
        config: zod_1.z.record(zod_1.z.any())
    }),
    validation: zod_1.z.object({
        required: zod_1.z.boolean(),
        rules: zod_1.z.array(zod_1.z.object({
            field: zod_1.z.string(),
            operator: zod_1.z.enum(['equals', 'contains', 'matches', 'exists', 'greater_than', 'less_than']),
            value: zod_1.z.any()
        }))
    }).optional(),
    active: zod_1.z.boolean().default(true)
});
// Audit Trail
exports.AuditEventSchema = zod_1.z.object({
    id: zod_1.z.string(),
    timestamp: zod_1.z.date(),
    userId: zod_1.z.string(),
    userEmail: zod_1.z.string(),
    userRole: zod_1.z.string(),
    action: zod_1.z.string(),
    resource: zod_1.z.object({
        type: zod_1.z.string(),
        id: zod_1.z.string(),
        name: zod_1.z.string().optional()
    }),
    details: zod_1.z.record(zod_1.z.any()),
    result: zod_1.z.enum(['success', 'failure', 'partial']),
    ipAddress: zod_1.z.string(),
    userAgent: zod_1.z.string().optional(),
    sessionId: zod_1.z.string(),
    correlationId: zod_1.z.string().optional(),
    compliance: zod_1.z.object({
        frameworkIds: zod_1.z.array(zod_1.z.string()),
        controlIds: zod_1.z.array(zod_1.z.string())
    }).optional()
});
// Risk Assessment
exports.ComplianceRiskSchema = zod_1.z.object({
    id: zod_1.z.string(),
    frameworkId: zod_1.z.string(),
    controlId: zod_1.z.string(),
    riskLevel: exports.RiskLevelSchema,
    likelihood: zod_1.z.number().min(1).max(5),
    impact: zod_1.z.number().min(1).max(5),
    riskScore: zod_1.z.number(), // likelihood * impact * control weight
    description: zod_1.z.string(),
    mitigations: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        description: zod_1.z.string(),
        type: zod_1.z.enum(['technical', 'administrative', 'physical']),
        effectiveness: zod_1.z.number().min(0).max(100),
        implementationStatus: zod_1.z.enum(['planned', 'in_progress', 'implemented', 'verified'])
    })),
    residualRisk: zod_1.z.number(),
    acceptedBy: zod_1.z.string().optional(),
    acceptedAt: zod_1.z.date().optional(),
    reviewDate: zod_1.z.date(),
    metadata: zod_1.z.record(zod_1.z.any()).default({})
});
// Compliance Assessment
exports.ComplianceAssessmentSchema = zod_1.z.object({
    id: zod_1.z.string(),
    frameworkId: zod_1.z.string(),
    assessmentDate: zod_1.z.date(),
    assessorId: zod_1.z.string(),
    scope: zod_1.z.object({
        departments: zod_1.z.array(zod_1.z.string()),
        systems: zod_1.z.array(zod_1.z.string()),
        processes: zod_1.z.array(zod_1.z.string()),
        locations: zod_1.z.array(zod_1.z.string()).optional()
    }),
    controlAssessments: zod_1.z.array(zod_1.z.object({
        controlId: zod_1.z.string(),
        status: exports.ComplianceStatusSchema,
        evidence: zod_1.z.array(zod_1.z.string()), // Evidence IDs
        findings: zod_1.z.array(zod_1.z.object({
            id: zod_1.z.string(),
            title: zod_1.z.string(),
            description: zod_1.z.string(),
            severity: exports.RiskLevelSchema,
            remediation: zod_1.z.string().optional(),
            dueDate: zod_1.z.date().optional()
        })),
        notes: zod_1.z.string(),
        assessedAt: zod_1.z.date(),
        assessedBy: zod_1.z.string()
    })),
    overallStatus: exports.ComplianceStatusSchema,
    completedAt: zod_1.z.date().optional(),
    approvedBy: zod_1.z.string().optional(),
    approvedAt: zod_1.z.date().optional(),
    nextAssessmentDate: zod_1.z.date(),
    metadata: zod_1.z.record(zod_1.z.any()).default({})
});
// Reporting
exports.ReportTemplateSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    frameworkId: zod_1.z.string().optional(),
    type: zod_1.z.enum(['compliance', 'audit', 'risk', 'executive', 'technical', 'gap_analysis']),
    sections: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        title: zod_1.z.string(),
        type: zod_1.z.enum(['summary', 'details', 'chart', 'table', 'matrix', 'narrative']),
        config: zod_1.z.record(zod_1.z.any()),
        order: zod_1.z.number()
    })),
    filters: zod_1.z.array(zod_1.z.object({
        field: zod_1.z.string(),
        operator: zod_1.z.string(),
        value: zod_1.z.any()
    })).optional(),
    schedule: zod_1.z.object({
        enabled: zod_1.z.boolean(),
        frequency: zod_1.z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'annually']),
        recipients: zod_1.z.array(zod_1.z.string()),
        format: exports.ReportFormatSchema,
        nextRun: zod_1.z.date().optional()
    }).optional(),
    createdBy: zod_1.z.string(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    isPublic: zod_1.z.boolean().default(false)
});
exports.ComplianceReportSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    templateId: zod_1.z.string().optional(),
    frameworkId: zod_1.z.string(),
    generatedAt: zod_1.z.date(),
    generatedBy: zod_1.z.string(),
    period: zod_1.z.object({
        start: zod_1.z.date(),
        end: zod_1.z.date()
    }),
    controls: zod_1.z.array(zod_1.z.object({
        controlId: zod_1.z.string(),
        status: exports.ComplianceStatusSchema,
        evidence: zod_1.z.array(exports.ComplianceEvidenceSchema),
        findings: zod_1.z.array(zod_1.z.string()), // Finding IDs
        notes: zod_1.z.string(),
        score: zod_1.z.number().min(0).max(100)
    })),
    summary: zod_1.z.object({
        totalControls: zod_1.z.number(),
        compliantCount: zod_1.z.number(),
        nonCompliantCount: zod_1.z.number(),
        partiallyCompliantCount: zod_1.z.number(),
        notApplicableCount: zod_1.z.number(),
        inRemediationCount: zod_1.z.number(),
        overallComplianceScore: zod_1.z.number(), // Percentage
        riskScore: zod_1.z.number(),
        trendsFromLastPeriod: zod_1.z.object({
            scoreChange: zod_1.z.number(),
            newFindings: zod_1.z.number(),
            resolvedFindings: zod_1.z.number()
        }).optional()
    }),
    executiveSummary: zod_1.z.string().optional(),
    recommendations: zod_1.z.array(zod_1.z.object({
        priority: exports.RiskLevelSchema,
        title: zod_1.z.string(),
        description: zod_1.z.string(),
        affectedControls: zod_1.z.array(zod_1.z.string()),
        estimatedEffort: zod_1.z.string().optional()
    })).optional(),
    attestation: zod_1.z.object({
        attestedBy: zod_1.z.string(),
        attestedAt: zod_1.z.date(),
        signature: zod_1.z.string().optional()
    }).optional(),
    distribution: zod_1.z.array(zod_1.z.string()).optional(),
    metadata: zod_1.z.record(zod_1.z.any()).default({})
});
// Gap Analysis
exports.ComplianceGapSchema = zod_1.z.object({
    id: zod_1.z.string(),
    frameworkId: zod_1.z.string(),
    controlId: zod_1.z.string(),
    currentState: zod_1.z.object({
        status: exports.ComplianceStatusSchema,
        maturityLevel: zod_1.z.number().min(1).max(5),
        evidence: zod_1.z.array(zod_1.z.string())
    }),
    targetState: zod_1.z.object({
        status: exports.ComplianceStatusSchema,
        maturityLevel: zod_1.z.number().min(1).max(5),
        requirements: zod_1.z.array(zod_1.z.string())
    }),
    gap: zod_1.z.object({
        description: zod_1.z.string(),
        severity: exports.RiskLevelSchema,
        remediationSteps: zod_1.z.array(zod_1.z.object({
            step: zod_1.z.number(),
            description: zod_1.z.string(),
            owner: zod_1.z.string().optional(),
            dueDate: zod_1.z.date().optional(),
            effort: zod_1.z.string().optional(),
            dependencies: zod_1.z.array(zod_1.z.string()).optional()
        })),
        estimatedCost: zod_1.z.number().optional(),
        estimatedEffort: zod_1.z.string().optional()
    }),
    identifiedAt: zod_1.z.date(),
    identifiedBy: zod_1.z.string(),
    reviewedAt: zod_1.z.date().optional(),
    reviewedBy: zod_1.z.string().optional(),
    closedAt: zod_1.z.date().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).default({})
});
// Dashboard Metrics
exports.ComplianceDashboardSchema = zod_1.z.object({
    overallCompliance: zod_1.z.object({
        score: zod_1.z.number(),
        trend: zod_1.z.enum(['improving', 'stable', 'declining']),
        change: zod_1.z.number()
    }),
    frameworkStatus: zod_1.z.array(zod_1.z.object({
        frameworkId: zod_1.z.string(),
        frameworkName: zod_1.z.string(),
        complianceScore: zod_1.z.number(),
        controlsTotal: zod_1.z.number(),
        controlsCompliant: zod_1.z.number(),
        lastAssessment: zod_1.z.date(),
        nextAssessment: zod_1.z.date()
    })),
    riskOverview: zod_1.z.object({
        criticalRisks: zod_1.z.number(),
        highRisks: zod_1.z.number(),
        mediumRisks: zod_1.z.number(),
        lowRisks: zod_1.z.number(),
        totalRiskScore: zod_1.z.number(),
        trendsFromLastPeriod: zod_1.z.object({
            newRisks: zod_1.z.number(),
            mitigatedRisks: zod_1.z.number(),
            acceptedRisks: zod_1.z.number()
        })
    }),
    upcomingActivities: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.enum(['assessment', 'audit', 'report', 'remediation']),
        title: zod_1.z.string(),
        dueDate: zod_1.z.date(),
        owner: zod_1.z.string(),
        priority: exports.RiskLevelSchema
    })),
    recentFindings: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        title: zod_1.z.string(),
        severity: exports.RiskLevelSchema,
        framework: zod_1.z.string(),
        control: zod_1.z.string(),
        identifiedAt: zod_1.z.date(),
        status: zod_1.z.enum(['open', 'in_progress', 'resolved'])
    })),
    evidenceCollection: zod_1.z.object({
        totalEvidence: zod_1.z.number(),
        automatedCollection: zod_1.z.number(),
        manualCollection: zod_1.z.number(),
        lastCollectionRun: zod_1.z.date(),
        nextScheduledRun: zod_1.z.date().optional()
    })
});
// Configuration
exports.ComplianceConfigSchema = zod_1.z.object({
    retentionPolicy: zod_1.z.object({
        auditLogs: zod_1.z.number(), // Days
        evidence: zod_1.z.number(),
        reports: zod_1.z.number(),
        assessments: zod_1.z.number()
    }),
    automation: zod_1.z.object({
        enabledFrameworks: zod_1.z.array(exports.ComplianceFrameworkTypeSchema),
        evidenceCollection: zod_1.z.boolean(),
        reportGeneration: zod_1.z.boolean(),
        riskScoring: zod_1.z.boolean(),
        notifications: zod_1.z.object({
            enabled: zod_1.z.boolean(),
            channels: zod_1.z.array(zod_1.z.enum(['email', 'webhook', 'sms'])),
            recipients: zod_1.z.record(zod_1.z.array(zod_1.z.string()))
        })
    }),
    scoring: zod_1.z.object({
        method: zod_1.z.enum(['weighted', 'simple', 'risk-based']),
        weights: zod_1.z.record(zod_1.z.number()).optional()
    }),
    integrations: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        type: zod_1.z.string(),
        name: zod_1.z.string(),
        config: zod_1.z.record(zod_1.z.any()),
        enabled: zod_1.z.boolean()
    }))
});
// Database Configuration
exports.DatabaseConfigSchema = zod_1.z.object({
    type: zod_1.z.enum(['sqlite', 'mysql', 'postgresql']),
    connection: zod_1.z.union([
        zod_1.z.string(),
        zod_1.z.object({
            host: zod_1.z.string(),
            port: zod_1.z.number(),
            database: zod_1.z.string(),
            user: zod_1.z.string(),
            password: zod_1.z.string()
        })
    ])
});
//# sourceMappingURL=compliance.types.js.map