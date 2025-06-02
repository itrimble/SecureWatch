import { EventEmitter } from 'events';
import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { Ollama } from '@langchain/community/llms/ollama';
import { PromptTemplate, ChatPromptTemplate } from '@langchain/core/prompts';
import { LLMChain } from 'langchain/chains';
import { ConversationChain } from 'langchain/chains';
import { RetrievalQAChain } from 'langchain/chains';
import { StuffDocumentsChain } from 'langchain/chains';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Document } from '@langchain/core/documents';
import { BufferMemory, ConversationBufferMemory } from 'langchain/memory';
import { CallbackManager } from '@langchain/core/callbacks/manager';
import { ChainConfig, LangChainChainType, AIModelConfig, SecurityContext, AIEngineError } from '../types/ai.types';
import { LocalLLMProvider } from '../providers/local-llm-provider';
import { CloudAIProvider } from '../providers/cloud-ai-provider';
import { logger } from '../utils/logger';

interface ChainInstance {
  id: string;
  type: LangChainChainType;
  chain: any; // LangChain chain instance
  config: ChainConfig;
  memory?: BufferMemory;
  vectorStore?: MemoryVectorStore;
  createdAt: number;
  lastUsed: number;
}

interface ConversationSession {
  id: string;
  userId: string;
  context: SecurityContext;
  memory: ConversationBufferMemory;
  history: Array<{
    timestamp: string;
    input: string;
    output: string;
    chainId: string;
  }>;
  createdAt: number;
  lastActive: number;
}

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
export class LangChainOrchestrator extends EventEmitter {
  private localProvider: LocalLLMProvider;
  private cloudProvider: CloudAIProvider;
  private chains: Map<string, ChainInstance> = new Map();
  private sessions: Map<string, ConversationSession> = new Map();
  private models: Map<string, BaseLanguageModel> = new Map();
  private embeddings: Map<string, OpenAIEmbeddings> = new Map();

  constructor(localProvider: LocalLLMProvider, cloudProvider: CloudAIProvider) {
    super();
    this.localProvider = localProvider;
    this.cloudProvider = cloudProvider;
    this.setupCleanupRoutines();
  }

  /**
   * Initialize LLM models for LangChain
   */
  async initializeModel(config: AIModelConfig): Promise<void> {
    try {
      let model: BaseLanguageModel;

      if (config.type === 'cloud') {
        if (config.provider === 'openai') {
          model = new ChatOpenAI({
            apiKey: config.apiKey,
            modelName: config.model,
            temperature: config.temperature,
            maxTokens: config.maxTokens,
            baseURL: config.endpoint
          });
        } else if (config.provider === 'claude') {
          model = new ChatAnthropic({
            apiKey: config.apiKey,
            modelName: config.model,
            temperature: config.temperature,
            maxTokens: config.maxTokens,
            baseURL: config.endpoint
          });
        } else {
          throw new AIEngineError(`Unsupported cloud provider: ${config.provider}`, 'UNSUPPORTED_PROVIDER');
        }
      } else if (config.type === 'local') {
        if (config.provider === 'ollama') {
          model = new Ollama({
            baseUrl: config.endpoint || 'http://localhost:11434',
            model: config.model,
            temperature: config.temperature,
            numPredict: config.maxTokens
          });
        } else {
          throw new AIEngineError(`Unsupported local provider: ${config.provider}`, 'UNSUPPORTED_PROVIDER');
        }
      } else {
        throw new AIEngineError(`Unsupported model type: ${config.type}`, 'UNSUPPORTED_MODEL_TYPE');
      }

      this.models.set(config.id, model);
      this.emit('model:initialized', config);
      logger.info(`Initialized LangChain model: ${config.id} (${config.provider})`);

    } catch (error) {
      logger.error(`Error initializing LangChain model ${config.id}:`, error);
      throw new AIEngineError(
        `Failed to initialize LangChain model: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'MODEL_INITIALIZATION_FAILED',
        { modelId: config.id, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Create a new chain instance
   */
  async createChain(config: ChainConfig): Promise<string> {
    try {
      const chainId = `chain-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const model = this.models.get(config.model);
      
      if (!model) {
        throw new AIEngineError(`Model not found: ${config.model}`, 'MODEL_NOT_FOUND');
      }

      let chain: any;
      let memory: BufferMemory | undefined;
      let vectorStore: MemoryVectorStore | undefined;

      switch (config.type) {
        case 'llm':
          chain = await this.createLLMChain(model, config);
          break;
        case 'conversation':
          ({ chain, memory } = await this.createConversationChain(model, config));
          break;
        case 'retrieval-qa':
          ({ chain, vectorStore } = await this.createRetrievalQAChain(model, config));
          break;
        case 'map-reduce':
          chain = await this.createMapReduceChain(model, config);
          break;
        case 'stuff':
          chain = await this.createStuffChain(model, config);
          break;
        case 'refine':
          chain = await this.createRefineChain(model, config);
          break;
        default:
          throw new AIEngineError(`Unsupported chain type: ${config.type}`, 'UNSUPPORTED_CHAIN_TYPE');
      }

      const chainInstance: ChainInstance = {
        id: chainId,
        type: config.type,
        chain,
        config,
        memory,
        vectorStore,
        createdAt: Date.now(),
        lastUsed: Date.now()
      };

      this.chains.set(chainId, chainInstance);
      this.emit('chain:created', { chainId, type: config.type });
      logger.info(`Created LangChain instance: ${chainId} (${config.type})`);

      return chainId;

    } catch (error) {
      logger.error('Error creating LangChain chain:', error);
      throw new AIEngineError(
        `Failed to create chain: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CHAIN_CREATION_FAILED',
        { chainType: config.type, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Execute a chain with input
   */
  async executeChain(
    chainId: string,
    input: string | Record<string, any>,
    context?: SecurityContext
  ): Promise<ChainResult> {
    const startTime = Date.now();

    try {
      const chainInstance = this.chains.get(chainId);
      if (!chainInstance) {
        throw new AIEngineError(`Chain not found: ${chainId}`, 'CHAIN_NOT_FOUND');
      }

      // Update last used timestamp
      chainInstance.lastUsed = Date.now();

      // Validate security context
      this.validateSecurityContext(context, chainInstance.config);

      // Execute the chain
      const result = await chainInstance.chain.call(input);
      const executionTime = Date.now() - startTime;

      const chainResult: ChainResult = {
        output: result.text || result.response || result.output || JSON.stringify(result),
        sourceDocuments: result.sourceDocuments,
        intermediateSteps: result.intermediateSteps,
        metadata: {
          chainId,
          executionTime,
          tokenUsage: this.extractTokenUsage(result),
          confidence: this.calculateConfidence(result)
        }
      };

      this.emit('chain:executed', { chainId, executionTime, inputLength: JSON.stringify(input).length });
      return chainResult;

    } catch (error) {
      logger.error(`Error executing chain ${chainId}:`, error);
      throw new AIEngineError(
        `Failed to execute chain: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CHAIN_EXECUTION_FAILED',
        { chainId, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Create or get conversation session
   */
  async createConversationSession(
    userId: string,
    context: SecurityContext,
    chainId?: string
  ): Promise<string> {
    const sessionId = `session-${userId}-${Date.now()}`;
    
    const memory = new ConversationBufferMemory({
      returnMessages: true,
      memoryKey: 'history',
      inputKey: 'input',
      outputKey: 'output'
    });

    const session: ConversationSession = {
      id: sessionId,
      userId,
      context,
      memory,
      history: [],
      createdAt: Date.now(),
      lastActive: Date.now()
    };

    this.sessions.set(sessionId, session);
    this.emit('session:created', { sessionId, userId });
    logger.info(`Created conversation session: ${sessionId} for user ${userId}`);

    return sessionId;
  }

  /**
   * Continue conversation in a session
   */
  async continueConversation(
    sessionId: string,
    input: string,
    chainId: string
  ): Promise<ChainResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new AIEngineError(`Session not found: ${sessionId}`, 'SESSION_NOT_FOUND');
    }

    const chainInstance = this.chains.get(chainId);
    if (!chainInstance) {
      throw new AIEngineError(`Chain not found: ${chainId}`, 'CHAIN_NOT_FOUND');
    }

    // Update session activity
    session.lastActive = Date.now();

    // Execute with conversation memory
    const result = await this.executeChain(chainId, {
      input,
      history: await session.memory.loadMemoryVariables({})
    }, session.context);

    // Update conversation history
    session.history.push({
      timestamp: new Date().toISOString(),
      input,
      output: result.output,
      chainId
    });

    // Update memory
    await session.memory.saveContext({ input }, { output: result.output });

    return result;
  }

  /**
   * Add documents to a retrieval chain's vector store
   */
  async addDocumentsToChain(
    chainId: string,
    documents: Array<{ content: string; metadata: Record<string, any> }>
  ): Promise<void> {
    const chainInstance = this.chains.get(chainId);
    if (!chainInstance) {
      throw new AIEngineError(`Chain not found: ${chainId}`, 'CHAIN_NOT_FOUND');
    }

    if (!chainInstance.vectorStore) {
      throw new AIEngineError('Chain does not have a vector store', 'NO_VECTOR_STORE');
    }

    const docs = documents.map(doc => new Document({
      pageContent: doc.content,
      metadata: doc.metadata
    }));

    await chainInstance.vectorStore.addDocuments(docs);
    this.emit('documents:added', { chainId, count: documents.length });
    logger.info(`Added ${documents.length} documents to chain ${chainId}`);
  }

  /**
   * Get chain statistics
   */
  getChainStats(chainId: string): {
    executions: number;
    avgExecutionTime: number;
    lastUsed: string;
    memorySize?: number;
    documentsCount?: number;
  } {
    const chainInstance = this.chains.get(chainId);
    if (!chainInstance) {
      throw new AIEngineError(`Chain not found: ${chainId}`, 'CHAIN_NOT_FOUND');
    }

    // These would be tracked in a real implementation
    return {
      executions: 0,
      avgExecutionTime: 0,
      lastUsed: new Date(chainInstance.lastUsed).toISOString(),
      memorySize: chainInstance.memory ? 0 : undefined,
      documentsCount: chainInstance.vectorStore ? 0 : undefined
    };
  }

  /**
   * List active chains
   */
  getActiveChains(): Array<{
    id: string;
    type: LangChainChainType;
    model: string;
    createdAt: string;
    lastUsed: string;
  }> {
    return Array.from(this.chains.values()).map(chain => ({
      id: chain.id,
      type: chain.type,
      model: chain.config.model,
      createdAt: new Date(chain.createdAt).toISOString(),
      lastUsed: new Date(chain.lastUsed).toISOString()
    }));
  }

  /**
   * Delete a chain
   */
  async deleteChain(chainId: string): Promise<void> {
    const chainInstance = this.chains.get(chainId);
    if (!chainInstance) {
      throw new AIEngineError(`Chain not found: ${chainId}`, 'CHAIN_NOT_FOUND');
    }

    this.chains.delete(chainId);
    this.emit('chain:deleted', { chainId });
    logger.info(`Deleted chain: ${chainId}`);
  }

  private async createLLMChain(model: BaseLanguageModel, config: ChainConfig): Promise<LLMChain> {
    const prompt = PromptTemplate.fromTemplate(
      config.prompt || 'Answer the following question: {input}'
    );

    return new LLMChain({
      llm: model,
      prompt,
      callbacks: this.createCallbackManager(config)
    });
  }

  private async createConversationChain(
    model: BaseLanguageModel,
    config: ChainConfig
  ): Promise<{ chain: ConversationChain; memory: BufferMemory }> {
    const memory = new BufferMemory();
    
    const chain = new ConversationChain({
      llm: model,
      memory,
      callbacks: this.createCallbackManager(config)
    });

    return { chain, memory };
  }

  private async createRetrievalQAChain(
    model: BaseLanguageModel,
    config: ChainConfig
  ): Promise<{ chain: RetrievalQAChain; vectorStore: MemoryVectorStore }> {
    // Initialize embeddings
    const embeddings = new OpenAIEmbeddings({
      apiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-ada-002'
    });

    const vectorStore = new MemoryVectorStore(embeddings);
    
    const chain = RetrievalQAChain.fromLLM(model, vectorStore.asRetriever(), {
      returnSourceDocuments: true,
      callbacks: this.createCallbackManager(config)
    });

    return { chain, vectorStore };
  }

  private async createMapReduceChain(model: BaseLanguageModel, config: ChainConfig): Promise<any> {
    // This would implement a map-reduce chain for document processing
    // For now, return a basic LLM chain
    return this.createLLMChain(model, config);
  }

  private async createStuffChain(model: BaseLanguageModel, config: ChainConfig): Promise<StuffDocumentsChain> {
    const prompt = PromptTemplate.fromTemplate(
      config.prompt || 'Summarize the following documents:\n\n{text}\n\nSummary:'
    );

    return new StuffDocumentsChain({
      llmChain: new LLMChain({
        llm: model,
        prompt
      }),
      documentVariableName: 'text',
      callbacks: this.createCallbackManager(config)
    });
  }

  private async createRefineChain(model: BaseLanguageModel, config: ChainConfig): Promise<any> {
    // This would implement a refine chain for iterative document processing
    // For now, return a basic LLM chain
    return this.createLLMChain(model, config);
  }

  private createCallbackManager(config: ChainConfig): CallbackManager | undefined {
    if (!config.callbacks || config.callbacks.length === 0) {
      return undefined;
    }

    // This would create actual callback handlers
    return CallbackManager.fromHandlers({});
  }

  private validateSecurityContext(context: SecurityContext | undefined, config: ChainConfig): void {
    if (!context) return;

    // Ensure private data doesn't go to cloud models
    if (context.privacyLevel === 'private') {
      const model = this.models.get(config.model);
      // Check if model is cloud-based (this would need to be tracked)
      // For now, assume model ID contains provider info
      if (config.model.includes('openai') || config.model.includes('claude')) {
        throw new AIEngineError(
          'Private data cannot be processed by cloud models',
          'PRIVACY_VIOLATION',
          { privacyLevel: context.privacyLevel, model: config.model }
        );
      }
    }
  }

  private extractTokenUsage(result: any): number | undefined {
    // Extract token usage from LangChain result
    return result.tokenUsage?.totalTokens || result.usage?.totalTokens;
  }

  private calculateConfidence(result: any): number | undefined {
    // Calculate confidence based on result characteristics
    if (result.sourceDocuments && result.sourceDocuments.length > 0) {
      // For RAG chains, confidence can be based on source document relevance
      return 0.8;
    }
    
    // Default confidence for other chain types
    return 0.7;
  }

  private setupCleanupRoutines(): void {
    // Clean up inactive chains every hour
    setInterval(() => {
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      for (const [chainId, chain] of this.chains) {
        if (now - chain.lastUsed > maxAge) {
          this.chains.delete(chainId);
          logger.info(`Cleaned up inactive chain: ${chainId}`);
        }
      }
    }, 60 * 60 * 1000);

    // Clean up inactive sessions every 30 minutes
    setInterval(() => {
      const now = Date.now();
      const maxAge = 2 * 60 * 60 * 1000; // 2 hours

      for (const [sessionId, session] of this.sessions) {
        if (now - session.lastActive > maxAge) {
          this.sessions.delete(sessionId);
          logger.info(`Cleaned up inactive session: ${sessionId}`);
        }
      }
    }, 30 * 60 * 1000);
  }
}

export default LangChainOrchestrator;