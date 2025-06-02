import { z } from 'zod';

// Indicator of Compromise (IOC) Types
export const IOCTypeSchema = z.enum([
  'ip',
  'domain',
  'url',
  'email',
  'hash-md5',
  'hash-sha1',
  'hash-sha256',
  'hash-sha512',
  'cve',
  'file-path',
  'registry-key',
  'mutex',
  'process-name',
  'user-agent',
  'bitcoin-address',
  'mac-address',
  'asn',
  'cidr',
  'port',
  'certificate'
]);

export const IOCSchema = z.object({
  id: z.string(),
  type: IOCTypeSchema,
  value: z.string(),
  source: z.string(),
  confidence: z.number().min(0).max(100),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  tags: z.array(z.string()).default([]),
  firstSeen: z.date(),
  lastSeen: z.date(),
  expiresAt: z.date().optional(),
  metadata: z.record(z.any()).default({}),
  relatedIOCs: z.array(z.string()).default([]),
  tlp: z.enum(['white', 'green', 'amber', 'red']).default('amber'),
  active: z.boolean().default(true)
});

// Threat Actor Types
export const ThreatActorSchema = z.object({
  id: z.string(),
  name: z.string(),
  aliases: z.array(z.string()).default([]),
  description: z.string().optional(),
  motivation: z.array(z.enum(['financial', 'espionage', 'hacktivism', 'destruction', 'unknown'])),
  sophistication: z.enum(['none', 'minimal', 'intermediate', 'advanced', 'strategic']),
  active: z.boolean(),
  firstSeen: z.date(),
  lastSeen: z.date(),
  origin: z.string().optional(),
  targetedCountries: z.array(z.string()).default([]),
  targetedSectors: z.array(z.string()).default([]),
  ttps: z.array(z.string()).default([]), // MITRE ATT&CK IDs
  associatedMalware: z.array(z.string()).default([]),
  associatedTools: z.array(z.string()).default([]),
  iocs: z.array(z.string()).default([])
});

// TTP (Tactics, Techniques, and Procedures)
export const TTPSchema = z.object({
  id: z.string(),
  mitreId: z.string(),
  name: z.string(),
  description: z.string(),
  tactic: z.string(),
  platforms: z.array(z.string()),
  dataSource: z.array(z.string()),
  detection: z.string().optional(),
  mitigation: z.string().optional(),
  subtechniques: z.array(z.string()).default([]),
  references: z.array(z.string()).default([])
});

// Threat Intelligence Feed Configuration
export const ThreatFeedConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['misp', 'virustotal', 'shodan', 'otx', 'abuse-ipdb', 'custom']),
  enabled: z.boolean().default(true),
  endpoint: z.string().url(),
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
  pollInterval: z.number().default(3600000), // 1 hour
  timeout: z.number().default(30000),
  proxy: z.string().optional(),
  tlsVerify: z.boolean().default(true),
  rateLimit: z.object({
    requests: z.number(),
    period: z.number() // in milliseconds
  }).optional(),
  filters: z.object({
    types: z.array(IOCTypeSchema).optional(),
    tags: z.array(z.string()).optional(),
    confidence: z.number().min(0).max(100).optional(),
    age: z.number().optional() // max age in days
  }).optional()
});

// SIGMA Rule Schema
export const SigmaRuleSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.enum(['experimental', 'test', 'stable']),
  author: z.string(),
  references: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  logsource: z.object({
    category: z.string().optional(),
    product: z.string().optional(),
    service: z.string().optional(),
    definition: z.string().optional()
  }),
  detection: z.object({
    selection: z.record(z.any()),
    filter: z.record(z.any()).optional(),
    condition: z.string(),
    timeframe: z.string().optional()
  }),
  falsepositives: z.array(z.string()).optional(),
  level: z.enum(['informational', 'low', 'medium', 'high', 'critical']),
  fields: z.array(z.string()).optional()
});

// UEBA Types
export const EntityTypeSchema = z.enum(['user', 'host', 'application', 'network']);

export const EntityBehaviorSchema = z.object({
  entityId: z.string(),
  entityType: EntityTypeSchema,
  metric: z.string(),
  value: z.number(),
  timestamp: z.date(),
  baseline: z.number().optional(),
  deviation: z.number().optional(),
  anomalyScore: z.number().min(0).max(100).optional()
});

export const UserBehaviorProfileSchema = z.object({
  userId: z.string(),
  normalWorkingHours: z.array(z.object({
    dayOfWeek: z.number().min(0).max(6),
    startHour: z.number().min(0).max(23),
    endHour: z.number().min(0).max(23)
  })),
  typicalLocations: z.array(z.string()),
  commonApplications: z.array(z.string()),
  averageDataTransfer: z.number(),
  peerGroup: z.array(z.string()),
  riskScore: z.number().min(0).max(100),
  lastUpdated: z.date()
});

// Correlation Rule
export const CorrelationRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  enabled: z.boolean().default(true),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(['equals', 'contains', 'regex', 'gt', 'lt', 'gte', 'lte', 'exists']),
    value: z.any(),
    timeWindow: z.number().optional() // in milliseconds
  })),
  correlationFields: z.array(z.string()),
  timeWindow: z.number(), // correlation window in milliseconds
  threshold: z.number().min(1),
  action: z.enum(['alert', 'enrich', 'block', 'isolate', 'custom']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  tags: z.array(z.string()).default([])
});

// Threat Hunt
export const ThreatHuntSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  hypothesis: z.string(),
  status: z.enum(['planned', 'active', 'paused', 'completed', 'archived']),
  assignee: z.string(),
  createdAt: z.date(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  techniques: z.array(z.string()), // MITRE ATT&CK IDs
  dataSource: z.array(z.string()),
  queries: z.array(z.object({
    name: z.string(),
    query: z.string(),
    type: z.enum(['kql', 'sql', 'custom'])
  })),
  findings: z.array(z.object({
    timestamp: z.date(),
    description: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    evidence: z.array(z.string()),
    iocs: z.array(z.string())
  })).default([]),
  metrics: z.object({
    eventsAnalyzed: z.number().default(0),
    alertsGenerated: z.number().default(0),
    falsePositives: z.number().default(0),
    truePositives: z.number().default(0)
  }).default({
    eventsAnalyzed: 0,
    alertsGenerated: 0,
    falsePositives: 0,
    truePositives: 0
  })
});

// Threat Intelligence Report
export const ThreatReportSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  type: z.enum(['campaign', 'actor', 'malware', 'vulnerability', 'incident']),
  tlp: z.enum(['white', 'green', 'amber', 'red']),
  publishedDate: z.date(),
  lastUpdated: z.date(),
  author: z.string(),
  tags: z.array(z.string()).default([]),
  relatedActors: z.array(z.string()).default([]),
  relatedMalware: z.array(z.string()).default([]),
  indicators: z.array(z.string()).default([]),
  ttps: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  references: z.array(z.object({
    title: z.string(),
    url: z.string().url()
  })).default([])
});

// API Response Types
export const ThreatIntelResponseSchema = z.object({
  data: z.any(),
  source: z.string(),
  timestamp: z.date(),
  nextUpdate: z.date().optional(),
  metadata: z.record(z.any()).optional()
});

// Detection Alert
export const DetectionAlertSchema = z.object({
  id: z.string(),
  ruleId: z.string(),
  ruleName: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  confidence: z.number().min(0).max(100),
  timestamp: z.date(),
  source: z.object({
    ip: z.string().optional(),
    hostname: z.string().optional(),
    user: z.string().optional(),
    process: z.string().optional()
  }),
  destination: z.object({
    ip: z.string().optional(),
    hostname: z.string().optional(),
    port: z.number().optional()
  }).optional(),
  indicators: z.array(IOCSchema).default([]),
  context: z.record(z.any()).default({}),
  mitreAttack: z.array(z.object({
    technique: z.string(),
    tactic: z.string()
  })).default([]),
  enrichment: z.record(z.any()).default({}),
  status: z.enum(['new', 'investigating', 'resolved', 'false-positive']).default('new')
});

// Type exports
export type IOCType = z.infer<typeof IOCTypeSchema>;
export type IOC = z.infer<typeof IOCSchema>;
export type ThreatActor = z.infer<typeof ThreatActorSchema>;
export type TTP = z.infer<typeof TTPSchema>;
export type ThreatFeedConfig = z.infer<typeof ThreatFeedConfigSchema>;
export type SigmaRule = z.infer<typeof SigmaRuleSchema>;
export type EntityType = z.infer<typeof EntityTypeSchema>;
export type EntityBehavior = z.infer<typeof EntityBehaviorSchema>;
export type UserBehaviorProfile = z.infer<typeof UserBehaviorProfileSchema>;
export type CorrelationRule = z.infer<typeof CorrelationRuleSchema>;
export type ThreatHunt = z.infer<typeof ThreatHuntSchema>;
export type ThreatReport = z.infer<typeof ThreatReportSchema>;
export type ThreatIntelResponse = z.infer<typeof ThreatIntelResponseSchema>;
export type DetectionAlert = z.infer<typeof DetectionAlertSchema>;

// Error types
export class ThreatIntelError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'ThreatIntelError';
  }
}