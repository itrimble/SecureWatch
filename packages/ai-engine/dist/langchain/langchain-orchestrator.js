"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LangChainOrchestrator = void 0;
const events_1 = require("events");
const openai_1 = require("@langchain/openai");
const anthropic_1 = require("@langchain/anthropic");
const ollama_1 = require("@langchain/community/llms/ollama");
const prompts_1 = require("@langchain/core/prompts");
const chains_1 = require("langchain/chains");
const chains_2 = require("langchain/chains");
const chains_3 = require("langchain/chains");
const chains_4 = require("langchain/chains");
const memory_1 = require("langchain/vectorstores/memory");
const openai_2 = require("@langchain/openai");
const documents_1 = require("@langchain/core/documents");
const memory_2 = require("langchain/memory");
const manager_1 = require("@langchain/core/callbacks/manager");
const ai_types_1 = require("../types/ai.types");
const logger_1 = require("../utils/logger");
/**
 * LangChain Orchestrator for LLM Chain Management
 * Provides high-level orchestration of LangChain workflows for security analytics
 */
class LangChainOrchestrator extends events_1.EventEmitter {
    constructor(localProvider, cloudProvider) {
        super();
        this.chains = new Map();
        this.sessions = new Map();
        this.models = new Map();
        this.embeddings = new Map();
        this.localProvider = localProvider;
        this.cloudProvider = cloudProvider;
        this.setupCleanupRoutines();
    }
    /**
     * Initialize LLM models for LangChain
     */
    async initializeModel(config) {
        try {
            let model;
            if (config.type === 'cloud') {
                if (config.provider === 'openai') {
                    model = new openai_1.ChatOpenAI({
                        apiKey: config.apiKey,
                        modelName: config.model,
                        temperature: config.temperature,
                        maxTokens: config.maxTokens,
                        configuration: {
                            baseURL: config.endpoint
                        }
                    });
                }
                else if (config.provider === 'claude') {
                    model = new anthropic_1.ChatAnthropic({
                        apiKey: config.apiKey,
                        modelName: config.model,
                        temperature: config.temperature,
                        maxTokens: config.maxTokens,
                        clientOptions: {
                            baseURL: config.endpoint
                        }
                    });
                }
                else {
                    throw new ai_types_1.AIEngineError(`Unsupported cloud provider: ${config.provider}`, 'UNSUPPORTED_PROVIDER');
                }
            }
            else if (config.type === 'local') {
                if (config.provider === 'ollama') {
                    model = new ollama_1.Ollama({
                        baseUrl: config.endpoint || 'http://localhost:11434',
                        model: config.model,
                        temperature: config.temperature,
                        numPredict: config.maxTokens
                    });
                }
                else {
                    throw new ai_types_1.AIEngineError(`Unsupported local provider: ${config.provider}`, 'UNSUPPORTED_PROVIDER');
                }
            }
            else {
                throw new ai_types_1.AIEngineError(`Unsupported model type: ${config.type}`, 'UNSUPPORTED_MODEL_TYPE');
            }
            this.models.set(config.id, model);
            this.emit('model:initialized', config);
            logger_1.logger.info(`Initialized LangChain model: ${config.id} (${config.provider})`);
        }
        catch (error) {
            logger_1.logger.error(`Error initializing LangChain model ${config.id}:`, error);
            throw new ai_types_1.AIEngineError(`Failed to initialize LangChain model: ${error instanceof Error ? error.message : 'Unknown error'}`, 'MODEL_INITIALIZATION_FAILED', { modelId: config.id, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    /**
     * Create a new chain instance
     */
    async createChain(config) {
        try {
            const chainId = `chain-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
            const model = this.models.get(config.model);
            if (!model) {
                throw new ai_types_1.AIEngineError(`Model not found: ${config.model}`, 'MODEL_NOT_FOUND');
            }
            let chain;
            let memory;
            let vectorStore;
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
                    throw new ai_types_1.AIEngineError(`Unsupported chain type: ${config.type}`, 'UNSUPPORTED_CHAIN_TYPE');
            }
            const chainInstance = {
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
            logger_1.logger.info(`Created LangChain instance: ${chainId} (${config.type})`);
            return chainId;
        }
        catch (error) {
            logger_1.logger.error('Error creating LangChain chain:', error);
            throw new ai_types_1.AIEngineError(`Failed to create chain: ${error instanceof Error ? error.message : 'Unknown error'}`, 'CHAIN_CREATION_FAILED', { chainType: config.type, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    /**
     * Execute a chain with input
     */
    async executeChain(chainId, input, context) {
        const startTime = Date.now();
        try {
            const chainInstance = this.chains.get(chainId);
            if (!chainInstance) {
                throw new ai_types_1.AIEngineError(`Chain not found: ${chainId}`, 'CHAIN_NOT_FOUND');
            }
            // Update last used timestamp
            chainInstance.lastUsed = Date.now();
            // Validate security context
            this.validateSecurityContext(context, chainInstance.config);
            // Execute the chain
            const result = await chainInstance.chain.call(input);
            const executionTime = Date.now() - startTime;
            const chainResult = {
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
        }
        catch (error) {
            logger_1.logger.error(`Error executing chain ${chainId}:`, error);
            throw new ai_types_1.AIEngineError(`Failed to execute chain: ${error instanceof Error ? error.message : 'Unknown error'}`, 'CHAIN_EXECUTION_FAILED', { chainId, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    /**
     * Create or get conversation session
     */
    async createConversationSession(userId, context, chainId) {
        const sessionId = `session-${userId}-${Date.now()}`;
        const memory = new memory_2.BufferMemory({
            returnMessages: true,
            memoryKey: 'history',
            inputKey: 'input',
            outputKey: 'output'
        });
        const session = {
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
        logger_1.logger.info(`Created conversation session: ${sessionId} for user ${userId}`);
        return sessionId;
    }
    /**
     * Continue conversation in a session
     */
    async continueConversation(sessionId, input, chainId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new ai_types_1.AIEngineError(`Session not found: ${sessionId}`, 'SESSION_NOT_FOUND');
        }
        const chainInstance = this.chains.get(chainId);
        if (!chainInstance) {
            throw new ai_types_1.AIEngineError(`Chain not found: ${chainId}`, 'CHAIN_NOT_FOUND');
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
    async addDocumentsToChain(chainId, documents) {
        const chainInstance = this.chains.get(chainId);
        if (!chainInstance) {
            throw new ai_types_1.AIEngineError(`Chain not found: ${chainId}`, 'CHAIN_NOT_FOUND');
        }
        if (!chainInstance.vectorStore) {
            throw new ai_types_1.AIEngineError('Chain does not have a vector store', 'NO_VECTOR_STORE');
        }
        const docs = documents.map(doc => new documents_1.Document({
            pageContent: doc.content,
            metadata: doc.metadata
        }));
        await chainInstance.vectorStore.addDocuments(docs);
        this.emit('documents:added', { chainId, count: documents.length });
        logger_1.logger.info(`Added ${documents.length} documents to chain ${chainId}`);
    }
    /**
     * Get chain statistics
     */
    getChainStats(chainId) {
        const chainInstance = this.chains.get(chainId);
        if (!chainInstance) {
            throw new ai_types_1.AIEngineError(`Chain not found: ${chainId}`, 'CHAIN_NOT_FOUND');
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
    getActiveChains() {
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
    async deleteChain(chainId) {
        const chainInstance = this.chains.get(chainId);
        if (!chainInstance) {
            throw new ai_types_1.AIEngineError(`Chain not found: ${chainId}`, 'CHAIN_NOT_FOUND');
        }
        this.chains.delete(chainId);
        this.emit('chain:deleted', { chainId });
        logger_1.logger.info(`Deleted chain: ${chainId}`);
    }
    async createLLMChain(model, config) {
        const prompt = prompts_1.PromptTemplate.fromTemplate(config.prompt || 'Answer the following question: {input}');
        return new chains_1.LLMChain({
            llm: model,
            prompt,
            callbacks: this.createCallbackManager(config)
        });
    }
    async createConversationChain(model, config) {
        const memory = new memory_2.BufferMemory();
        const chain = new chains_2.ConversationChain({
            llm: model,
            memory,
            callbacks: this.createCallbackManager(config)
        });
        return { chain, memory };
    }
    async createRetrievalQAChain(model, config) {
        // Initialize embeddings
        const embeddings = new openai_2.OpenAIEmbeddings({
            apiKey: process.env.OPENAI_API_KEY,
            modelName: 'text-embedding-ada-002'
        });
        const vectorStore = new memory_1.MemoryVectorStore(embeddings);
        const chain = chains_3.RetrievalQAChain.fromLLM(model, vectorStore.asRetriever(), {
            returnSourceDocuments: true,
            callbacks: this.createCallbackManager(config)
        });
        return { chain, vectorStore };
    }
    async createMapReduceChain(model, config) {
        // This would implement a map-reduce chain for document processing
        // For now, return a basic LLM chain
        return this.createLLMChain(model, config);
    }
    async createStuffChain(model, config) {
        const prompt = prompts_1.PromptTemplate.fromTemplate(config.prompt || 'Summarize the following documents:\n\n{text}\n\nSummary:');
        return new chains_4.StuffDocumentsChain({
            llmChain: new chains_1.LLMChain({
                llm: model,
                prompt
            }),
            documentVariableName: 'text',
            callbacks: this.createCallbackManager(config)
        });
    }
    async createRefineChain(model, config) {
        // This would implement a refine chain for iterative document processing
        // For now, return a basic LLM chain
        return this.createLLMChain(model, config);
    }
    createCallbackManager(config) {
        if (!config.callbacks || config.callbacks.length === 0) {
            return undefined;
        }
        // This would create actual callback handlers
        return manager_1.CallbackManager.fromHandlers({});
    }
    validateSecurityContext(context, config) {
        if (!context)
            return;
        // Ensure private data doesn't go to cloud models
        if (context.privacyLevel === 'private') {
            const model = this.models.get(config.model);
            // Check if model is cloud-based (this would need to be tracked)
            // For now, assume model ID contains provider info
            if (config.model.includes('openai') || config.model.includes('claude')) {
                throw new ai_types_1.AIEngineError('Private data cannot be processed by cloud models', 'PRIVACY_VIOLATION', { privacyLevel: context.privacyLevel, model: config.model });
            }
        }
    }
    extractTokenUsage(result) {
        // Extract token usage from LangChain result
        return result.tokenUsage?.totalTokens || result.usage?.totalTokens;
    }
    calculateConfidence(result) {
        // Calculate confidence based on result characteristics
        if (result.sourceDocuments && result.sourceDocuments.length > 0) {
            // For RAG chains, confidence can be based on source document relevance
            return 0.8;
        }
        // Default confidence for other chain types
        return 0.7;
    }
    setupCleanupRoutines() {
        // Clean up inactive chains every hour
        setInterval(() => {
            const now = Date.now();
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours
            for (const [chainId, chain] of this.chains) {
                if (now - chain.lastUsed > maxAge) {
                    this.chains.delete(chainId);
                    logger_1.logger.info(`Cleaned up inactive chain: ${chainId}`);
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
                    logger_1.logger.info(`Cleaned up inactive session: ${sessionId}`);
                }
            }
        }, 30 * 60 * 1000);
    }
}
exports.LangChainOrchestrator = LangChainOrchestrator;
exports.default = LangChainOrchestrator;
//# sourceMappingURL=langchain-orchestrator.js.map