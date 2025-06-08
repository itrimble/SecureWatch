import { EventEmitter } from 'events';
import { Document } from '@langchain/core/documents';
import { ChainConfig, LangChainChainType, AIModelConfig, SecurityContext } from '../types/ai.types';
import { LocalLLMProvider } from '../providers/local-llm-provider';
import { CloudAIProvider } from '../providers/cloud-ai-provider';
interface ChainResult {
    output: string;
    sourceDocuments?: Document[];
    intermediateSteps?: any[];
    metadata: {
        chainId: string;
        executionTime: number;
        tokenUsage?: number;
        confidence?: number;
    };
}
/**
 * LangChain Orchestrator for LLM Chain Management
 * Provides high-level orchestration of LangChain workflows for security analytics
 */
export declare class LangChainOrchestrator extends EventEmitter {
    private localProvider;
    private cloudProvider;
    private chains;
    private sessions;
    private models;
    private embeddings;
    constructor(localProvider: LocalLLMProvider, cloudProvider: CloudAIProvider);
    /**
     * Initialize LLM models for LangChain
     */
    initializeModel(config: AIModelConfig): Promise<void>;
    /**
     * Create a new chain instance
     */
    createChain(config: ChainConfig): Promise<string>;
    /**
     * Execute a chain with input
     */
    executeChain(chainId: string, input: string | Record<string, any>, context?: SecurityContext): Promise<ChainResult>;
    /**
     * Create or get conversation session
     */
    createConversationSession(userId: string, context: SecurityContext, chainId?: string): Promise<string>;
    /**
     * Continue conversation in a session
     */
    continueConversation(sessionId: string, input: string, chainId: string): Promise<ChainResult>;
    /**
     * Add documents to a retrieval chain's vector store
     */
    addDocumentsToChain(chainId: string, documents: Array<{
        content: string;
        metadata: Record<string, any>;
    }>): Promise<void>;
    /**
     * Get chain statistics
     */
    getChainStats(chainId: string): {
        executions: number;
        avgExecutionTime: number;
        lastUsed: string;
        memorySize?: number;
        documentsCount?: number;
    };
    /**
     * List active chains
     */
    getActiveChains(): Array<{
        id: string;
        type: LangChainChainType;
        model: string;
        createdAt: string;
        lastUsed: string;
    }>;
    /**
     * Delete a chain
     */
    deleteChain(chainId: string): Promise<void>;
    private createLLMChain;
    private createConversationChain;
    private createRetrievalQAChain;
    private createMapReduceChain;
    private createStuffChain;
    private createRefineChain;
    private createCallbackManager;
    private validateSecurityContext;
    private extractTokenUsage;
    private calculateConfidence;
    private setupCleanupRoutines;
}
export default LangChainOrchestrator;
//# sourceMappingURL=langchain-orchestrator.d.ts.map