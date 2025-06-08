import { z } from 'zod';
export declare const MCPResourceSchema: z.ZodObject<{
    uri: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    mimeType: z.ZodOptional<z.ZodString>;
    annotations: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    uri: string;
    name: string;
    description?: string | undefined;
    mimeType?: string | undefined;
    annotations?: Record<string, any> | undefined;
}, {
    uri: string;
    name: string;
    description?: string | undefined;
    mimeType?: string | undefined;
    annotations?: Record<string, any> | undefined;
}>;
export declare const MCPToolSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    inputSchema: z.ZodRecord<z.ZodString, z.ZodAny>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description: string;
    inputSchema: Record<string, any>;
}, {
    name: string;
    description: string;
    inputSchema: Record<string, any>;
}>;
export declare const MCPCapabilitiesSchema: z.ZodObject<{
    resources: z.ZodOptional<z.ZodObject<{
        subscribe: z.ZodOptional<z.ZodBoolean>;
        listChanged: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        subscribe?: boolean | undefined;
        listChanged?: boolean | undefined;
    }, {
        subscribe?: boolean | undefined;
        listChanged?: boolean | undefined;
    }>>;
    tools: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    prompts: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    logging: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    resources?: {
        subscribe?: boolean | undefined;
        listChanged?: boolean | undefined;
    } | undefined;
    tools?: Record<string, any> | undefined;
    prompts?: Record<string, any> | undefined;
    logging?: Record<string, any> | undefined;
}, {
    resources?: {
        subscribe?: boolean | undefined;
        listChanged?: boolean | undefined;
    } | undefined;
    tools?: Record<string, any> | undefined;
    prompts?: Record<string, any> | undefined;
    logging?: Record<string, any> | undefined;
}>;
export type MCPResource = z.infer<typeof MCPResourceSchema>;
export type MCPTool = z.infer<typeof MCPToolSchema>;
export type MCPCapabilities = z.infer<typeof MCPCapabilitiesSchema>;
export declare const AIModelTypeSchema: z.ZodEnum<["local", "cloud"]>;
export declare const AIProviderSchema: z.ZodEnum<["ollama", "lmstudio", "claude", "openai", "custom"]>;
export declare const AIModelConfigSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    type: z.ZodEnum<["local", "cloud"]>;
    provider: z.ZodEnum<["ollama", "lmstudio", "claude", "openai", "custom"]>;
    endpoint: z.ZodOptional<z.ZodString>;
    apiKey: z.ZodOptional<z.ZodString>;
    model: z.ZodString;
    maxTokens: z.ZodDefault<z.ZodNumber>;
    temperature: z.ZodDefault<z.ZodNumber>;
    capabilities: z.ZodArray<z.ZodEnum<["chat", "completion", "embedding", "analysis"]>, "many">;
    privacyLevel: z.ZodDefault<z.ZodEnum<["public", "restricted", "private"]>>;
    costPerToken: z.ZodOptional<z.ZodNumber>;
    enabled: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    type: "local" | "cloud";
    id: string;
    provider: "custom" | "ollama" | "lmstudio" | "claude" | "openai";
    model: string;
    maxTokens: number;
    temperature: number;
    capabilities: ("chat" | "completion" | "embedding" | "analysis")[];
    privacyLevel: "public" | "restricted" | "private";
    enabled: boolean;
    endpoint?: string | undefined;
    apiKey?: string | undefined;
    costPerToken?: number | undefined;
}, {
    name: string;
    type: "local" | "cloud";
    id: string;
    provider: "custom" | "ollama" | "lmstudio" | "claude" | "openai";
    model: string;
    capabilities: ("chat" | "completion" | "embedding" | "analysis")[];
    endpoint?: string | undefined;
    apiKey?: string | undefined;
    maxTokens?: number | undefined;
    temperature?: number | undefined;
    privacyLevel?: "public" | "restricted" | "private" | undefined;
    costPerToken?: number | undefined;
    enabled?: boolean | undefined;
}>;
export type AIModelType = z.infer<typeof AIModelTypeSchema>;
export type AIProvider = z.infer<typeof AIProviderSchema>;
export type AIModelConfig = z.infer<typeof AIModelConfigSchema>;
export declare const SecurityContextSchema: z.ZodObject<{
    privacyLevel: z.ZodEnum<["public", "restricted", "private"]>;
    classification: z.ZodDefault<z.ZodEnum<["unclassified", "confidential", "secret"]>>;
    dataSources: z.ZodArray<z.ZodString, "many">;
    timeRange: z.ZodObject<{
        start: z.ZodString;
        end: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        start: string;
        end: string;
    }, {
        start: string;
        end: string;
    }>;
    userRole: z.ZodString;
    organizationId: z.ZodString;
    permissions: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    privacyLevel: "public" | "restricted" | "private";
    classification: "unclassified" | "confidential" | "secret";
    dataSources: string[];
    timeRange: {
        start: string;
        end: string;
    };
    userRole: string;
    organizationId: string;
    permissions: string[];
}, {
    privacyLevel: "public" | "restricted" | "private";
    dataSources: string[];
    timeRange: {
        start: string;
        end: string;
    };
    userRole: string;
    organizationId: string;
    permissions: string[];
    classification?: "unclassified" | "confidential" | "secret" | undefined;
}>;
export type SecurityContext = z.infer<typeof SecurityContextSchema>;
export declare const QueryTypeSchema: z.ZodEnum<["kql", "sql", "elasticsearch", "splunk"]>;
export declare const NaturalLanguageQuerySchema: z.ZodObject<{
    question: z.ZodString;
    context: z.ZodObject<{
        privacyLevel: z.ZodEnum<["public", "restricted", "private"]>;
        classification: z.ZodDefault<z.ZodEnum<["unclassified", "confidential", "secret"]>>;
        dataSources: z.ZodArray<z.ZodString, "many">;
        timeRange: z.ZodObject<{
            start: z.ZodString;
            end: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            start: string;
            end: string;
        }, {
            start: string;
            end: string;
        }>;
        userRole: z.ZodString;
        organizationId: z.ZodString;
        permissions: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        privacyLevel: "public" | "restricted" | "private";
        classification: "unclassified" | "confidential" | "secret";
        dataSources: string[];
        timeRange: {
            start: string;
            end: string;
        };
        userRole: string;
        organizationId: string;
        permissions: string[];
    }, {
        privacyLevel: "public" | "restricted" | "private";
        dataSources: string[];
        timeRange: {
            start: string;
            end: string;
        };
        userRole: string;
        organizationId: string;
        permissions: string[];
        classification?: "unclassified" | "confidential" | "secret" | undefined;
    }>;
    queryType: z.ZodDefault<z.ZodEnum<["kql", "sql", "elasticsearch", "splunk"]>>;
    examples: z.ZodOptional<z.ZodArray<z.ZodObject<{
        natural: z.ZodString;
        query: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        natural: string;
        query: string;
    }, {
        natural: string;
        query: string;
    }>, "many">>;
    maxComplexity: z.ZodDefault<z.ZodEnum<["simple", "moderate", "complex"]>>;
}, "strip", z.ZodTypeAny, {
    question: string;
    context: {
        privacyLevel: "public" | "restricted" | "private";
        classification: "unclassified" | "confidential" | "secret";
        dataSources: string[];
        timeRange: {
            start: string;
            end: string;
        };
        userRole: string;
        organizationId: string;
        permissions: string[];
    };
    queryType: "kql" | "sql" | "elasticsearch" | "splunk";
    maxComplexity: "simple" | "moderate" | "complex";
    examples?: {
        natural: string;
        query: string;
    }[] | undefined;
}, {
    question: string;
    context: {
        privacyLevel: "public" | "restricted" | "private";
        dataSources: string[];
        timeRange: {
            start: string;
            end: string;
        };
        userRole: string;
        organizationId: string;
        permissions: string[];
        classification?: "unclassified" | "confidential" | "secret" | undefined;
    };
    queryType?: "kql" | "sql" | "elasticsearch" | "splunk" | undefined;
    examples?: {
        natural: string;
        query: string;
    }[] | undefined;
    maxComplexity?: "simple" | "moderate" | "complex" | undefined;
}>;
export declare const GeneratedQuerySchema: z.ZodObject<{
    query: z.ZodString;
    confidence: z.ZodNumber;
    explanation: z.ZodString;
    estimatedRows: z.ZodOptional<z.ZodNumber>;
    complexity: z.ZodEnum<["simple", "moderate", "complex"]>;
    warnings: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    suggestions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    query: string;
    confidence: number;
    explanation: string;
    complexity: "simple" | "moderate" | "complex";
    estimatedRows?: number | undefined;
    warnings?: string[] | undefined;
    suggestions?: string[] | undefined;
}, {
    query: string;
    confidence: number;
    explanation: string;
    complexity: "simple" | "moderate" | "complex";
    estimatedRows?: number | undefined;
    warnings?: string[] | undefined;
    suggestions?: string[] | undefined;
}>;
export type QueryType = z.infer<typeof QueryTypeSchema>;
export type NaturalLanguageQuery = z.infer<typeof NaturalLanguageQuerySchema>;
export type GeneratedQuery = z.infer<typeof GeneratedQuerySchema>;
export declare const AlertEnrichmentRequestSchema: z.ZodObject<{
    alertId: z.ZodString;
    eventData: z.ZodRecord<z.ZodString, z.ZodAny>;
    enrichmentTypes: z.ZodArray<z.ZodEnum<["threat-intel", "geo-location", "reputation", "context", "similar-events", "mitigation"]>, "many">;
    maxEnrichmentTime: z.ZodDefault<z.ZodNumber>;
    priority: z.ZodDefault<z.ZodEnum<["low", "medium", "high", "critical"]>>;
}, "strip", z.ZodTypeAny, {
    alertId: string;
    eventData: Record<string, any>;
    enrichmentTypes: ("context" | "threat-intel" | "geo-location" | "reputation" | "similar-events" | "mitigation")[];
    maxEnrichmentTime: number;
    priority: "low" | "medium" | "high" | "critical";
}, {
    alertId: string;
    eventData: Record<string, any>;
    enrichmentTypes: ("context" | "threat-intel" | "geo-location" | "reputation" | "similar-events" | "mitigation")[];
    maxEnrichmentTime?: number | undefined;
    priority?: "low" | "medium" | "high" | "critical" | undefined;
}>;
export declare const EnrichmentResultSchema: z.ZodObject<{
    type: z.ZodString;
    confidence: z.ZodNumber;
    data: z.ZodRecord<z.ZodString, z.ZodAny>;
    source: z.ZodString;
    timestamp: z.ZodString;
    ttl: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: string;
    confidence: number;
    data: Record<string, any>;
    source: string;
    timestamp: string;
    ttl?: number | undefined;
}, {
    type: string;
    confidence: number;
    data: Record<string, any>;
    source: string;
    timestamp: string;
    ttl?: number | undefined;
}>;
export declare const AlertEnrichmentResponseSchema: z.ZodObject<{
    alertId: z.ZodString;
    enrichments: z.ZodArray<z.ZodObject<{
        type: z.ZodString;
        confidence: z.ZodNumber;
        data: z.ZodRecord<z.ZodString, z.ZodAny>;
        source: z.ZodString;
        timestamp: z.ZodString;
        ttl: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type: string;
        confidence: number;
        data: Record<string, any>;
        source: string;
        timestamp: string;
        ttl?: number | undefined;
    }, {
        type: string;
        confidence: number;
        data: Record<string, any>;
        source: string;
        timestamp: string;
        ttl?: number | undefined;
    }>, "many">;
    processingTime: z.ZodNumber;
    errors: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    alertId: string;
    enrichments: {
        type: string;
        confidence: number;
        data: Record<string, any>;
        source: string;
        timestamp: string;
        ttl?: number | undefined;
    }[];
    processingTime: number;
    errors?: string[] | undefined;
}, {
    alertId: string;
    enrichments: {
        type: string;
        confidence: number;
        data: Record<string, any>;
        source: string;
        timestamp: string;
        ttl?: number | undefined;
    }[];
    processingTime: number;
    errors?: string[] | undefined;
}>;
export type AlertEnrichmentRequest = z.infer<typeof AlertEnrichmentRequestSchema>;
export type EnrichmentResult = z.infer<typeof EnrichmentResultSchema>;
export type AlertEnrichmentResponse = z.infer<typeof AlertEnrichmentResponseSchema>;
export declare const AnomalyDetectionModelSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    type: z.ZodEnum<["statistical", "isolation-forest", "autoencoder", "time-series"]>;
    parameters: z.ZodRecord<z.ZodString, z.ZodAny>;
    trainingData: z.ZodObject<{
        source: z.ZodString;
        timeRange: z.ZodObject<{
            start: z.ZodString;
            end: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            start: string;
            end: string;
        }, {
            start: string;
            end: string;
        }>;
        features: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        timeRange: {
            start: string;
            end: string;
        };
        source: string;
        features: string[];
    }, {
        timeRange: {
            start: string;
            end: string;
        };
        source: string;
        features: string[];
    }>;
    threshold: z.ZodDefault<z.ZodNumber>;
    lastTrained: z.ZodString;
    accuracy: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    type: "statistical" | "isolation-forest" | "autoencoder" | "time-series";
    id: string;
    parameters: Record<string, any>;
    trainingData: {
        timeRange: {
            start: string;
            end: string;
        };
        source: string;
        features: string[];
    };
    threshold: number;
    lastTrained: string;
    accuracy?: number | undefined;
}, {
    name: string;
    type: "statistical" | "isolation-forest" | "autoencoder" | "time-series";
    id: string;
    parameters: Record<string, any>;
    trainingData: {
        timeRange: {
            start: string;
            end: string;
        };
        source: string;
        features: string[];
    };
    lastTrained: string;
    threshold?: number | undefined;
    accuracy?: number | undefined;
}>;
export declare const AnomalyDetectionResultSchema: z.ZodObject<{
    id: z.ZodString;
    timestamp: z.ZodString;
    anomalyScore: z.ZodNumber;
    isAnomaly: z.ZodBoolean;
    features: z.ZodRecord<z.ZodString, z.ZodNumber>;
    explanation: z.ZodString;
    confidence: z.ZodNumber;
    relatedEvents: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    confidence: number;
    explanation: string;
    timestamp: string;
    features: Record<string, number>;
    anomalyScore: number;
    isAnomaly: boolean;
    relatedEvents?: string[] | undefined;
}, {
    id: string;
    confidence: number;
    explanation: string;
    timestamp: string;
    features: Record<string, number>;
    anomalyScore: number;
    isAnomaly: boolean;
    relatedEvents?: string[] | undefined;
}>;
export type AnomalyDetectionModel = z.infer<typeof AnomalyDetectionModelSchema>;
export type AnomalyDetectionResult = z.infer<typeof AnomalyDetectionResultSchema>;
export declare const AttackPatternSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    mitreId: z.ZodOptional<z.ZodString>;
    severity: z.ZodEnum<["low", "medium", "high", "critical"]>;
    indicators: z.ZodArray<z.ZodObject<{
        type: z.ZodString;
        value: z.ZodString;
        weight: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        type: string;
        value: string;
        weight: number;
    }, {
        type: string;
        value: string;
        weight: number;
    }>, "many">;
    sequence: z.ZodOptional<z.ZodArray<z.ZodObject<{
        step: z.ZodNumber;
        condition: z.ZodString;
        timeWindow: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        step: number;
        condition: string;
        timeWindow?: number | undefined;
    }, {
        step: number;
        condition: string;
        timeWindow?: number | undefined;
    }>, "many">>;
    confidence: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    name: string;
    description: string;
    id: string;
    confidence: number;
    severity: "low" | "medium" | "high" | "critical";
    indicators: {
        type: string;
        value: string;
        weight: number;
    }[];
    mitreId?: string | undefined;
    sequence?: {
        step: number;
        condition: string;
        timeWindow?: number | undefined;
    }[] | undefined;
}, {
    name: string;
    description: string;
    id: string;
    confidence: number;
    severity: "low" | "medium" | "high" | "critical";
    indicators: {
        type: string;
        value: string;
        weight: number;
    }[];
    mitreId?: string | undefined;
    sequence?: {
        step: number;
        condition: string;
        timeWindow?: number | undefined;
    }[] | undefined;
}>;
export declare const PatternMatchResultSchema: z.ZodObject<{
    patternId: z.ZodString;
    confidence: z.ZodNumber;
    matchedEvents: z.ZodArray<z.ZodString, "many">;
    timeline: z.ZodArray<z.ZodObject<{
        timestamp: z.ZodString;
        eventId: z.ZodString;
        step: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        timestamp: string;
        step: number;
        eventId: string;
    }, {
        timestamp: string;
        step: number;
        eventId: string;
    }>, "many">;
    riskScore: z.ZodNumber;
    recommendations: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    confidence: number;
    patternId: string;
    matchedEvents: string[];
    timeline: {
        timestamp: string;
        step: number;
        eventId: string;
    }[];
    riskScore: number;
    recommendations: string[];
}, {
    confidence: number;
    patternId: string;
    matchedEvents: string[];
    timeline: {
        timestamp: string;
        step: number;
        eventId: string;
    }[];
    riskScore: number;
    recommendations: string[];
}>;
export type AttackPattern = z.infer<typeof AttackPatternSchema>;
export type PatternMatchResult = z.infer<typeof PatternMatchResultSchema>;
export declare const VectorEmbeddingSchema: z.ZodObject<{
    id: z.ZodString;
    vector: z.ZodArray<z.ZodNumber, "many">;
    metadata: z.ZodRecord<z.ZodString, z.ZodAny>;
    namespace: z.ZodOptional<z.ZodString>;
    score: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: string;
    vector: number[];
    metadata: Record<string, any>;
    namespace?: string | undefined;
    score?: number | undefined;
}, {
    id: string;
    vector: number[];
    metadata: Record<string, any>;
    namespace?: string | undefined;
    score?: number | undefined;
}>;
export declare const SimilaritySearchRequestSchema: z.ZodObject<{
    query: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodNumber, "many">]>;
    namespace: z.ZodOptional<z.ZodString>;
    topK: z.ZodDefault<z.ZodNumber>;
    includeMetadata: z.ZodDefault<z.ZodBoolean>;
    filter: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    threshold: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    query: string | number[];
    topK: number;
    includeMetadata: boolean;
    filter?: Record<string, any> | undefined;
    threshold?: number | undefined;
    namespace?: string | undefined;
}, {
    query: string | number[];
    filter?: Record<string, any> | undefined;
    threshold?: number | undefined;
    namespace?: string | undefined;
    topK?: number | undefined;
    includeMetadata?: boolean | undefined;
}>;
export type VectorEmbedding = z.infer<typeof VectorEmbeddingSchema>;
export type SimilaritySearchRequest = z.infer<typeof SimilaritySearchRequestSchema>;
export declare const LangChainChainTypeSchema: z.ZodEnum<["llm", "conversation", "retrieval-qa", "map-reduce", "stuff", "refine"]>;
export declare const ChainConfigSchema: z.ZodObject<{
    type: z.ZodEnum<["llm", "conversation", "retrieval-qa", "map-reduce", "stuff", "refine"]>;
    model: z.ZodString;
    prompt: z.ZodOptional<z.ZodString>;
    memory: z.ZodDefault<z.ZodBoolean>;
    maxIterations: z.ZodDefault<z.ZodNumber>;
    temperature: z.ZodDefault<z.ZodNumber>;
    callbacks: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    type: "llm" | "conversation" | "retrieval-qa" | "map-reduce" | "stuff" | "refine";
    model: string;
    temperature: number;
    memory: boolean;
    maxIterations: number;
    prompt?: string | undefined;
    callbacks?: string[] | undefined;
}, {
    type: "llm" | "conversation" | "retrieval-qa" | "map-reduce" | "stuff" | "refine";
    model: string;
    temperature?: number | undefined;
    prompt?: string | undefined;
    memory?: boolean | undefined;
    maxIterations?: number | undefined;
    callbacks?: string[] | undefined;
}>;
export type LangChainChainType = z.infer<typeof LangChainChainTypeSchema>;
export type ChainConfig = z.infer<typeof ChainConfigSchema>;
export declare const ModelVersionSchema: z.ZodObject<{
    version: z.ZodString;
    timestamp: z.ZodString;
    config: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        type: z.ZodEnum<["local", "cloud"]>;
        provider: z.ZodEnum<["ollama", "lmstudio", "claude", "openai", "custom"]>;
        endpoint: z.ZodOptional<z.ZodString>;
        apiKey: z.ZodOptional<z.ZodString>;
        model: z.ZodString;
        maxTokens: z.ZodDefault<z.ZodNumber>;
        temperature: z.ZodDefault<z.ZodNumber>;
        capabilities: z.ZodArray<z.ZodEnum<["chat", "completion", "embedding", "analysis"]>, "many">;
        privacyLevel: z.ZodDefault<z.ZodEnum<["public", "restricted", "private"]>>;
        costPerToken: z.ZodOptional<z.ZodNumber>;
        enabled: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        type: "local" | "cloud";
        id: string;
        provider: "custom" | "ollama" | "lmstudio" | "claude" | "openai";
        model: string;
        maxTokens: number;
        temperature: number;
        capabilities: ("chat" | "completion" | "embedding" | "analysis")[];
        privacyLevel: "public" | "restricted" | "private";
        enabled: boolean;
        endpoint?: string | undefined;
        apiKey?: string | undefined;
        costPerToken?: number | undefined;
    }, {
        name: string;
        type: "local" | "cloud";
        id: string;
        provider: "custom" | "ollama" | "lmstudio" | "claude" | "openai";
        model: string;
        capabilities: ("chat" | "completion" | "embedding" | "analysis")[];
        endpoint?: string | undefined;
        apiKey?: string | undefined;
        maxTokens?: number | undefined;
        temperature?: number | undefined;
        privacyLevel?: "public" | "restricted" | "private" | undefined;
        costPerToken?: number | undefined;
        enabled?: boolean | undefined;
    }>;
    performance: z.ZodObject<{
        accuracy: z.ZodNumber;
        latency: z.ZodNumber;
        throughput: z.ZodNumber;
        errorRate: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        accuracy: number;
        latency: number;
        throughput: number;
        errorRate: number;
    }, {
        accuracy: number;
        latency: number;
        throughput: number;
        errorRate: number;
    }>;
    deploymentStatus: z.ZodEnum<["active", "staging", "deprecated", "archived"]>;
    rollbackTo: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    version: string;
    config: {
        name: string;
        type: "local" | "cloud";
        id: string;
        provider: "custom" | "ollama" | "lmstudio" | "claude" | "openai";
        model: string;
        maxTokens: number;
        temperature: number;
        capabilities: ("chat" | "completion" | "embedding" | "analysis")[];
        privacyLevel: "public" | "restricted" | "private";
        enabled: boolean;
        endpoint?: string | undefined;
        apiKey?: string | undefined;
        costPerToken?: number | undefined;
    };
    performance: {
        accuracy: number;
        latency: number;
        throughput: number;
        errorRate: number;
    };
    deploymentStatus: "active" | "staging" | "deprecated" | "archived";
    rollbackTo?: string | undefined;
}, {
    timestamp: string;
    version: string;
    config: {
        name: string;
        type: "local" | "cloud";
        id: string;
        provider: "custom" | "ollama" | "lmstudio" | "claude" | "openai";
        model: string;
        capabilities: ("chat" | "completion" | "embedding" | "analysis")[];
        endpoint?: string | undefined;
        apiKey?: string | undefined;
        maxTokens?: number | undefined;
        temperature?: number | undefined;
        privacyLevel?: "public" | "restricted" | "private" | undefined;
        costPerToken?: number | undefined;
        enabled?: boolean | undefined;
    };
    performance: {
        accuracy: number;
        latency: number;
        throughput: number;
        errorRate: number;
    };
    deploymentStatus: "active" | "staging" | "deprecated" | "archived";
    rollbackTo?: string | undefined;
}>;
export declare const ModelDeploymentSchema: z.ZodObject<{
    id: z.ZodString;
    modelId: z.ZodString;
    version: z.ZodString;
    environment: z.ZodEnum<["development", "staging", "production"]>;
    status: z.ZodEnum<["deploying", "active", "inactive", "failed"]>;
    startTime: z.ZodString;
    endTime: z.ZodOptional<z.ZodString>;
    resources: z.ZodObject<{
        cpu: z.ZodNumber;
        memory: z.ZodNumber;
        gpu: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        memory: number;
        cpu: number;
        gpu?: number | undefined;
    }, {
        memory: number;
        cpu: number;
        gpu?: number | undefined;
    }>;
    healthCheck: z.ZodObject<{
        endpoint: z.ZodString;
        interval: z.ZodNumber;
        timeout: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        endpoint: string;
        interval: number;
        timeout: number;
    }, {
        endpoint: string;
        interval: number;
        timeout: number;
    }>;
}, "strip", z.ZodTypeAny, {
    status: "active" | "deploying" | "inactive" | "failed";
    resources: {
        memory: number;
        cpu: number;
        gpu?: number | undefined;
    };
    id: string;
    version: string;
    modelId: string;
    environment: "staging" | "development" | "production";
    startTime: string;
    healthCheck: {
        endpoint: string;
        interval: number;
        timeout: number;
    };
    endTime?: string | undefined;
}, {
    status: "active" | "deploying" | "inactive" | "failed";
    resources: {
        memory: number;
        cpu: number;
        gpu?: number | undefined;
    };
    id: string;
    version: string;
    modelId: string;
    environment: "staging" | "development" | "production";
    startTime: string;
    healthCheck: {
        endpoint: string;
        interval: number;
        timeout: number;
    };
    endTime?: string | undefined;
}>;
export type ModelVersion = z.infer<typeof ModelVersionSchema>;
export type ModelDeployment = z.infer<typeof ModelDeploymentSchema>;
export declare const AIResponseSchema: z.ZodObject<{
    id: z.ZodString;
    timestamp: z.ZodString;
    model: z.ZodString;
    input: z.ZodString;
    output: z.ZodString;
    metadata: z.ZodObject<{
        tokensUsed: z.ZodNumber;
        processingTime: z.ZodNumber;
        confidence: z.ZodOptional<z.ZodNumber>;
        cost: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        processingTime: number;
        tokensUsed: number;
        confidence?: number | undefined;
        cost?: number | undefined;
    }, {
        processingTime: number;
        tokensUsed: number;
        confidence?: number | undefined;
        cost?: number | undefined;
    }>;
    context: z.ZodOptional<z.ZodObject<{
        privacyLevel: z.ZodEnum<["public", "restricted", "private"]>;
        classification: z.ZodDefault<z.ZodEnum<["unclassified", "confidential", "secret"]>>;
        dataSources: z.ZodArray<z.ZodString, "many">;
        timeRange: z.ZodObject<{
            start: z.ZodString;
            end: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            start: string;
            end: string;
        }, {
            start: string;
            end: string;
        }>;
        userRole: z.ZodString;
        organizationId: z.ZodString;
        permissions: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        privacyLevel: "public" | "restricted" | "private";
        classification: "unclassified" | "confidential" | "secret";
        dataSources: string[];
        timeRange: {
            start: string;
            end: string;
        };
        userRole: string;
        organizationId: string;
        permissions: string[];
    }, {
        privacyLevel: "public" | "restricted" | "private";
        dataSources: string[];
        timeRange: {
            start: string;
            end: string;
        };
        userRole: string;
        organizationId: string;
        permissions: string[];
        classification?: "unclassified" | "confidential" | "secret" | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    model: string;
    timestamp: string;
    metadata: {
        processingTime: number;
        tokensUsed: number;
        confidence?: number | undefined;
        cost?: number | undefined;
    };
    input: string;
    output: string;
    context?: {
        privacyLevel: "public" | "restricted" | "private";
        classification: "unclassified" | "confidential" | "secret";
        dataSources: string[];
        timeRange: {
            start: string;
            end: string;
        };
        userRole: string;
        organizationId: string;
        permissions: string[];
    } | undefined;
}, {
    id: string;
    model: string;
    timestamp: string;
    metadata: {
        processingTime: number;
        tokensUsed: number;
        confidence?: number | undefined;
        cost?: number | undefined;
    };
    input: string;
    output: string;
    context?: {
        privacyLevel: "public" | "restricted" | "private";
        dataSources: string[];
        timeRange: {
            start: string;
            end: string;
        };
        userRole: string;
        organizationId: string;
        permissions: string[];
        classification?: "unclassified" | "confidential" | "secret" | undefined;
    } | undefined;
}>;
export type AIResponse = z.infer<typeof AIResponseSchema>;
export declare class AIEngineError extends Error {
    code: string;
    context?: Record<string, any> | undefined;
    constructor(message: string, code: string, context?: Record<string, any> | undefined);
}
export declare class ModelNotFoundError extends AIEngineError {
    constructor(modelId: string);
}
export declare class InvalidQueryError extends AIEngineError {
    constructor(query: string, reason: string);
}
export declare class AIServiceUnavailableError extends AIEngineError {
    constructor(service: string, details?: string);
}
//# sourceMappingURL=ai.types.d.ts.map