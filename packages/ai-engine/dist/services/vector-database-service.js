"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectorDatabaseService = void 0;
const events_1 = require("events");
const pinecone_1 = require("@pinecone-database/pinecone");
const ai_types_1 = require("../types/ai.types");
const logger_1 = require("../utils/logger");
/**
 * Vector Database Service for Similarity Search
 * Provides semantic search capabilities for security documents and events
 */
class VectorDatabaseService extends events_1.EventEmitter {
    constructor(apiKey, environment) {
        super();
        this.indices = new Map();
        this.embeddingModels = new Map();
        this.documentCache = new Map();
        this.embeddingCache = new Map();
        this.pinecone = new pinecone_1.Pinecone({
            apiKey
        });
        this.initializeEmbeddingModels();
        this.setupCacheCleanup();
    }
    /**
     * Initialize or connect to a vector index
     */
    async initializeIndex(indexConfig) {
        try {
            // Check if index exists
            const indexList = await this.pinecone.listIndexes();
            const existingIndex = indexList.indexes?.find(idx => idx.name === indexConfig.name);
            if (!existingIndex) {
                // Create new index
                await this.pinecone.createIndex({
                    name: indexConfig.name,
                    dimension: indexConfig.dimension,
                    metric: indexConfig.metric,
                    spec: {
                        serverless: {
                            cloud: 'aws',
                            region: 'us-east-1'
                        }
                    }
                });
                logger_1.logger.info(`Created Pinecone index: ${indexConfig.name}`);
            }
            else {
                logger_1.logger.info(`Connected to existing Pinecone index: ${indexConfig.name}`);
            }
            this.indices.set(indexConfig.name, indexConfig);
            this.emit('index:initialized', indexConfig);
        }
        catch (error) {
            logger_1.logger.error(`Error initializing index ${indexConfig.name}:`, error);
            throw new ai_types_1.AIEngineError(`Failed to initialize vector index: ${error instanceof Error ? error.message : 'Unknown error'}`, 'INDEX_INITIALIZATION_FAILED', { indexName: indexConfig.name, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    /**
     * Store security documents in vector database
     */
    async storeDocuments(indexName, documents, embeddingModelId = 'openai-ada-002') {
        try {
            const index = this.pinecone.index(indexName);
            const embeddingModel = this.embeddingModels.get(embeddingModelId);
            if (!embeddingModel) {
                throw new ai_types_1.AIEngineError(`Embedding model not found: ${embeddingModelId}`, 'MODEL_NOT_FOUND');
            }
            const vectors = [];
            for (const document of documents) {
                // Generate embedding if not already present
                if (!document.embedding) {
                    document.embedding = await this.generateEmbedding(document.content, embeddingModelId);
                }
                vectors.push({
                    id: document.id,
                    values: document.embedding,
                    metadata: {
                        content: document.content,
                        type: document.type,
                        timestamp: document.timestamp,
                        source: document.source,
                        ...document.metadata
                    }
                });
                // Cache the document
                this.documentCache.set(document.id, document);
            }
            // Batch upsert vectors
            const batchSize = 100;
            for (let i = 0; i < vectors.length; i += batchSize) {
                const batch = vectors.slice(i, i + batchSize);
                await index.upsert(batch);
            }
            this.emit('documents:stored', { indexName, count: documents.length });
            logger_1.logger.info(`Stored ${documents.length} documents in index ${indexName}`);
        }
        catch (error) {
            logger_1.logger.error(`Error storing documents in index ${indexName}:`, error);
            throw new ai_types_1.AIEngineError(`Failed to store documents: ${error instanceof Error ? error.message : 'Unknown error'}`, 'DOCUMENT_STORAGE_FAILED', { indexName, documentCount: documents.length, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    /**
     * Perform similarity search
     */
    async searchSimilar(indexName, request, embeddingModelId = 'openai-ada-002') {
        try {
            const index = this.pinecone.index(indexName);
            let queryVector;
            if (typeof request.query === 'string') {
                // Generate embedding for text query
                queryVector = await this.generateEmbedding(request.query, embeddingModelId);
            }
            else {
                // Use provided vector
                queryVector = request.query;
            }
            const queryRequest = {
                vector: queryVector,
                topK: request.topK,
                includeMetadata: request.includeMetadata,
                namespace: request.namespace
            };
            if (request.filter) {
                queryRequest.filter = request.filter;
            }
            const response = await index.query(queryRequest);
            const results = [];
            if (response.matches) {
                for (const match of response.matches) {
                    if (request.threshold && match.score && match.score < request.threshold) {
                        continue;
                    }
                    // Reconstruct document from metadata
                    const document = {
                        id: match.id,
                        content: match.metadata?.content || '',
                        type: match.metadata?.type || 'unknown',
                        timestamp: match.metadata?.timestamp || new Date().toISOString(),
                        source: match.metadata?.source || 'unknown',
                        metadata: match.metadata || {}
                    };
                    results.push({
                        id: match.id,
                        score: match.score || 0,
                        document,
                        metadata: match.metadata || {}
                    });
                }
            }
            this.emit('search:completed', { indexName, query: request.query, results: results.length });
            return results;
        }
        catch (error) {
            logger_1.logger.error(`Error performing similarity search in index ${indexName}:`, error);
            throw new ai_types_1.AIEngineError(`Failed to perform similarity search: ${error instanceof Error ? error.message : 'Unknown error'}`, 'SIMILARITY_SEARCH_FAILED', { indexName, query: request.query, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    /**
     * Find similar security incidents
     */
    async findSimilarIncidents(incident, indexName = 'security-incidents', topK = 10) {
        const searchRequest = {
            query: incident.content,
            topK,
            includeMetadata: true,
            filter: {
                type: 'incident'
            },
            threshold: 0.7
        };
        return this.searchSimilar(indexName, searchRequest);
    }
    /**
     * Find similar attack patterns
     */
    async findSimilarPatterns(pattern, indexName = 'attack-patterns', topK = 5) {
        const searchRequest = {
            query: pattern,
            topK,
            includeMetadata: true,
            filter: {
                type: 'pattern'
            },
            threshold: 0.6
        };
        return this.searchSimilar(indexName, searchRequest);
    }
    /**
     * Search security knowledge base
     */
    async searchKnowledgeBase(query, indexName = 'security-knowledge', topK = 5) {
        const searchRequest = {
            query,
            topK,
            includeMetadata: true,
            filter: {
                type: 'knowledge'
            },
            threshold: 0.5
        };
        return this.searchSimilar(indexName, searchRequest);
    }
    /**
     * Get index statistics
     */
    async getIndexStats(indexName) {
        try {
            const index = this.pinecone.index(indexName);
            const stats = await index.describeIndexStats();
            return {
                totalVectors: stats.totalRecordCount || 0,
                dimension: stats.dimension || 0,
                indexFullness: stats.indexFullness || 0,
                namespaces: Object.entries(stats.namespaces || {}).reduce((acc, [key, value]) => {
                    acc[key] = { vectorCount: value.recordCount || 0 };
                    return acc;
                }, {})
            };
        }
        catch (error) {
            logger_1.logger.error(`Error getting index stats for ${indexName}:`, error);
            throw new ai_types_1.AIEngineError(`Failed to get index statistics: ${error instanceof Error ? error.message : 'Unknown error'}`, 'INDEX_STATS_FAILED', { indexName, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    /**
     * Delete documents from index
     */
    async deleteDocuments(indexName, documentIds, namespace) {
        try {
            const index = this.pinecone.index(indexName);
            await index.deleteMany({
                ids: documentIds,
                namespace
            });
            // Remove from cache
            documentIds.forEach(id => this.documentCache.delete(id));
            this.emit('documents:deleted', { indexName, count: documentIds.length });
            logger_1.logger.info(`Deleted ${documentIds.length} documents from index ${indexName}`);
        }
        catch (error) {
            logger_1.logger.error(`Error deleting documents from index ${indexName}:`, error);
            throw new ai_types_1.AIEngineError(`Failed to delete documents: ${error instanceof Error ? error.message : 'Unknown error'}`, 'DOCUMENT_DELETION_FAILED', { indexName, documentCount: documentIds.length, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    /**
     * Update document metadata
     */
    async updateDocumentMetadata(indexName, documentId, metadata, namespace) {
        try {
            const index = this.pinecone.index(indexName);
            // Fetch existing vector
            const fetchResponse = await index.fetch([documentId]);
            const existingVector = fetchResponse.records?.[documentId];
            if (!existingVector) {
                throw new ai_types_1.AIEngineError(`Document not found: ${documentId}`, 'DOCUMENT_NOT_FOUND');
            }
            // Update with new metadata
            await index.upsert([{
                    id: documentId,
                    values: existingVector.values,
                    metadata: {
                        ...existingVector.metadata,
                        ...metadata
                    }
                }]);
            this.emit('document:updated', { indexName, documentId });
            logger_1.logger.info(`Updated metadata for document ${documentId} in index ${indexName}`);
        }
        catch (error) {
            logger_1.logger.error(`Error updating document metadata in index ${indexName}:`, error);
            throw new ai_types_1.AIEngineError(`Failed to update document metadata: ${error instanceof Error ? error.message : 'Unknown error'}`, 'METADATA_UPDATE_FAILED', { indexName, documentId, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    /**
     * Generate embedding for text
     */
    async generateEmbedding(text, modelId) {
        const cacheKey = `${modelId}:${text}`;
        // Check cache first
        const cached = this.embeddingCache.get(cacheKey);
        if (cached) {
            return cached;
        }
        const model = this.embeddingModels.get(modelId);
        if (!model) {
            throw new ai_types_1.AIEngineError(`Embedding model not found: ${modelId}`, 'MODEL_NOT_FOUND');
        }
        try {
            let embedding;
            if (model.provider === 'openai') {
                embedding = await this.generateOpenAIEmbedding(text, model);
            }
            else if (model.provider === 'local') {
                embedding = await this.generateLocalEmbedding(text, model);
            }
            else {
                embedding = await this.generateCustomEmbedding(text, model);
            }
            // Cache the embedding
            this.embeddingCache.set(cacheKey, embedding);
            return embedding;
        }
        catch (error) {
            logger_1.logger.error(`Error generating embedding with model ${modelId}:`, error);
            throw new ai_types_1.AIEngineError(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`, 'EMBEDDING_GENERATION_FAILED', { modelId, text: text.substring(0, 100), error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    async generateOpenAIEmbedding(text, model) {
        // This would use the OpenAI API
        // For now, return a mock embedding
        const dimension = model.dimension;
        const embedding = Array(dimension).fill(0).map(() => Math.random() - 0.5);
        // Normalize the vector
        const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        return embedding.map(val => val / magnitude);
    }
    async generateLocalEmbedding(text, model) {
        // This would use a local embedding model (like sentence-transformers)
        // For now, return a mock embedding based on text features
        const words = text.toLowerCase().split(/\s+/);
        const dimension = model.dimension;
        const embedding = Array(dimension).fill(0);
        // Simple feature extraction based on word presence
        const securityKeywords = [
            'attack', 'malware', 'suspicious', 'anomaly', 'threat', 'vulnerability',
            'exploit', 'intrusion', 'breach', 'unauthorized', 'malicious', 'infection'
        ];
        words.forEach((word, index) => {
            const hash = this.simpleHash(word) % dimension;
            embedding[hash] += 1;
            // Boost security-related terms
            if (securityKeywords.includes(word)) {
                embedding[hash] += 2;
            }
        });
        // Normalize the vector
        const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        return magnitude > 0 ? embedding.map(val => val / magnitude) : embedding;
    }
    async generateCustomEmbedding(text, model) {
        // This would use a custom embedding endpoint
        if (!model.endpoint) {
            throw new ai_types_1.AIEngineError('Custom model endpoint not configured', 'ENDPOINT_NOT_CONFIGURED');
        }
        try {
            const response = await fetch(model.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text, model: model.name })
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const result = await response.json();
            return result.embedding || result.data?.embedding;
        }
        catch (error) {
            throw new ai_types_1.AIEngineError(`Custom embedding API failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'CUSTOM_EMBEDDING_FAILED');
        }
    }
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }
    setupCacheCleanup() {
        // Clean up embedding cache every 30 minutes
        setInterval(() => {
            if (this.embeddingCache.size > 10000) {
                // Keep only the 5000 most recent entries
                const entries = Array.from(this.embeddingCache.entries());
                this.embeddingCache.clear();
                entries.slice(-5000).forEach(([key, value]) => {
                    this.embeddingCache.set(key, value);
                });
            }
        }, 30 * 60 * 1000);
        // Clean up document cache every hour
        setInterval(() => {
            if (this.documentCache.size > 5000) {
                const entries = Array.from(this.documentCache.entries());
                this.documentCache.clear();
                entries.slice(-2500).forEach(([key, value]) => {
                    this.documentCache.set(key, value);
                });
            }
        }, 60 * 60 * 1000);
    }
    initializeEmbeddingModels() {
        // OpenAI models
        this.embeddingModels.set('openai-ada-002', {
            id: 'openai-ada-002',
            name: 'text-embedding-ada-002',
            dimension: 1536,
            maxTokens: 8191,
            provider: 'openai'
        });
        this.embeddingModels.set('openai-3-small', {
            id: 'openai-3-small',
            name: 'text-embedding-3-small',
            dimension: 1536,
            maxTokens: 8191,
            provider: 'openai'
        });
        this.embeddingModels.set('openai-3-large', {
            id: 'openai-3-large',
            name: 'text-embedding-3-large',
            dimension: 3072,
            maxTokens: 8191,
            provider: 'openai'
        });
        // Local models
        this.embeddingModels.set('local-security', {
            id: 'local-security',
            name: 'Security-focused embedding model',
            dimension: 768,
            maxTokens: 512,
            provider: 'local'
        });
        logger_1.logger.info('Initialized embedding models', {
            modelCount: this.embeddingModels.size
        });
    }
    /**
     * List available embedding models
     */
    getEmbeddingModels() {
        return Array.from(this.embeddingModels.values());
    }
    /**
     * List configured indices
     */
    getConfiguredIndices() {
        return Array.from(this.indices.values());
    }
}
exports.VectorDatabaseService = VectorDatabaseService;
exports.default = VectorDatabaseService;
//# sourceMappingURL=vector-database-service.js.map