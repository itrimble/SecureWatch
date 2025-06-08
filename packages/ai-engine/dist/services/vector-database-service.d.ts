import { EventEmitter } from 'events';
import { SimilaritySearchRequest } from '../types/ai.types';
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
export declare class VectorDatabaseService extends EventEmitter {
    private pinecone;
    private indices;
    private embeddingModels;
    private documentCache;
    private embeddingCache;
    constructor(apiKey: string, environment?: string);
    /**
     * Initialize or connect to a vector index
     */
    initializeIndex(indexConfig: VectorIndex): Promise<void>;
    /**
     * Store security documents in vector database
     */
    storeDocuments(indexName: string, documents: SecurityDocument[], embeddingModelId?: string): Promise<void>;
    /**
     * Perform similarity search
     */
    searchSimilar(indexName: string, request: SimilaritySearchRequest, embeddingModelId?: string): Promise<SimilarityResult[]>;
    /**
     * Find similar security incidents
     */
    findSimilarIncidents(incident: SecurityDocument, indexName?: string, topK?: number): Promise<SimilarityResult[]>;
    /**
     * Find similar attack patterns
     */
    findSimilarPatterns(pattern: string, indexName?: string, topK?: number): Promise<SimilarityResult[]>;
    /**
     * Search security knowledge base
     */
    searchKnowledgeBase(query: string, indexName?: string, topK?: number): Promise<SimilarityResult[]>;
    /**
     * Get index statistics
     */
    getIndexStats(indexName: string): Promise<{
        totalVectors: number;
        dimension: number;
        indexFullness: number;
        namespaces: Record<string, {
            vectorCount: number;
        }>;
    }>;
    /**
     * Delete documents from index
     */
    deleteDocuments(indexName: string, documentIds: string[], namespace?: string): Promise<void>;
    /**
     * Update document metadata
     */
    updateDocumentMetadata(indexName: string, documentId: string, metadata: Record<string, any>, namespace?: string): Promise<void>;
    /**
     * Generate embedding for text
     */
    private generateEmbedding;
    private generateOpenAIEmbedding;
    private generateLocalEmbedding;
    private generateCustomEmbedding;
    private simpleHash;
    private setupCacheCleanup;
    private initializeEmbeddingModels;
    /**
     * List available embedding models
     */
    getEmbeddingModels(): EmbeddingModel[];
    /**
     * List configured indices
     */
    getConfiguredIndices(): VectorIndex[];
}
export default VectorDatabaseService;
//# sourceMappingURL=vector-database-service.d.ts.map