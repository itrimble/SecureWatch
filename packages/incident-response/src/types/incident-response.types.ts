import { z } from 'zod';

// Base Enums and Constants
export const CaseSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export const CaseStatusSchema = z.enum(['open', 'in-progress', 'resolved', 'closed', 'escalated']);
export const CasePrioritySchema = z.enum(['p1', 'p2', 'p3', 'p4']);
export const EvidenceTypeSchema = z.enum(['file', 'log', 'screenshot', 'network-capture', 'memory-dump', 'disk-image', 'registry', 'email', 'document', 'other']);
export const TaskStatusSchema = z.enum(['pending', 'assigned', 'in-progress', 'completed', 'blocked']);
export const NotificationChannelSchema = z.enum(['email', 'sms', 'slack', 'teams', 'webhook', 'pagerduty']);
export const PlaybookStepTypeSchema = z.enum(['manual', 'automated', 'approval', 'decision']);
export const ActionTypeSchema = z.enum(['notification', 'api_call', 'enrichment', 'isolation', 'quarantine', 'block_ip', 'disable_user', 'collect_evidence', 'custom']);

export type CaseSeverity = z.infer<typeof CaseSeveritySchema>;
export type CaseStatus = z.infer<typeof CaseStatusSchema>;
export type CasePriority = z.infer<typeof CasePrioritySchema>;
export type EvidenceType = z.infer<typeof EvidenceTypeSchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;
export type PlaybookStepType = z.infer<typeof PlaybookStepTypeSchema>;
export type ActionType = z.infer<typeof ActionTypeSchema>;

// User and Role Schemas
export const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().email(),
  fullName: z.string(),
  role: z.enum(['analyst', 'senior-analyst', 'manager', 'admin']),
  department: z.string().optional(),
  phone: z.string().optional(),
  timezone: z.string().default('UTC'),
  notificationPreferences: z.object({
    email: z.boolean().default(true),
    sms: z.boolean().default(false),
    slack: z.boolean().default(false),
    teams: z.boolean().default(false)
  }).default({}),
  active: z.boolean().default(true)
});

export type User = z.infer<typeof UserSchema>;

// Case Management Schemas
export const CaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  severity: CaseSeveritySchema,
  priority: CasePrioritySchema,
  status: CaseStatusSchema,
  assignee: z.string().optional(),
  reporter: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  closedAt: z.date().optional(),
  dueDate: z.date().optional(),
  tags: z.array(z.string()).default([]),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  affectedSystems: z.array(z.string()).default([]),
  affectedUsers: z.array(z.string()).default([]),
  sourceAlerts: z.array(z.string()).default([]),
  relatedCases: z.array(z.string()).default([]),
  mitreAttackTechniques: z.array(z.string()).default([]),
  iocs: z.array(z.string()).default([]),
  timeline: z.array(z.object({
    timestamp: z.date(),
    event: z.string(),
    details: z.string(),
    source: z.string(),
    userId: z.string().optional(),
    automated: z.boolean().default(false)
  })).default([]),
  metrics: z.object({
    timeToDetection: z.number().optional(),
    timeToResponse: z.number().optional(),
    timeToContainment: z.number().optional(),
    timeToResolution: z.number().optional(),
    businessImpact: z.string().optional(),
    estimatedLoss: z.number().optional()
  }).default({}),
  metadata: z.record(z.any()).default({})
});

export type Case = z.infer<typeof CaseSchema>;

// Evidence Management Schemas
export const EvidenceSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: EvidenceTypeSchema,
  size: z.number(),
  hash: z.object({
    md5: z.string().optional(),
    sha1: z.string().optional(),
    sha256: z.string(),
    sha512: z.string().optional()
  }),
  source: z.string(),
  collectedBy: z.string(),
  collectedAt: z.date(),
  chainOfCustody: z.array(z.object({
    timestamp: z.date(),
    action: z.enum(['collected', 'transferred', 'analyzed', 'stored', 'deleted']),
    userId: z.string(),
    location: z.string(),
    notes: z.string().optional()
  })).default([]),
  filePath: z.string().optional(),
  originalFilename: z.string().optional(),
  mimeType: z.string().optional(),
  isDeleted: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.any()).default({})
});

export type Evidence = z.infer<typeof EvidenceSchema>;

// Task Management Schemas
export const TaskSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  title: z.string(),
  description: z.string(),
  status: TaskStatusSchema,
  assignee: z.string().optional(),
  assignedBy: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  dueDate: z.date().optional(),
  completedAt: z.date().optional(),
  priority: CasePrioritySchema,
  estimatedHours: z.number().optional(),
  actualHours: z.number().optional(),
  dependencies: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  checklist: z.array(z.object({
    id: z.string(),
    task: z.string(),
    completed: z.boolean().default(false),
    completedAt: z.date().optional(),
    completedBy: z.string().optional()
  })).default([]),
  comments: z.array(z.object({
    id: z.string(),
    userId: z.string(),
    content: z.string(),
    timestamp: z.date(),
    edited: z.boolean().default(false),
    editedAt: z.date().optional()
  })).default([]),
  metadata: z.record(z.any()).default({})
});

export type Task = z.infer<typeof TaskSchema>;

// Communication and Collaboration Schemas
export const CommentSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  taskId: z.string().optional(),
  userId: z.string(),
  content: z.string(),
  timestamp: z.date(),
  edited: z.boolean().default(false),
  editedAt: z.date().optional(),
  mentions: z.array(z.string()).default([]),
  attachments: z.array(z.string()).default([]),
  isInternal: z.boolean().default(true),
  metadata: z.record(z.any()).default({})
});

export type Comment = z.infer<typeof CommentSchema>;

// Notification Schemas
export const NotificationSchema = z.object({
  id: z.string(),
  type: z.enum(['case-created', 'case-updated', 'case-assigned', 'task-assigned', 'evidence-added', 'escalation', 'approval-required', 'deadline-approaching']),
  title: z.string(),
  message: z.string(),
  recipient: z.string(),
  channels: z.array(NotificationChannelSchema),
  priority: CasePrioritySchema,
  relatedEntityId: z.string(),
  relatedEntityType: z.enum(['case', 'task', 'evidence', 'playbook']),
  status: z.enum(['pending', 'sent', 'delivered', 'failed']).default('pending'),
  createdAt: z.date(),
  sentAt: z.date().optional(),
  deliveredAt: z.date().optional(),
  metadata: z.record(z.any()).default({})
});

export type Notification = z.infer<typeof NotificationSchema>;

// Escalation Schemas
export const EscalationRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  conditions: z.object({
    severity: z.array(CaseSeveritySchema).optional(),
    priority: z.array(CasePrioritySchema).optional(),
    status: z.array(CaseStatusSchema).optional(),
    timeElapsed: z.number().optional(), // minutes
    noResponse: z.boolean().optional(),
    customCondition: z.string().optional()
  }),
  actions: z.array(z.object({
    type: z.enum(['assign', 'notify', 'escalate', 'auto-approve']),
    target: z.string(),
    config: z.record(z.any()).default({})
  })),
  enabled: z.boolean().default(true),
  order: z.number().default(0)
});

export type EscalationRule = z.infer<typeof EscalationRuleSchema>;

// Playbook Schemas
export const PlaybookConditionSchema = z.object({
  field: z.string(),
  operator: z.enum(['equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'in', 'not_in', 'regex']),
  value: z.any()
});

export const PlaybookActionSchema = z.object({
  type: ActionTypeSchema,
  config: z.record(z.any()).default({}),
  timeout: z.number().optional(), // seconds
  retries: z.number().default(0),
  continueOnFailure: z.boolean().default(false)
});

export const PlaybookStepSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: PlaybookStepTypeSchema,
  action: PlaybookActionSchema,
  condition: PlaybookConditionSchema.optional(),
  onSuccess: z.string().optional(), // Next step ID
  onFailure: z.string().optional(), // Failure step ID
  timeout: z.number().optional(), // minutes
  approvers: z.array(z.string()).default([]),
  order: z.number().default(0),
  parallel: z.boolean().default(false),
  enabled: z.boolean().default(true)
});

export const PlaybookSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  version: z.string().default('1.0'),
  category: z.string().optional(),
  triggerConditions: z.object({
    alertType: z.string().optional(),
    severity: z.array(CaseSeveritySchema).optional(),
    tags: z.array(z.string()).optional(),
    customCondition: z.string().optional(),
    mitreAttackTechniques: z.array(z.string()).optional()
  }).optional(),
  steps: z.array(PlaybookStepSchema),
  approvalRequired: z.boolean().default(false),
  approvers: z.array(z.string()).default([]),
  timeoutMinutes: z.number().optional(),
  enabled: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
  createdBy: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastExecuted: z.date().optional(),
  executionCount: z.number().default(0),
  successRate: z.number().default(0),
  metadata: z.record(z.any()).default({})
});

export type Playbook = z.infer<typeof PlaybookSchema>;
export type PlaybookStep = z.infer<typeof PlaybookStepSchema>;
export type PlaybookAction = z.infer<typeof PlaybookActionSchema>;
export type PlaybookCondition = z.infer<typeof PlaybookConditionSchema>;

// Execution Context Schemas
export const ExecutionContextSchema = z.object({
  executionId: z.string(),
  playbookId: z.string(),
  caseId: z.string().optional(),
  alertId: z.string().optional(),
  triggeredBy: z.string(),
  triggeredAt: z.date(),
  approved: z.boolean().default(false),
  approvedBy: z.string().optional(),
  approvedAt: z.date().optional(),
  variables: z.record(z.any()).default({}),
  stepResults: z.record(z.any()).default({}),
  errors: z.array(z.object({
    stepId: z.string(),
    error: z.string(),
    timestamp: z.date()
  })).default([]),
  metadata: z.record(z.any()).default({})
});

export type ExecutionContext = z.infer<typeof ExecutionContextSchema>;

// Playbook Execution Result Schemas
export const PlaybookResultSchema = z.object({
  executionId: z.string(),
  playbookId: z.string(),
  status: z.enum(['success', 'failure', 'partial', 'pending_approval', 'timeout', 'cancelled']),
  startTime: z.date(),
  endTime: z.date().optional(),
  duration: z.number().optional(), // milliseconds
  stepsExecuted: z.number().default(0),
  stepsSucceeded: z.number().default(0),
  stepsFailed: z.number().default(0),
  stepResults: z.record(z.any()).default({}),
  errors: z.array(z.string()).default([]),
  output: z.record(z.any()).default({}),
  metadata: z.record(z.any()).default({})
});

export type PlaybookResult = z.infer<typeof PlaybookResultSchema>;

// Action Result Schema
export const ActionResultSchema = z.object({
  success: z.boolean(),
  output: z.any().optional(),
  error: z.string().optional(),
  duration: z.number().optional(), // milliseconds
  metadata: z.record(z.any()).default({})
});

export type ActionResult = z.infer<typeof ActionResultSchema>;

// Timeline Event Schema
export const TimelineEventSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  timestamp: z.date(),
  event: z.string(),
  description: z.string(),
  source: z.string(),
  sourceType: z.enum(['log', 'alert', 'user-action', 'system', 'evidence', 'external']),
  severity: CaseSeveritySchema.optional(),
  userId: z.string().optional(),
  automated: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  relatedEntities: z.array(z.object({
    type: z.enum(['user', 'host', 'ip', 'domain', 'file', 'process']),
    value: z.string()
  })).default([]),
  attachments: z.array(z.string()).default([]),
  metadata: z.record(z.any()).default({})
});

export type TimelineEvent = z.infer<typeof TimelineEventSchema>;

// Integration Schemas
export const SOARIntegrationSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['phantom', 'demisto', 'siemplify', 'swimlane', 'custom']),
  endpoint: z.string(),
  apiKey: z.string(),
  enabled: z.boolean().default(true),
  config: z.record(z.any()).default({}),
  lastSync: z.date().optional(),
  syncInterval: z.number().default(300) // seconds
});

export type SOARIntegration = z.infer<typeof SOARIntegrationSchema>;

// Forensic Collection Schema
export const ForensicCollectionSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  name: z.string(),
  description: z.string(),
  target: z.object({
    type: z.enum(['host', 'network', 'cloud', 'mobile']),
    identifier: z.string(),
    location: z.string().optional()
  }),
  collectionType: z.enum(['live-response', 'disk-image', 'memory-dump', 'network-capture', 'log-collection']),
  status: z.enum(['planned', 'in-progress', 'completed', 'failed', 'cancelled']),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  collectedBy: z.string(),
  tools: z.array(z.string()).default([]),
  artifacts: z.array(z.string()).default([]),
  chainOfCustody: z.array(z.object({
    timestamp: z.date(),
    action: z.string(),
    userId: z.string(),
    location: z.string(),
    notes: z.string().optional()
  })).default([]),
  integrity: z.object({
    verified: z.boolean().default(false),
    method: z.string().optional(),
    hash: z.string().optional(),
    signature: z.string().optional()
  }).optional(),
  metadata: z.record(z.any()).default({})
});

export type ForensicCollection = z.infer<typeof ForensicCollectionSchema>;

// Report Schema
export const CaseReportSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  title: z.string(),
  type: z.enum(['incident-summary', 'detailed-analysis', 'executive-summary', 'technical-report', 'lessons-learned']),
  generatedBy: z.string(),
  generatedAt: z.date(),
  format: z.enum(['pdf', 'html', 'markdown', 'json']),
  sections: z.array(z.object({
    title: z.string(),
    content: z.string(),
    order: z.number()
  })).default([]),
  attachments: z.array(z.string()).default([]),
  recipients: z.array(z.string()).default([]),
  confidentiality: z.enum(['public', 'internal', 'confidential', 'restricted']).default('internal'),
  metadata: z.record(z.any()).default({})
});

export type CaseReport = z.infer<typeof CaseReportSchema>;

// Configuration Schemas
export const IRConfigSchema = z.object({
  notifications: z.object({
    defaultChannels: z.array(NotificationChannelSchema),
    emailConfig: z.object({
      smtpHost: z.string(),
      smtpPort: z.number(),
      username: z.string(),
      password: z.string(),
      fromAddress: z.string()
    }).optional(),
    slackConfig: z.object({
      botToken: z.string(),
      signingSecret: z.string(),
      defaultChannel: z.string()
    }).optional(),
    teamsConfig: z.object({
      webhookUrl: z.string()
    }).optional(),
    smsConfig: z.object({
      provider: z.enum(['twilio', 'aws-sns']),
      config: z.record(z.any())
    }).optional()
  }),
  escalation: z.object({
    enabled: z.boolean().default(true),
    defaultTimeouts: z.object({
      low: z.number().default(1440), // 24 hours
      medium: z.number().default(480), // 8 hours
      high: z.number().default(120), // 2 hours
      critical: z.number().default(30) // 30 minutes
    })
  }),
  automation: z.object({
    autoAssignment: z.boolean().default(true),
    autoEscalation: z.boolean().default(true),
    autoPlaybooks: z.boolean().default(true)
  }),
  forensics: z.object({
    storageLocation: z.string(),
    encryptionEnabled: z.boolean().default(true),
    retentionPeriod: z.number().default(2555), // 7 years in days
    compressionEnabled: z.boolean().default(true)
  })
});

export type IRConfig = z.infer<typeof IRConfigSchema>;

// Database Configuration
export interface DatabaseConfig {
  type: 'sqlite' | 'postgres' | 'mysql';
  connection: any;
}

// Event Types
export interface CaseEvent {
  type: 'case-created' | 'case-updated' | 'case-assigned' | 'case-closed' | 'evidence-added' | 'task-completed';
  caseId: string;
  data: any;
  timestamp: Date;
  userId?: string;
}

export interface PlaybookEvent {
  type: 'playbook-started' | 'playbook-completed' | 'playbook-failed' | 'step-completed' | 'approval-required';
  executionId: string;
  playbookId: string;
  data: any;
  timestamp: Date;
}

// Error Types
export class IRError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: any
  ) {
    super(message);
    this.name = 'IRError';
  }
}

export class PlaybookExecutionError extends IRError {
  constructor(
    message: string,
    public stepId: string,
    public executionId: string,
    context?: any
  ) {
    super(message, 'PLAYBOOK_EXECUTION_ERROR', context);
    this.name = 'PlaybookExecutionError';
  }
}

export class EvidenceIntegrityError extends IRError {
  constructor(
    message: string,
    public evidenceId: string,
    context?: any
  ) {
    super(message, 'EVIDENCE_INTEGRITY_ERROR', context);
    this.name = 'EvidenceIntegrityError';
  }
}