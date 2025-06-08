"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIServiceUnavailableError = exports.InvalidQueryError = exports.ModelNotFoundError = exports.AIEngineError = exports.AIResponseSchema = exports.ModelDeploymentSchema = exports.ModelVersionSchema = exports.ChainConfigSchema = exports.LangChainChainTypeSchema = exports.SimilaritySearchRequestSchema = exports.VectorEmbeddingSchema = exports.PatternMatchResultSchema = exports.AttackPatternSchema = exports.AnomalyDetectionResultSchema = exports.AnomalyDetectionModelSchema = exports.AlertEnrichmentResponseSchema = exports.EnrichmentResultSchema = exports.AlertEnrichmentRequestSchema = exports.GeneratedQuerySchema = exports.NaturalLanguageQuerySchema = exports.QueryTypeSchema = exports.SecurityContextSchema = exports.AIModelConfigSchema = exports.AIProviderSchema = exports.AIModelTypeSchema = exports.MCPCapabilitiesSchema = exports.MCPToolSchema = exports.MCPResourceSchema = void 0;
const zod_1 = require("zod");
// MCP Protocol Types
exports.MCPResourceSchema = zod_1.z.object({
    uri: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    mimeType: zod_1.z.string().optional(),
    annotations: zod_1.z.record(zod_1.z.any()).optional()
});
exports.MCPToolSchema = zod_1.z.object({
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    inputSchema: zod_1.z.record(zod_1.z.any())
});
exports.MCPCapabilitiesSchema = zod_1.z.object({
    resources: zod_1.z.object({
        subscribe: zod_1.z.boolean().optional(),
        listChanged: zod_1.z.boolean().optional()
    }).optional(),
    tools: zod_1.z.record(zod_1.z.any()).optional(),
    prompts: zod_1.z.record(zod_1.z.any()).optional(),
    logging: zod_1.z.record(zod_1.z.any()).optional()
});
// AI Model Types
exports.AIModelTypeSchema = zod_1.z.enum(['local', 'cloud']);
exports.AIProviderSchema = zod_1.z.enum(['ollama', 'lmstudio', 'claude', 'openai', 'custom']);
exports.AIModelConfigSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    type: exports.AIModelTypeSchema,
    provider: exports.AIProviderSchema,
    endpoint: zod_1.z.string().optional(),
    apiKey: zod_1.z.string().optional(),
    model: zod_1.z.string(),
    maxTokens: zod_1.z.number().default(4096),
    temperature: zod_1.z.number().min(0).max(2).default(0.7),
    capabilities: zod_1.z.array(zod_1.z.enum(['chat', 'completion', 'embedding', 'analysis'])),
    privacyLevel: zod_1.z.enum(['public', 'restricted', 'private']).default('restricted'),
    costPerToken: zod_1.z.number().optional(),
    enabled: zod_1.z.boolean().default(true)
});
// Security Context Types
exports.SecurityContextSchema = zod_1.z.object({
    privacyLevel: zod_1.z.enum(['public', 'restricted', 'private']),
    classification: zod_1.z.enum(['unclassified', 'confidential', 'secret']).default('unclassified'),
    dataSources: zod_1.z.array(zod_1.z.string()),
    timeRange: zod_1.z.object({
        start: zod_1.z.string(),
        end: zod_1.z.string()
    }),
    userRole: zod_1.z.string(),
    organizationId: zod_1.z.string(),
    permissions: zod_1.z.array(zod_1.z.string())
});
// Query Generation Types
exports.QueryTypeSchema = zod_1.z.enum(['kql', 'sql', 'elasticsearch', 'splunk']);
exports.NaturalLanguageQuerySchema = zod_1.z.object({
    question: zod_1.z.string(),
    context: exports.SecurityContextSchema,
    queryType: exports.QueryTypeSchema.default('kql'),
    examples: zod_1.z.array(zod_1.z.object({
        natural: zod_1.z.string(),
        query: zod_1.z.string()
    })).optional(),
    maxComplexity: zod_1.z.enum(['simple', 'moderate', 'complex']).default('moderate')
});
exports.GeneratedQuerySchema = zod_1.z.object({
    query: zod_1.z.string(),
    confidence: zod_1.z.number().min(0).max(1),
    explanation: zod_1.z.string(),
    estimatedRows: zod_1.z.number().optional(),
    complexity: zod_1.z.enum(['simple', 'moderate', 'complex']),
    warnings: zod_1.z.array(zod_1.z.string()).optional(),
    suggestions: zod_1.z.array(zod_1.z.string()).optional()
});
// Alert Enrichment Types
exports.AlertEnrichmentRequestSchema = zod_1.z.object({
    alertId: zod_1.z.string(),
    eventData: zod_1.z.record(zod_1.z.any()),
    enrichmentTypes: zod_1.z.array(zod_1.z.enum([
        'threat-intel', 'geo-location', 'reputation', 'context', 'similar-events', 'mitigation'
    ])),
    maxEnrichmentTime: zod_1.z.number().default(30000), // 30 seconds
    priority: zod_1.z.enum(['low', 'medium', 'high', 'critical']).default('medium')
});
exports.EnrichmentResultSchema = zod_1.z.object({
    type: zod_1.z.string(),
    confidence: zod_1.z.number().min(0).max(1),
    data: zod_1.z.record(zod_1.z.any()),
    source: zod_1.z.string(),
    timestamp: zod_1.z.string(),
    ttl: zod_1.z.number().optional() // Time to live in seconds
});
exports.AlertEnrichmentResponseSchema = zod_1.z.object({
    alertId: zod_1.z.string(),
    enrichments: zod_1.z.array(exports.EnrichmentResultSchema),
    processingTime: zod_1.z.number(),
    errors: zod_1.z.array(zod_1.z.string()).optional()
});
// Anomaly Detection Types
exports.AnomalyDetectionModelSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    type: zod_1.z.enum(['statistical', 'isolation-forest', 'autoencoder', 'time-series']),
    parameters: zod_1.z.record(zod_1.z.any()),
    trainingData: zod_1.z.object({
        source: zod_1.z.string(),
        timeRange: zod_1.z.object({
            start: zod_1.z.string(),
            end: zod_1.z.string()
        }),
        features: zod_1.z.array(zod_1.z.string())
    }),
    threshold: zod_1.z.number().min(0).max(1).default(0.95),
    lastTrained: zod_1.z.string(),
    accuracy: zod_1.z.number().min(0).max(1).optional()
});
exports.AnomalyDetectionResultSchema = zod_1.z.object({
    id: zod_1.z.string(),
    timestamp: zod_1.z.string(),
    anomalyScore: zod_1.z.number().min(0).max(1),
    isAnomaly: zod_1.z.boolean(),
    features: zod_1.z.record(zod_1.z.number()),
    explanation: zod_1.z.string(),
    confidence: zod_1.z.number().min(0).max(1),
    relatedEvents: zod_1.z.array(zod_1.z.string()).optional()
});
// Pattern Recognition Types
exports.AttackPatternSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    mitreId: zod_1.z.string().optional(), // MITRE ATT&CK ID
    severity: zod_1.z.enum(['low', 'medium', 'high', 'critical']),
    indicators: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.string(),
        value: zod_1.z.string(),
        weight: zod_1.z.number().min(0).max(1)
    })),
    sequence: zod_1.z.array(zod_1.z.object({
        step: zod_1.z.number(),
        condition: zod_1.z.string(),
        timeWindow: zod_1.z.number().optional()
    })).optional(),
    confidence: zod_1.z.number().min(0).max(1)
});
exports.PatternMatchResultSchema = zod_1.z.object({
    patternId: zod_1.z.string(),
    confidence: zod_1.z.number().min(0).max(1),
    matchedEvents: zod_1.z.array(zod_1.z.string()),
    timeline: zod_1.z.array(zod_1.z.object({
        timestamp: zod_1.z.string(),
        eventId: zod_1.z.string(),
        step: zod_1.z.number()
    })),
    riskScore: zod_1.z.number().min(0).max(100),
    recommendations: zod_1.z.array(zod_1.z.string())
});
// Vector Database Types
exports.VectorEmbeddingSchema = zod_1.z.object({
    id: zod_1.z.string(),
    vector: zod_1.z.array(zod_1.z.number()),
    metadata: zod_1.z.record(zod_1.z.any()),
    namespace: zod_1.z.string().optional(),
    score: zod_1.z.number().optional() // For search results
});
exports.SimilaritySearchRequestSchema = zod_1.z.object({
    query: zod_1.z.string().or(zod_1.z.array(zod_1.z.number())), // Text query or vector
    namespace: zod_1.z.string().optional(),
    topK: zod_1.z.number().default(10),
    includeMetadata: zod_1.z.boolean().default(true),
    filter: zod_1.z.record(zod_1.z.any()).optional(),
    threshold: zod_1.z.number().min(0).max(1).optional()
});
// LangChain Integration Types
exports.LangChainChainTypeSchema = zod_1.z.enum([
    'llm', 'conversation', 'retrieval-qa', 'map-reduce', 'stuff', 'refine'
]);
exports.ChainConfigSchema = zod_1.z.object({
    type: exports.LangChainChainTypeSchema,
    model: zod_1.z.string(),
    prompt: zod_1.z.string().optional(),
    memory: zod_1.z.boolean().default(false),
    maxIterations: zod_1.z.number().default(3),
    temperature: zod_1.z.number().min(0).max(2).default(0.7),
    callbacks: zod_1.z.array(zod_1.z.string()).optional()
});
// Model Management Types
exports.ModelVersionSchema = zod_1.z.object({
    version: zod_1.z.string(),
    timestamp: zod_1.z.string(),
    config: exports.AIModelConfigSchema,
    performance: zod_1.z.object({
        accuracy: zod_1.z.number().min(0).max(1),
        latency: zod_1.z.number(), // milliseconds
        throughput: zod_1.z.number(), // requests per second
        errorRate: zod_1.z.number().min(0).max(1)
    }),
    deploymentStatus: zod_1.z.enum(['active', 'staging', 'deprecated', 'archived']),
    rollbackTo: zod_1.z.string().optional()
});
exports.ModelDeploymentSchema = zod_1.z.object({
    id: zod_1.z.string(),
    modelId: zod_1.z.string(),
    version: zod_1.z.string(),
    environment: zod_1.z.enum(['development', 'staging', 'production']),
    status: zod_1.z.enum(['deploying', 'active', 'inactive', 'failed']),
    startTime: zod_1.z.string(),
    endTime: zod_1.z.string().optional(),
    resources: zod_1.z.object({
        cpu: zod_1.z.number(),
        memory: zod_1.z.number(),
        gpu: zod_1.z.number().optional()
    }),
    healthCheck: zod_1.z.object({
        endpoint: zod_1.z.string(),
        interval: zod_1.z.number(),
        timeout: zod_1.z.number()
    })
});
// AI Response Types
exports.AIResponseSchema = zod_1.z.object({
    id: zod_1.z.string(),
    timestamp: zod_1.z.string(),
    model: zod_1.z.string(),
    input: zod_1.z.string(),
    output: zod_1.z.string(),
    metadata: zod_1.z.object({
        tokensUsed: zod_1.z.number(),
        processingTime: zod_1.z.number(),
        confidence: zod_1.z.number().min(0).max(1).optional(),
        cost: zod_1.z.number().optional()
    }),
    context: exports.SecurityContextSchema.optional()
});
// Error Types
class AIEngineError extends Error {
    constructor(message, code, context) {
        super(message);
        this.code = code;
        this.context = context;
        this.name = 'AIEngineError';
    }
}
exports.AIEngineError = AIEngineError;
class ModelNotFoundError extends AIEngineError {
    constructor(modelId) {
        super(`Model not found: ${modelId}`, 'MODEL_NOT_FOUND', { modelId });
    }
}
exports.ModelNotFoundError = ModelNotFoundError;
class InvalidQueryError extends AIEngineError {
    constructor(query, reason) {
        super(`Invalid query: ${reason}`, 'INVALID_QUERY', { query, reason });
    }
}
exports.InvalidQueryError = InvalidQueryError;
class AIServiceUnavailableError extends AIEngineError {
    constructor(service, details) {
        super(`AI service unavailable: ${service}${details ? ` - ${details}` : ''}`, 'SERVICE_UNAVAILABLE', { service, details });
    }
}
exports.AIServiceUnavailableError = AIServiceUnavailableError;
//# sourceMappingURL=ai.types.js.map