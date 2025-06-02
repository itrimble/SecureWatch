import { EventEmitter } from 'events';
import { Pinecone } from '@pinecone-database/pinecone';
import { VectorEmbedding, SimilaritySearchRequest, AIEngineError } from '../types/ai.types';
import { logger } from '../utils/logger';

interface VectorIndex {
  name: string;
  dimension: number;
  metric: 'cosine' | 'euclidean' | 'dotproduct';
  description: string;
  namespace?: string;
}

interface EmbeddingModel {
  id: string;
  name: string;
  dimension: number;
  maxTokens: number;
  provider: 'openai' | 'local' | 'custom';
  endpoint?: string;
}

interface SecurityDocument {
  id: string;
  content: string;
  type: 'alert' | 'incident' | 'rule' | 'pattern' | 'log' | 'knowledge';
  timestamp: string;
  source: string;
  metadata: Record<string, any>;
  embedding?: number[];
}

interface SimilarityResult {
  id: string;
  score: number;
  document: SecurityDocument;
  metadata: Record<string, any>;
}

/**
 * Vector Database Service for Similarity Search
 * Provides semantic search capabilities for security documents and events
 */
export class VectorDatabaseService extends EventEmitter {
  private pinecone: Pinecone;
  private indices: Map<string, VectorIndex> = new Map();
  private embeddingModels: Map<string, EmbeddingModel> = new Map();
  private documentCache: Map<string, SecurityDocument> = new Map();
  private embeddingCache: Map<string, number[]> = new Map();

  constructor(apiKey: string, environment?: string) {
    super();
    
    this.pinecone = new Pinecone({
      apiKey,
      environment
    });

    this.initializeEmbeddingModels();
    this.setupCacheCleanup();
  }

  /**
   * Initialize or connect to a vector index
   */
  async initializeIndex(indexConfig: VectorIndex): Promise<void> {
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

        logger.info(`Created Pinecone index: ${indexConfig.name}`);
      } else {
        logger.info(`Connected to existing Pinecone index: ${indexConfig.name}`);
      }

      this.indices.set(indexConfig.name, indexConfig);
      this.emit('index:initialized', indexConfig);

    } catch (error) {
      logger.error(`Error initializing index ${indexConfig.name}:`, error);
      throw new AIEngineError(
        `Failed to initialize vector index: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INDEX_INITIALIZATION_FAILED',
        { indexName: indexConfig.name, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Store security documents in vector database
   */
  async storeDocuments(
    indexName: string,
    documents: SecurityDocument[],
    embeddingModelId: string = 'openai-ada-002'
  ): Promise<void> {
    try {
      const index = this.pinecone.index(indexName);
      const embeddingModel = this.embeddingModels.get(embeddingModelId);
      
      if (!embeddingModel) {
        throw new AIEngineError(`Embedding model not found: ${embeddingModelId}`, 'MODEL_NOT_FOUND');
      }

      const vectors: VectorEmbedding[] = [];

      for (const document of documents) {
        // Generate embedding if not already present
        if (!document.embedding) {
          document.embedding = await this.generateEmbedding(document.content, embeddingModelId);
        }

        vectors.push({
          id: document.id,
          vector: document.embedding,
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
      logger.info(`Stored ${documents.length} documents in index ${indexName}`);

    } catch (error) {
      logger.error(`Error storing documents in index ${indexName}:`, error);
      throw new AIEngineError(
        `Failed to store documents: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DOCUMENT_STORAGE_FAILED',
        { indexName, documentCount: documents.length, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Perform similarity search
   */
  async searchSimilar(
    indexName: string,
    request: SimilaritySearchRequest,
    embeddingModelId: string = 'openai-ada-002'
  ): Promise<SimilarityResult[]> {
    try {
      const index = this.pinecone.index(indexName);
      let queryVector: number[];

      if (typeof request.query === 'string') {
        // Generate embedding for text query
        queryVector = await this.generateEmbedding(request.query, embeddingModelId);
      } else {
        // Use provided vector
        queryVector = request.query;
      }

      const queryRequest: any = {
        vector: queryVector,
        topK: request.topK,
        includeMetadata: request.includeMetadata,
        namespace: request.namespace
      };

      if (request.filter) {
        queryRequest.filter = request.filter;
      }

      const response = await index.query(queryRequest);
      const results: SimilarityResult[] = [];

      if (response.matches) {
        for (const match of response.matches) {
          if (request.threshold && match.score && match.score < request.threshold) {
            continue;
          }

          // Reconstruct document from metadata
          const document: SecurityDocument = {
            id: match.id,
            content: match.metadata?.content as string || '',
            type: match.metadata?.type as any || 'unknown',
            timestamp: match.metadata?.timestamp as string || new Date().toISOString(),
            source: match.metadata?.source as string || 'unknown',
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

    } catch (error) {
      logger.error(`Error performing similarity search in index ${indexName}:`, error);
      throw new AIEngineError(
        `Failed to perform similarity search: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SIMILARITY_SEARCH_FAILED',
        { indexName, query: request.query, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Find similar security incidents
   */
  async findSimilarIncidents(
    incident: SecurityDocument,
    indexName: string = 'security-incidents',
    topK: number = 10
  ): Promise<SimilarityResult[]> {
    const searchRequest: SimilaritySearchRequest = {
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
  async findSimilarPatterns(
    pattern: string,
    indexName: string = 'attack-patterns',
    topK: number = 5
  ): Promise<SimilarityResult[]> {
    const searchRequest: SimilaritySearchRequest = {
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
  async searchKnowledgeBase(
    query: string,
    indexName: string = 'security-knowledge',
    topK: number = 5
  ): Promise<SimilarityResult[]> {
    const searchRequest: SimilaritySearchRequest = {
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
  async getIndexStats(indexName: string): Promise<{
    totalVectors: number;
    dimension: number;
    indexFullness: number;
    namespaces: Record<string, { vectorCount: number }>;
  }> {
    try {
      const index = this.pinecone.index(indexName);
      const stats = await index.describeIndexStats();

      return {
        totalVectors: stats.totalVectorCount || 0,
        dimension: stats.dimension || 0,
        indexFullness: stats.indexFullness || 0,
        namespaces: stats.namespaces || {}
      };

    } catch (error) {
      logger.error(`Error getting index stats for ${indexName}:`, error);
      throw new AIEngineError(
        `Failed to get index statistics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INDEX_STATS_FAILED',
        { indexName, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Delete documents from index
   */
  async deleteDocuments(
    indexName: string,
    documentIds: string[],
    namespace?: string
  ): Promise<void> {
    try {
      const index = this.pinecone.index(indexName);
      
      await index.deleteMany({
        ids: documentIds,
        namespace
      });

      // Remove from cache
      documentIds.forEach(id => this.documentCache.delete(id));

      this.emit('documents:deleted', { indexName, count: documentIds.length });
      logger.info(`Deleted ${documentIds.length} documents from index ${indexName}`);

    } catch (error) {
      logger.error(`Error deleting documents from index ${indexName}:`, error);
      throw new AIEngineError(
        `Failed to delete documents: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DOCUMENT_DELETION_FAILED',
        { indexName, documentCount: documentIds.length, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Update document metadata
   */
  async updateDocumentMetadata(
    indexName: string,
    documentId: string,
    metadata: Record<string, any>,
    namespace?: string
  ): Promise<void> {
    try {
      const index = this.pinecone.index(indexName);
      
      // Fetch existing vector
      const fetchResponse = await index.fetch({
        ids: [documentId],
        namespace
      });

      const existingVector = fetchResponse.vectors[documentId];
      if (!existingVector) {
        throw new AIEngineError(`Document not found: ${documentId}`, 'DOCUMENT_NOT_FOUND');
      }

      // Update with new metadata
      await index.upsert([{
        id: documentId,
        vector: existingVector.values,
        metadata: {
          ...existingVector.metadata,
          ...metadata
        },
        namespace
      }]);

      this.emit('document:updated', { indexName, documentId });
      logger.info(`Updated metadata for document ${documentId} in index ${indexName}`);

    } catch (error) {
      logger.error(`Error updating document metadata in index ${indexName}:`, error);
      throw new AIEngineError(
        `Failed to update document metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'METADATA_UPDATE_FAILED',
        { indexName, documentId, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Generate embedding for text
   */
  private async generateEmbedding(text: string, modelId: string): Promise<number[]> {
    const cacheKey = `${modelId}:${text}`;
    
    // Check cache first
    const cached = this.embeddingCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const model = this.embeddingModels.get(modelId);
    if (!model) {
      throw new AIEngineError(`Embedding model not found: ${modelId}`, 'MODEL_NOT_FOUND');
    }

    try {
      let embedding: number[];

      if (model.provider === 'openai') {
        embedding = await this.generateOpenAIEmbedding(text, model);
      } else if (model.provider === 'local') {
        embedding = await this.generateLocalEmbedding(text, model);
      } else {
        embedding = await this.generateCustomEmbedding(text, model);
      }

      // Cache the embedding
      this.embeddingCache.set(cacheKey, embedding);

      return embedding;

    } catch (error) {
      logger.error(`Error generating embedding with model ${modelId}:`, error);
      throw new AIEngineError(
        `Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'EMBEDDING_GENERATION_FAILED',
        { modelId, text: text.substring(0, 100), error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  private async generateOpenAIEmbedding(text: string, model: EmbeddingModel): Promise<number[]> {
    // This would use the OpenAI API
    // For now, return a mock embedding
    const dimension = model.dimension;
    const embedding = Array(dimension).fill(0).map(() => Math.random() - 0.5);
    
    // Normalize the vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }

  private async generateLocalEmbedding(text: string, model: EmbeddingModel): Promise<number[]> {
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

  private async generateCustomEmbedding(text: string, model: EmbeddingModel): Promise<number[]> {
    // This would use a custom embedding endpoint
    if (!model.endpoint) {
      throw new AIEngineError('Custom model endpoint not configured', 'ENDPOINT_NOT_CONFIGURED');
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

    } catch (error) {
      throw new AIEngineError(
        `Custom embedding API failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CUSTOM_EMBEDDING_FAILED'
      );
    }
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private setupCacheCleanup(): void {
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

  private initializeEmbeddingModels(): void {
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

    logger.info('Initialized embedding models', {
      modelCount: this.embeddingModels.size
    });
  }

  /**
   * List available embedding models
   */
  getEmbeddingModels(): EmbeddingModel[] {
    return Array.from(this.embeddingModels.values());
  }

  /**
   * List configured indices
   */
  getConfiguredIndices(): VectorIndex[] {
    return Array.from(this.indices.values());
  }
}

export default VectorDatabaseService;