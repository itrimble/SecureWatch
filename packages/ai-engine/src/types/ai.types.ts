import { z } from 'zod';

// MCP Protocol Types
export const MCPResourceSchema = z.object({
  uri: z.string(),
  name: z.string(),
  description: z.string().optional(),
  mimeType: z.string().optional(),
  annotations: z.record(z.any()).optional()
});

export const MCPToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.record(z.any())
});

export const MCPCapabilitiesSchema = z.object({
  resources: z.object({
    subscribe: z.boolean().optional(),
    listChanged: z.boolean().optional()
  }).optional(),
  tools: z.record(z.any()).optional(),
  prompts: z.record(z.any()).optional(),
  logging: z.record(z.any()).optional()
});

export type MCPResource = z.infer<typeof MCPResourceSchema>;
export type MCPTool = z.infer<typeof MCPToolSchema>;
export type MCPCapabilities = z.infer<typeof MCPCapabilitiesSchema>;

// AI Model Types
export const AIModelTypeSchema = z.enum(['local', 'cloud']);
export const AIProviderSchema = z.enum(['ollama', 'lmstudio', 'claude', 'openai', 'custom']);

export const AIModelConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: AIModelTypeSchema,
  provider: AIProviderSchema,
  endpoint: z.string().optional(),
  apiKey: z.string().optional(),
  model: z.string(),
  maxTokens: z.number().default(4096),
  temperature: z.number().min(0).max(2).default(0.7),
  capabilities: z.array(z.enum(['chat', 'completion', 'embedding', 'analysis'])),
  privacyLevel: z.enum(['public', 'restricted', 'private']).default('restricted'),
  costPerToken: z.number().optional(),
  enabled: z.boolean().default(true)
});

export type AIModelType = z.infer<typeof AIModelTypeSchema>;
export type AIProvider = z.infer<typeof AIProviderSchema>;
export type AIModelConfig = z.infer<typeof AIModelConfigSchema>;

// Security Context Types
export const SecurityContextSchema = z.object({
  privacyLevel: z.enum(['public', 'restricted', 'private']),
  classification: z.enum(['unclassified', 'confidential', 'secret']).default('unclassified'),
  dataSources: z.array(z.string()),
  timeRange: z.object({
    start: z.string(),
    end: z.string()
  }),
  userRole: z.string(),
  organizationId: z.string(),
  permissions: z.array(z.string())
});

export type SecurityContext = z.infer<typeof SecurityContextSchema>;

// Query Generation Types
export const QueryTypeSchema = z.enum(['kql', 'sql', 'elasticsearch', 'splunk']);

export const NaturalLanguageQuerySchema = z.object({
  question: z.string(),
  context: SecurityContextSchema,
  queryType: QueryTypeSchema.default('kql'),
  examples: z.array(z.object({
    natural: z.string(),
    query: z.string()
  })).optional(),
  maxComplexity: z.enum(['simple', 'moderate', 'complex']).default('moderate')
});

export const GeneratedQuerySchema = z.object({
  query: z.string(),
  confidence: z.number().min(0).max(1),
  explanation: z.string(),
  estimatedRows: z.number().optional(),
  complexity: z.enum(['simple', 'moderate', 'complex']),
  warnings: z.array(z.string()).optional(),
  suggestions: z.array(z.string()).optional()
});

export type QueryType = z.infer<typeof QueryTypeSchema>;
export type NaturalLanguageQuery = z.infer<typeof NaturalLanguageQuerySchema>;
export type GeneratedQuery = z.infer<typeof GeneratedQuerySchema>;

// Alert Enrichment Types
export const AlertEnrichmentRequestSchema = z.object({
  alertId: z.string(),
  eventData: z.record(z.any()),
  enrichmentTypes: z.array(z.enum([
    'threat-intel', 'geo-location', 'reputation', 'context', 'similar-events', 'mitigation'
  ])),
  maxEnrichmentTime: z.number().default(30000), // 30 seconds
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium')
});

export const EnrichmentResultSchema = z.object({
  type: z.string(),
  confidence: z.number().min(0).max(1),
  data: z.record(z.any()),
  source: z.string(),
  timestamp: z.string(),
  ttl: z.number().optional() // Time to live in seconds
});

export const AlertEnrichmentResponseSchema = z.object({
  alertId: z.string(),
  enrichments: z.array(EnrichmentResultSchema),
  processingTime: z.number(),
  errors: z.array(z.string()).optional()
});

export type AlertEnrichmentRequest = z.infer<typeof AlertEnrichmentRequestSchema>;
export type EnrichmentResult = z.infer<typeof EnrichmentResultSchema>;
export type AlertEnrichmentResponse = z.infer<typeof AlertEnrichmentResponseSchema>;

// Anomaly Detection Types
export const AnomalyDetectionModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['statistical', 'isolation-forest', 'autoencoder', 'time-series']),
  parameters: z.record(z.any()),
  trainingData: z.object({
    source: z.string(),
    timeRange: z.object({
      start: z.string(),
      end: z.string()
    }),
    features: z.array(z.string())
  }),
  threshold: z.number().min(0).max(1).default(0.95),
  lastTrained: z.string(),
  accuracy: z.number().min(0).max(1).optional()
});

export const AnomalyDetectionResultSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  anomalyScore: z.number().min(0).max(1),
  isAnomaly: z.boolean(),
  features: z.record(z.number()),
  explanation: z.string(),
  confidence: z.number().min(0).max(1),
  relatedEvents: z.array(z.string()).optional()
});

export type AnomalyDetectionModel = z.infer<typeof AnomalyDetectionModelSchema>;
export type AnomalyDetectionResult = z.infer<typeof AnomalyDetectionResultSchema>;

// Pattern Recognition Types
export const AttackPatternSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  mitreId: z.string().optional(), // MITRE ATT&CK ID
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  indicators: z.array(z.object({
    type: z.string(),
    value: z.string(),
    weight: z.number().min(0).max(1)
  })),
  sequence: z.array(z.object({
    step: z.number(),
    condition: z.string(),
    timeWindow: z.number().optional()
  })).optional(),
  confidence: z.number().min(0).max(1)
});

export const PatternMatchResultSchema = z.object({
  patternId: z.string(),
  confidence: z.number().min(0).max(1),
  matchedEvents: z.array(z.string()),
  timeline: z.array(z.object({
    timestamp: z.string(),
    eventId: z.string(),
    step: z.number()
  })),
  riskScore: z.number().min(0).max(100),
  recommendations: z.array(z.string())
});

export type AttackPattern = z.infer<typeof AttackPatternSchema>;
export type PatternMatchResult = z.infer<typeof PatternMatchResultSchema>;

// Vector Database Types
export const VectorEmbeddingSchema = z.object({
  id: z.string(),
  vector: z.array(z.number()),
  metadata: z.record(z.any()),
  namespace: z.string().optional(),
  score: z.number().optional() // For search results
});

export const SimilaritySearchRequestSchema = z.object({
  query: z.string().or(z.array(z.number())), // Text query or vector
  namespace: z.string().optional(),
  topK: z.number().default(10),
  includeMetadata: z.boolean().default(true),
  filter: z.record(z.any()).optional(),
  threshold: z.number().min(0).max(1).optional()
});

export type VectorEmbedding = z.infer<typeof VectorEmbeddingSchema>;
export type SimilaritySearchRequest = z.infer<typeof SimilaritySearchRequestSchema>;

// LangChain Integration Types
export const LangChainChainTypeSchema = z.enum([
  'llm', 'conversation', 'retrieval-qa', 'map-reduce', 'stuff', 'refine'
]);

export const ChainConfigSchema = z.object({
  type: LangChainChainTypeSchema,
  model: z.string(),
  prompt: z.string().optional(),
  memory: z.boolean().default(false),
  maxIterations: z.number().default(3),
  temperature: z.number().min(0).max(2).default(0.7),
  callbacks: z.array(z.string()).optional()
});

export type LangChainChainType = z.infer<typeof LangChainChainTypeSchema>;
export type ChainConfig = z.infer<typeof ChainConfigSchema>;

// Model Management Types
export const ModelVersionSchema = z.object({
  version: z.string(),
  timestamp: z.string(),
  config: AIModelConfigSchema,
  performance: z.object({
    accuracy: z.number().min(0).max(1),
    latency: z.number(), // milliseconds
    throughput: z.number(), // requests per second
    errorRate: z.number().min(0).max(1)
  }),
  deploymentStatus: z.enum(['active', 'staging', 'deprecated', 'archived']),
  rollbackTo: z.string().optional()
});

export const ModelDeploymentSchema = z.object({
  id: z.string(),
  modelId: z.string(),
  version: z.string(),
  environment: z.enum(['development', 'staging', 'production']),
  status: z.enum(['deploying', 'active', 'inactive', 'failed']),
  startTime: z.string(),
  endTime: z.string().optional(),
  resources: z.object({
    cpu: z.number(),
    memory: z.number(),
    gpu: z.number().optional()
  }),
  healthCheck: z.object({
    endpoint: z.string(),
    interval: z.number(),
    timeout: z.number()
  })
});

export type ModelVersion = z.infer<typeof ModelVersionSchema>;
export type ModelDeployment = z.infer<typeof ModelDeploymentSchema>;

// AI Response Types
export const AIResponseSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  model: z.string(),
  input: z.string(),
  output: z.string(),
  metadata: z.object({
    tokensUsed: z.number(),
    processingTime: z.number(),
    confidence: z.number().min(0).max(1).optional(),
    cost: z.number().optional()
  }),
  context: SecurityContextSchema.optional()
});

export type AIResponse = z.infer<typeof AIResponseSchema>;

// Error Types
export class AIEngineError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AIEngineError';
  }
}

export class ModelNotFoundError extends AIEngineError {
  constructor(modelId: string) {
    super(`Model not found: ${modelId}`, 'MODEL_NOT_FOUND', { modelId });
  }
}

export class InvalidQueryError extends AIEngineError {
  constructor(query: string, reason: string) {
    super(`Invalid query: ${reason}`, 'INVALID_QUERY', { query, reason });
  }
}

export class AIServiceUnavailableError extends AIEngineError {
  constructor(service: string, details?: string) {
    super(`AI service unavailable: ${service}${details ? ` - ${details}` : ''}`, 'SERVICE_UNAVAILABLE', { service, details });
  }
}