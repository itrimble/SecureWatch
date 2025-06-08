"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceIntegrityError = exports.PlaybookExecutionError = exports.IRError = exports.IRConfigSchema = exports.CaseReportSchema = exports.ForensicCollectionSchema = exports.SOARIntegrationSchema = exports.TimelineEventSchema = exports.ActionResultSchema = exports.PlaybookResultSchema = exports.ExecutionContextSchema = exports.PlaybookSchema = exports.PlaybookStepSchema = exports.PlaybookActionSchema = exports.PlaybookConditionSchema = exports.EscalationRuleSchema = exports.NotificationSchema = exports.CommentSchema = exports.TaskSchema = exports.EvidenceSchema = exports.CaseSchema = exports.UserSchema = exports.ActionTypeSchema = exports.PlaybookStepTypeSchema = exports.NotificationChannelSchema = exports.TaskStatusSchema = exports.EvidenceTypeSchema = exports.CasePrioritySchema = exports.CaseStatusSchema = exports.CaseSeveritySchema = void 0;
const zod_1 = require("zod");
// Base Enums and Constants
exports.CaseSeveritySchema = zod_1.z.enum(['low', 'medium', 'high', 'critical']);
exports.CaseStatusSchema = zod_1.z.enum(['open', 'in-progress', 'resolved', 'closed', 'escalated']);
exports.CasePrioritySchema = zod_1.z.enum(['p1', 'p2', 'p3', 'p4']);
exports.EvidenceTypeSchema = zod_1.z.enum(['file', 'log', 'screenshot', 'network-capture', 'memory-dump', 'disk-image', 'registry', 'email', 'document', 'other']);
exports.TaskStatusSchema = zod_1.z.enum(['pending', 'assigned', 'in-progress', 'completed', 'blocked']);
exports.NotificationChannelSchema = zod_1.z.enum(['email', 'sms', 'slack', 'teams', 'webhook', 'pagerduty']);
exports.PlaybookStepTypeSchema = zod_1.z.enum(['manual', 'automated', 'approval', 'decision']);
exports.ActionTypeSchema = zod_1.z.enum(['notification', 'api_call', 'enrichment', 'isolation', 'quarantine', 'block_ip', 'disable_user', 'collect_evidence', 'custom']);
// User and Role Schemas
exports.UserSchema = zod_1.z.object({
    id: zod_1.z.string(),
    username: zod_1.z.string(),
    email: zod_1.z.string().email(),
    fullName: zod_1.z.string(),
    role: zod_1.z.enum(['analyst', 'senior-analyst', 'manager', 'admin']),
    department: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
    timezone: zod_1.z.string().default('UTC'),
    notificationPreferences: zod_1.z.object({
        email: zod_1.z.boolean().default(true),
        sms: zod_1.z.boolean().default(false),
        slack: zod_1.z.boolean().default(false),
        teams: zod_1.z.boolean().default(false)
    }).default({}),
    active: zod_1.z.boolean().default(true)
});
// Case Management Schemas
exports.CaseSchema = zod_1.z.object({
    id: zod_1.z.string(),
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    severity: exports.CaseSeveritySchema,
    priority: exports.CasePrioritySchema,
    status: exports.CaseStatusSchema,
    assignee: zod_1.z.string().optional(),
    reporter: zod_1.z.string(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    closedAt: zod_1.z.date().optional(),
    dueDate: zod_1.z.date().optional(),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    category: zod_1.z.string().optional(),
    subcategory: zod_1.z.string().optional(),
    affectedSystems: zod_1.z.array(zod_1.z.string()).default([]),
    affectedUsers: zod_1.z.array(zod_1.z.string()).default([]),
    sourceAlerts: zod_1.z.array(zod_1.z.string()).default([]),
    relatedCases: zod_1.z.array(zod_1.z.string()).default([]),
    mitreAttackTechniques: zod_1.z.array(zod_1.z.string()).default([]),
    iocs: zod_1.z.array(zod_1.z.string()).default([]),
    timeline: zod_1.z.array(zod_1.z.object({
        timestamp: zod_1.z.date(),
        event: zod_1.z.string(),
        details: zod_1.z.string(),
        source: zod_1.z.string(),
        userId: zod_1.z.string().optional(),
        automated: zod_1.z.boolean().default(false)
    })).default([]),
    metrics: zod_1.z.object({
        timeToDetection: zod_1.z.number().optional(),
        timeToResponse: zod_1.z.number().optional(),
        timeToContainment: zod_1.z.number().optional(),
        timeToResolution: zod_1.z.number().optional(),
        businessImpact: zod_1.z.string().optional(),
        estimatedLoss: zod_1.z.number().optional()
    }).default({}),
    metadata: zod_1.z.record(zod_1.z.any()).default({})
});
// Evidence Management Schemas
exports.EvidenceSchema = zod_1.z.object({
    id: zod_1.z.string(),
    caseId: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    type: exports.EvidenceTypeSchema,
    size: zod_1.z.number(),
    hash: zod_1.z.object({
        md5: zod_1.z.string().optional(),
        sha1: zod_1.z.string().optional(),
        sha256: zod_1.z.string(),
        sha512: zod_1.z.string().optional()
    }),
    source: zod_1.z.string(),
    collectedBy: zod_1.z.string(),
    collectedAt: zod_1.z.date(),
    chainOfCustody: zod_1.z.array(zod_1.z.object({
        timestamp: zod_1.z.date(),
        action: zod_1.z.enum(['collected', 'transferred', 'analyzed', 'stored', 'deleted']),
        userId: zod_1.z.string(),
        location: zod_1.z.string(),
        notes: zod_1.z.string().optional()
    })).default([]),
    filePath: zod_1.z.string().optional(),
    originalFilename: zod_1.z.string().optional(),
    mimeType: zod_1.z.string().optional(),
    isDeleted: zod_1.z.boolean().default(false),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    metadata: zod_1.z.record(zod_1.z.any()).default({})
});
// Task Management Schemas
exports.TaskSchema = zod_1.z.object({
    id: zod_1.z.string(),
    caseId: zod_1.z.string(),
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    status: exports.TaskStatusSchema,
    assignee: zod_1.z.string().optional(),
    assignedBy: zod_1.z.string(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    dueDate: zod_1.z.date().optional(),
    completedAt: zod_1.z.date().optional(),
    priority: exports.CasePrioritySchema,
    estimatedHours: zod_1.z.number().optional(),
    actualHours: zod_1.z.number().optional(),
    dependencies: zod_1.z.array(zod_1.z.string()).default([]),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    checklist: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        task: zod_1.z.string(),
        completed: zod_1.z.boolean().default(false),
        completedAt: zod_1.z.date().optional(),
        completedBy: zod_1.z.string().optional()
    })).default([]),
    comments: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        userId: zod_1.z.string(),
        content: zod_1.z.string(),
        timestamp: zod_1.z.date(),
        edited: zod_1.z.boolean().default(false),
        editedAt: zod_1.z.date().optional()
    })).default([]),
    metadata: zod_1.z.record(zod_1.z.any()).default({})
});
// Communication and Collaboration Schemas
exports.CommentSchema = zod_1.z.object({
    id: zod_1.z.string(),
    caseId: zod_1.z.string(),
    taskId: zod_1.z.string().optional(),
    userId: zod_1.z.string(),
    content: zod_1.z.string(),
    timestamp: zod_1.z.date(),
    edited: zod_1.z.boolean().default(false),
    editedAt: zod_1.z.date().optional(),
    mentions: zod_1.z.array(zod_1.z.string()).default([]),
    attachments: zod_1.z.array(zod_1.z.string()).default([]),
    isInternal: zod_1.z.boolean().default(true),
    metadata: zod_1.z.record(zod_1.z.any()).default({})
});
// Notification Schemas
exports.NotificationSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.enum(['case-created', 'case-updated', 'case-assigned', 'task-assigned', 'evidence-added', 'escalation', 'approval-required', 'deadline-approaching']),
    title: zod_1.z.string(),
    message: zod_1.z.string(),
    recipient: zod_1.z.string(),
    channels: zod_1.z.array(exports.NotificationChannelSchema),
    priority: exports.CasePrioritySchema,
    relatedEntityId: zod_1.z.string(),
    relatedEntityType: zod_1.z.enum(['case', 'task', 'evidence', 'playbook']),
    status: zod_1.z.enum(['pending', 'sent', 'delivered', 'failed']).default('pending'),
    createdAt: zod_1.z.date(),
    sentAt: zod_1.z.date().optional(),
    deliveredAt: zod_1.z.date().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).default({})
});
// Escalation Schemas
exports.EscalationRuleSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    conditions: zod_1.z.object({
        severity: zod_1.z.array(exports.CaseSeveritySchema).optional(),
        priority: zod_1.z.array(exports.CasePrioritySchema).optional(),
        status: zod_1.z.array(exports.CaseStatusSchema).optional(),
        timeElapsed: zod_1.z.number().optional(), // minutes
        noResponse: zod_1.z.boolean().optional(),
        customCondition: zod_1.z.string().optional()
    }),
    actions: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.enum(['assign', 'notify', 'escalate', 'auto-approve']),
        target: zod_1.z.string(),
        config: zod_1.z.record(zod_1.z.any()).default({})
    })),
    enabled: zod_1.z.boolean().default(true),
    order: zod_1.z.number().default(0)
});
// Playbook Schemas
exports.PlaybookConditionSchema = zod_1.z.object({
    field: zod_1.z.string(),
    operator: zod_1.z.enum(['equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'in', 'not_in', 'regex']),
    value: zod_1.z.any()
});
exports.PlaybookActionSchema = zod_1.z.object({
    type: exports.ActionTypeSchema,
    config: zod_1.z.record(zod_1.z.any()).default({}),
    timeout: zod_1.z.number().optional(), // seconds
    retries: zod_1.z.number().default(0),
    continueOnFailure: zod_1.z.boolean().default(false)
});
exports.PlaybookStepSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    type: exports.PlaybookStepTypeSchema,
    action: exports.PlaybookActionSchema,
    condition: exports.PlaybookConditionSchema.optional(),
    onSuccess: zod_1.z.string().optional(), // Next step ID
    onFailure: zod_1.z.string().optional(), // Failure step ID
    timeout: zod_1.z.number().optional(), // minutes
    approvers: zod_1.z.array(zod_1.z.string()).default([]),
    order: zod_1.z.number().default(0),
    parallel: zod_1.z.boolean().default(false),
    enabled: zod_1.z.boolean().default(true)
});
exports.PlaybookSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    version: zod_1.z.string().default('1.0'),
    category: zod_1.z.string().optional(),
    triggerConditions: zod_1.z.object({
        alertType: zod_1.z.string().optional(),
        severity: zod_1.z.array(exports.CaseSeveritySchema).optional(),
        tags: zod_1.z.array(zod_1.z.string()).optional(),
        customCondition: zod_1.z.string().optional(),
        mitreAttackTechniques: zod_1.z.array(zod_1.z.string()).optional()
    }).optional(),
    steps: zod_1.z.array(exports.PlaybookStepSchema),
    approvalRequired: zod_1.z.boolean().default(false),
    approvers: zod_1.z.array(zod_1.z.string()).default([]),
    timeoutMinutes: zod_1.z.number().optional(),
    enabled: zod_1.z.boolean().default(true),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    createdBy: zod_1.z.string(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    lastExecuted: zod_1.z.date().optional(),
    executionCount: zod_1.z.number().default(0),
    successRate: zod_1.z.number().default(0),
    metadata: zod_1.z.record(zod_1.z.any()).default({})
});
// Execution Context Schemas
exports.ExecutionContextSchema = zod_1.z.object({
    executionId: zod_1.z.string(),
    playbookId: zod_1.z.string(),
    caseId: zod_1.z.string().optional(),
    alertId: zod_1.z.string().optional(),
    triggeredBy: zod_1.z.string(),
    triggeredAt: zod_1.z.date(),
    approved: zod_1.z.boolean().default(false),
    approvedBy: zod_1.z.string().optional(),
    approvedAt: zod_1.z.date().optional(),
    variables: zod_1.z.record(zod_1.z.any()).default({}),
    stepResults: zod_1.z.record(zod_1.z.any()).default({}),
    errors: zod_1.z.array(zod_1.z.object({
        stepId: zod_1.z.string(),
        error: zod_1.z.string(),
        timestamp: zod_1.z.date()
    })).default([]),
    metadata: zod_1.z.record(zod_1.z.any()).default({})
});
// Playbook Execution Result Schemas
exports.PlaybookResultSchema = zod_1.z.object({
    executionId: zod_1.z.string(),
    playbookId: zod_1.z.string(),
    status: zod_1.z.enum(['success', 'failure', 'partial', 'pending_approval', 'timeout', 'cancelled']),
    startTime: zod_1.z.date(),
    endTime: zod_1.z.date().optional(),
    duration: zod_1.z.number().optional(), // milliseconds
    stepsExecuted: zod_1.z.number().default(0),
    stepsSucceeded: zod_1.z.number().default(0),
    stepsFailed: zod_1.z.number().default(0),
    stepResults: zod_1.z.record(zod_1.z.any()).default({}),
    errors: zod_1.z.array(zod_1.z.string()).default([]),
    output: zod_1.z.record(zod_1.z.any()).default({}),
    metadata: zod_1.z.record(zod_1.z.any()).default({})
});
// Action Result Schema
exports.ActionResultSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    output: zod_1.z.any().optional(),
    error: zod_1.z.string().optional(),
    duration: zod_1.z.number().optional(), // milliseconds
    metadata: zod_1.z.record(zod_1.z.any()).default({})
});
// Timeline Event Schema
exports.TimelineEventSchema = zod_1.z.object({
    id: zod_1.z.string(),
    caseId: zod_1.z.string(),
    timestamp: zod_1.z.date(),
    event: zod_1.z.string(),
    description: zod_1.z.string(),
    source: zod_1.z.string(),
    sourceType: zod_1.z.enum(['log', 'alert', 'user-action', 'system', 'evidence', 'external']),
    severity: exports.CaseSeveritySchema.optional(),
    userId: zod_1.z.string().optional(),
    automated: zod_1.z.boolean().default(false),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    relatedEntities: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.enum(['user', 'host', 'ip', 'domain', 'file', 'process']),
        value: zod_1.z.string()
    })).default([]),
    attachments: zod_1.z.array(zod_1.z.string()).default([]),
    metadata: zod_1.z.record(zod_1.z.any()).default({})
});
// Integration Schemas
exports.SOARIntegrationSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    type: zod_1.z.enum(['phantom', 'demisto', 'siemplify', 'swimlane', 'custom']),
    endpoint: zod_1.z.string(),
    apiKey: zod_1.z.string(),
    enabled: zod_1.z.boolean().default(true),
    config: zod_1.z.record(zod_1.z.any()).default({}),
    lastSync: zod_1.z.date().optional(),
    syncInterval: zod_1.z.number().default(300) // seconds
});
// Forensic Collection Schema
exports.ForensicCollectionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    caseId: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    target: zod_1.z.object({
        type: zod_1.z.enum(['host', 'network', 'cloud', 'mobile']),
        identifier: zod_1.z.string(),
        location: zod_1.z.string().optional()
    }),
    collectionType: zod_1.z.enum(['live-response', 'disk-image', 'memory-dump', 'network-capture', 'log-collection']),
    status: zod_1.z.enum(['planned', 'in-progress', 'completed', 'failed', 'cancelled']),
    startedAt: zod_1.z.date().optional(),
    completedAt: zod_1.z.date().optional(),
    collectedBy: zod_1.z.string(),
    tools: zod_1.z.array(zod_1.z.string()).default([]),
    artifacts: zod_1.z.array(zod_1.z.string()).default([]),
    chainOfCustody: zod_1.z.array(zod_1.z.object({
        timestamp: zod_1.z.date(),
        action: zod_1.z.string(),
        userId: zod_1.z.string(),
        location: zod_1.z.string(),
        notes: zod_1.z.string().optional()
    })).default([]),
    integrity: zod_1.z.object({
        verified: zod_1.z.boolean().default(false),
        method: zod_1.z.string().optional(),
        hash: zod_1.z.string().optional(),
        signature: zod_1.z.string().optional()
    }).optional(),
    metadata: zod_1.z.record(zod_1.z.any()).default({})
});
// Report Schema
exports.CaseReportSchema = zod_1.z.object({
    id: zod_1.z.string(),
    caseId: zod_1.z.string(),
    title: zod_1.z.string(),
    type: zod_1.z.enum(['incident-summary', 'detailed-analysis', 'executive-summary', 'technical-report', 'lessons-learned']),
    generatedBy: zod_1.z.string(),
    generatedAt: zod_1.z.date(),
    format: zod_1.z.enum(['pdf', 'html', 'markdown', 'json']),
    sections: zod_1.z.array(zod_1.z.object({
        title: zod_1.z.string(),
        content: zod_1.z.string(),
        order: zod_1.z.number()
    })).default([]),
    attachments: zod_1.z.array(zod_1.z.string()).default([]),
    recipients: zod_1.z.array(zod_1.z.string()).default([]),
    confidentiality: zod_1.z.enum(['public', 'internal', 'confidential', 'restricted']).default('internal'),
    metadata: zod_1.z.record(zod_1.z.any()).default({})
});
// Configuration Schemas
exports.IRConfigSchema = zod_1.z.object({
    notifications: zod_1.z.object({
        defaultChannels: zod_1.z.array(exports.NotificationChannelSchema),
        emailConfig: zod_1.z.object({
            smtpHost: zod_1.z.string(),
            smtpPort: zod_1.z.number(),
            username: zod_1.z.string(),
            password: zod_1.z.string(),
            fromAddress: zod_1.z.string()
        }).optional(),
        slackConfig: zod_1.z.object({
            botToken: zod_1.z.string(),
            signingSecret: zod_1.z.string(),
            defaultChannel: zod_1.z.string()
        }).optional(),
        teamsConfig: zod_1.z.object({
            webhookUrl: zod_1.z.string()
        }).optional(),
        smsConfig: zod_1.z.object({
            provider: zod_1.z.enum(['twilio', 'aws-sns']),
            config: zod_1.z.record(zod_1.z.any())
        }).optional()
    }),
    escalation: zod_1.z.object({
        enabled: zod_1.z.boolean().default(true),
        defaultTimeouts: zod_1.z.object({
            low: zod_1.z.number().default(1440), // 24 hours
            medium: zod_1.z.number().default(480), // 8 hours
            high: zod_1.z.number().default(120), // 2 hours
            critical: zod_1.z.number().default(30) // 30 minutes
        })
    }),
    automation: zod_1.z.object({
        autoAssignment: zod_1.z.boolean().default(true),
        autoEscalation: zod_1.z.boolean().default(true),
        autoPlaybooks: zod_1.z.boolean().default(true)
    }),
    forensics: zod_1.z.object({
        storageLocation: zod_1.z.string(),
        encryptionEnabled: zod_1.z.boolean().default(true),
        retentionPeriod: zod_1.z.number().default(2555), // 7 years in days
        compressionEnabled: zod_1.z.boolean().default(true)
    })
});
// Error Types
class IRError extends Error {
    constructor(message, code, context) {
        super(message);
        this.code = code;
        this.context = context;
        this.name = 'IRError';
    }
}
exports.IRError = IRError;
class PlaybookExecutionError extends IRError {
    constructor(message, stepId, executionId, context) {
        super(message, 'PLAYBOOK_EXECUTION_ERROR', context);
        this.stepId = stepId;
        this.executionId = executionId;
        this.name = 'PlaybookExecutionError';
    }
}
exports.PlaybookExecutionError = PlaybookExecutionError;
class EvidenceIntegrityError extends IRError {
    constructor(message, evidenceId, context) {
        super(message, 'EVIDENCE_INTEGRITY_ERROR', context);
        this.evidenceId = evidenceId;
        this.name = 'EvidenceIntegrityError';
    }
}
exports.EvidenceIntegrityError = EvidenceIntegrityError;
