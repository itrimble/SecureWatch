import { z } from 'zod';

// Base Enums
export const ComplianceFrameworkTypeSchema = z.enum([
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

export const ComplianceStatusSchema = z.enum([
  'compliant',
  'non_compliant',
  'partially_compliant',
  'not_applicable',
  'in_remediation',
  'compensating_control'
]);

export const AutomationLevelSchema = z.enum(['full', 'partial', 'manual']);

export const EvidenceTypeSchema = z.enum([
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

export const RiskLevelSchema = z.enum(['critical', 'high', 'medium', 'low', 'info']);

export const ReportFormatSchema = z.enum(['pdf', 'csv', 'json', 'xml', 'docx', 'xlsx', 'html']);

// Compliance Framework Definitions
export const ComplianceControlSchema = z.object({
  id: z.string(),
  controlId: z.string(), // Original ID in the framework (e.g., "CC6.1" for SOX)
  title: z.string(),
  description: z.string(),
  categoryId: z.string(),
  requirements: z.array(z.string()),
  evidenceTypes: z.array(EvidenceTypeSchema),
  automationLevel: AutomationLevelSchema,
  implementationGuidance: z.string().optional(),
  testingProcedures: z.array(z.string()).optional(),
  references: z.array(z.string()).optional(),
  mappedControls: z.array(z.object({
    frameworkId: z.string(),
    controlId: z.string()
  })).optional(),
  tags: z.array(z.string()).default([]),
  riskWeight: z.number().min(1).max(10).default(5)
});

export const ComplianceCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  parentId: z.string().optional(),
  order: z.number()
});

export const ComplianceFrameworkSchema = z.object({
  id: z.string(),
  type: ComplianceFrameworkTypeSchema,
  name: z.string(),
  version: z.string(),
  description: z.string(),
  effectiveDate: z.date(),
  categories: z.array(ComplianceCategorySchema),
  controls: z.array(ComplianceControlSchema),
  metadata: z.record(z.any()).default({})
});

// Evidence Collection
export const ComplianceEvidenceSchema = z.object({
  id: z.string(),
  type: EvidenceTypeSchema,
  source: z.string(),
  collectedAt: z.date(),
  collectorId: z.string(), // User or system that collected
  data: z.any(),
  hash: z.string(), // SHA-256 hash for integrity
  size: z.number(), // Size in bytes
  retention: z.object({
    policy: z.string(),
    expiresAt: z.date().optional()
  }).optional(),
  metadata: z.record(z.any()).default({})
});

export const EvidenceCollectionRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  frameworkId: z.string(),
  controlIds: z.array(z.string()),
  evidenceType: EvidenceTypeSchema,
  automation: z.object({
    enabled: z.boolean(),
    schedule: z.string().optional(), // Cron expression
    lastRun: z.date().optional(),
    nextRun: z.date().optional()
  }),
  collector: z.object({
    type: z.enum(['api', 'script', 'query', 'manual']),
    config: z.record(z.any())
  }),
  validation: z.object({
    required: z.boolean(),
    rules: z.array(z.object({
      field: z.string(),
      operator: z.enum(['equals', 'contains', 'matches', 'exists', 'greater_than', 'less_than']),
      value: z.any()
    }))
  }).optional(),
  active: z.boolean().default(true)
});

// Audit Trail
export const AuditEventSchema = z.object({
  id: z.string(),
  timestamp: z.date(),
  userId: z.string(),
  userEmail: z.string(),
  userRole: z.string(),
  action: z.string(),
  resource: z.object({
    type: z.string(),
    id: z.string(),
    name: z.string().optional()
  }),
  details: z.record(z.any()),
  result: z.enum(['success', 'failure', 'partial']),
  ipAddress: z.string(),
  userAgent: z.string().optional(),
  sessionId: z.string(),
  correlationId: z.string().optional(),
  compliance: z.object({
    frameworkIds: z.array(z.string()),
    controlIds: z.array(z.string())
  }).optional()
});

// Risk Assessment
export const ComplianceRiskSchema = z.object({
  id: z.string(),
  frameworkId: z.string(),
  controlId: z.string(),
  riskLevel: RiskLevelSchema,
  likelihood: z.number().min(1).max(5),
  impact: z.number().min(1).max(5),
  riskScore: z.number(), // likelihood * impact * control weight
  description: z.string(),
  mitigations: z.array(z.object({
    id: z.string(),
    description: z.string(),
    type: z.enum(['technical', 'administrative', 'physical']),
    effectiveness: z.number().min(0).max(100),
    implementationStatus: z.enum(['planned', 'in_progress', 'implemented', 'verified'])
  })),
  residualRisk: z.number(),
  acceptedBy: z.string().optional(),
  acceptedAt: z.date().optional(),
  reviewDate: z.date(),
  metadata: z.record(z.any()).default({})
});

// Compliance Assessment
export const ComplianceAssessmentSchema = z.object({
  id: z.string(),
  frameworkId: z.string(),
  assessmentDate: z.date(),
  assessorId: z.string(),
  scope: z.object({
    departments: z.array(z.string()),
    systems: z.array(z.string()),
    processes: z.array(z.string()),
    locations: z.array(z.string()).optional()
  }),
  controlAssessments: z.array(z.object({
    controlId: z.string(),
    status: ComplianceStatusSchema,
    evidence: z.array(z.string()), // Evidence IDs
    findings: z.array(z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      severity: RiskLevelSchema,
      remediation: z.string().optional(),
      dueDate: z.date().optional()
    })),
    notes: z.string(),
    assessedAt: z.date(),
    assessedBy: z.string()
  })),
  overallStatus: ComplianceStatusSchema,
  completedAt: z.date().optional(),
  approvedBy: z.string().optional(),
  approvedAt: z.date().optional(),
  nextAssessmentDate: z.date(),
  metadata: z.record(z.any()).default({})
});

// Reporting
export const ReportTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  frameworkId: z.string().optional(),
  type: z.enum(['compliance', 'audit', 'risk', 'executive', 'technical', 'gap_analysis']),
  sections: z.array(z.object({
    id: z.string(),
    title: z.string(),
    type: z.enum(['summary', 'details', 'chart', 'table', 'matrix', 'narrative']),
    config: z.record(z.any()),
    order: z.number()
  })),
  filters: z.array(z.object({
    field: z.string(),
    operator: z.string(),
    value: z.any()
  })).optional(),
  schedule: z.object({
    enabled: z.boolean(),
    frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'annually']),
    recipients: z.array(z.string()),
    format: ReportFormatSchema,
    nextRun: z.date().optional()
  }).optional(),
  createdBy: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  isPublic: z.boolean().default(false)
});

export const ComplianceReportSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  templateId: z.string().optional(),
  frameworkId: z.string(),
  generatedAt: z.date(),
  generatedBy: z.string(),
  period: z.object({
    start: z.date(),
    end: z.date()
  }),
  controls: z.array(z.object({
    controlId: z.string(),
    status: ComplianceStatusSchema,
    evidence: z.array(ComplianceEvidenceSchema),
    findings: z.array(z.string()), // Finding IDs
    notes: z.string(),
    score: z.number().min(0).max(100)
  })),
  summary: z.object({
    totalControls: z.number(),
    compliantCount: z.number(),
    nonCompliantCount: z.number(),
    partiallyCompliantCount: z.number(),
    notApplicableCount: z.number(),
    inRemediationCount: z.number(),
    overallComplianceScore: z.number(), // Percentage
    riskScore: z.number(),
    trendsFromLastPeriod: z.object({
      scoreChange: z.number(),
      newFindings: z.number(),
      resolvedFindings: z.number()
    }).optional()
  }),
  executiveSummary: z.string().optional(),
  recommendations: z.array(z.object({
    priority: RiskLevelSchema,
    title: z.string(),
    description: z.string(),
    affectedControls: z.array(z.string()),
    estimatedEffort: z.string().optional()
  })).optional(),
  attestation: z.object({
    attestedBy: z.string(),
    attestedAt: z.date(),
    signature: z.string().optional()
  }).optional(),
  distribution: z.array(z.string()).optional(),
  metadata: z.record(z.any()).default({})
});

// Gap Analysis
export const ComplianceGapSchema = z.object({
  id: z.string(),
  frameworkId: z.string(),
  controlId: z.string(),
  currentState: z.object({
    status: ComplianceStatusSchema,
    maturityLevel: z.number().min(1).max(5),
    evidence: z.array(z.string())
  }),
  targetState: z.object({
    status: ComplianceStatusSchema,
    maturityLevel: z.number().min(1).max(5),
    requirements: z.array(z.string())
  }),
  gap: z.object({
    description: z.string(),
    severity: RiskLevelSchema,
    remediationSteps: z.array(z.object({
      step: z.number(),
      description: z.string(),
      owner: z.string().optional(),
      dueDate: z.date().optional(),
      effort: z.string().optional(),
      dependencies: z.array(z.string()).optional()
    })),
    estimatedCost: z.number().optional(),
    estimatedEffort: z.string().optional()
  }),
  identifiedAt: z.date(),
  identifiedBy: z.string(),
  reviewedAt: z.date().optional(),
  reviewedBy: z.string().optional(),
  closedAt: z.date().optional(),
  metadata: z.record(z.any()).default({})
});

// Dashboard Metrics
export const ComplianceDashboardSchema = z.object({
  overallCompliance: z.object({
    score: z.number(),
    trend: z.enum(['improving', 'stable', 'declining']),
    change: z.number()
  }),
  frameworkStatus: z.array(z.object({
    frameworkId: z.string(),
    frameworkName: z.string(),
    complianceScore: z.number(),
    controlsTotal: z.number(),
    controlsCompliant: z.number(),
    lastAssessment: z.date(),
    nextAssessment: z.date()
  })),
  riskOverview: z.object({
    criticalRisks: z.number(),
    highRisks: z.number(),
    mediumRisks: z.number(),
    lowRisks: z.number(),
    totalRiskScore: z.number(),
    trendsFromLastPeriod: z.object({
      newRisks: z.number(),
      mitigatedRisks: z.number(),
      acceptedRisks: z.number()
    })
  }),
  upcomingActivities: z.array(z.object({
    type: z.enum(['assessment', 'audit', 'report', 'remediation']),
    title: z.string(),
    dueDate: z.date(),
    owner: z.string(),
    priority: RiskLevelSchema
  })),
  recentFindings: z.array(z.object({
    id: z.string(),
    title: z.string(),
    severity: RiskLevelSchema,
    framework: z.string(),
    control: z.string(),
    identifiedAt: z.date(),
    status: z.enum(['open', 'in_progress', 'resolved'])
  })),
  evidenceCollection: z.object({
    totalEvidence: z.number(),
    automatedCollection: z.number(),
    manualCollection: z.number(),
    lastCollectionRun: z.date(),
    nextScheduledRun: z.date().optional()
  })
});

// Configuration
export const ComplianceConfigSchema = z.object({
  retentionPolicy: z.object({
    auditLogs: z.number(), // Days
    evidence: z.number(),
    reports: z.number(),
    assessments: z.number()
  }),
  automation: z.object({
    enabledFrameworks: z.array(ComplianceFrameworkTypeSchema),
    evidenceCollection: z.boolean(),
    reportGeneration: z.boolean(),
    riskScoring: z.boolean(),
    notifications: z.object({
      enabled: z.boolean(),
      channels: z.array(z.enum(['email', 'webhook', 'sms'])),
      recipients: z.record(z.array(z.string()))
    })
  }),
  scoring: z.object({
    method: z.enum(['weighted', 'simple', 'risk-based']),
    weights: z.record(z.number()).optional()
  }),
  integrations: z.array(z.object({
    id: z.string(),
    type: z.string(),
    name: z.string(),
    config: z.record(z.any()),
    enabled: z.boolean()
  }))
});

// Database Configuration
export const DatabaseConfigSchema = z.object({
  type: z.enum(['sqlite', 'mysql', 'postgresql']),
  connection: z.union([
    z.string(),
    z.object({
      host: z.string(),
      port: z.number(),
      database: z.string(),
      user: z.string(),
      password: z.string()
    })
  ])
});

// Type exports
export type ComplianceFrameworkType = z.infer<typeof ComplianceFrameworkTypeSchema>;
export type ComplianceStatus = z.infer<typeof ComplianceStatusSchema>;
export type AutomationLevel = z.infer<typeof AutomationLevelSchema>;
export type EvidenceType = z.infer<typeof EvidenceTypeSchema>;
export type RiskLevel = z.infer<typeof RiskLevelSchema>;
export type ReportFormat = z.infer<typeof ReportFormatSchema>;

export type ComplianceControl = z.infer<typeof ComplianceControlSchema>;
export type ComplianceCategory = z.infer<typeof ComplianceCategorySchema>;
export type ComplianceFramework = z.infer<typeof ComplianceFrameworkSchema>;
export type ComplianceEvidence = z.infer<typeof ComplianceEvidenceSchema>;
export type EvidenceCollectionRule = z.infer<typeof EvidenceCollectionRuleSchema>;
export type AuditEvent = z.infer<typeof AuditEventSchema>;
export type ComplianceRisk = z.infer<typeof ComplianceRiskSchema>;
export type ComplianceAssessment = z.infer<typeof ComplianceAssessmentSchema>;
export type ReportTemplate = z.infer<typeof ReportTemplateSchema>;
export type ComplianceReport = z.infer<typeof ComplianceReportSchema>;
export type ComplianceGap = z.infer<typeof ComplianceGapSchema>;
export type ComplianceDashboard = z.infer<typeof ComplianceDashboardSchema>;
export type ComplianceConfig = z.infer<typeof ComplianceConfigSchema>;
export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;

// Helper Types
export interface ComplianceFrameworkDefinition {
  type: ComplianceFrameworkType;
  name: string;
  version: string;
  description: string;
  categories: Omit<ComplianceCategory, 'id'>[];
  controls: Omit<ComplianceControl, 'id'>[];
}

export interface EvidenceCollectionRequest {
  frameworkId: string;
  controlIds: string[];
  evidenceType: EvidenceType;
  source: string;
  data: any;
}

export interface ComplianceAssessmentRequest {
  frameworkId: string;
  scope: {
    departments: string[];
    systems: string[];
    processes: string[];
    locations?: string[];
  };
  assessorId: string;
}

export interface ReportGenerationRequest {
  templateId?: string;
  frameworkId: string;
  period: {
    start: Date;
    end: Date;
  };
  format: ReportFormat;
  includeEvidence?: boolean;
  includeRecommendations?: boolean;
}

export interface GapAnalysisRequest {
  frameworkId: string;
  targetMaturityLevel?: number;
  includeRemediationPlan?: boolean;
  priorityThreshold?: RiskLevel;
}

// Search and Filter Types
export interface ComplianceSearchFilters {
  frameworks?: ComplianceFrameworkType[];
  status?: ComplianceStatus[];
  riskLevels?: RiskLevel[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  departments?: string[];
  systems?: string[];
  tags?: string[];
}

export interface Pagination {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}