"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalLLMProvider = void 0;
const events_1 = require("events");
const axios_1 = __importDefault(require("axios"));
const ai_types_1 = require("../types/ai.types");
const logger_1 = require("../utils/logger");
/**
 * Local LLM Provider for Ollama and LM Studio integration
 */
class LocalLLMProvider extends events_1.EventEmitter {
    constructor() {
        super();
        this.clients = new Map();
        this.modelConfigs = new Map();
        this.healthStatus = new Map();
        this.setupHealthMonitoring();
    }
    /**
     * Register a local LLM provider instance
     */
    async registerProvider(config) {
        try {
            if (!config.endpoint) {
                throw new ai_types_1.AIEngineError('Endpoint required for local LLM provider', 'MISSING_ENDPOINT');
            }
            const client = axios_1.default.create({
                baseURL: config.endpoint,
                timeout: 30000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            // Test connection
            await this.testConnection(client, config);
            this.clients.set(config.id, client);
            this.modelConfigs.set(config.id, config);
            this.healthStatus.set(config.id, true);
            this.emit('provider:registered', config);
            logger_1.logger.info(`Registered local LLM provider: ${config.id} (${config.provider})`);
        }
        catch (error) {
            logger_1.logger.error(`Failed to register local LLM provider ${config.id}:`, error);
            throw error;
        }
    }
    /**
     * Generate response using local LLM
     */
    async generateResponse(modelId, prompt, context, options) {
        const startTime = Date.now();
        try {
            const config = this.modelConfigs.get(modelId);
            if (!config) {
                throw new ai_types_1.AIEngineError(`Model configuration not found: ${modelId}`, 'MODEL_NOT_FOUND');
            }
            const client = this.clients.get(modelId);
            if (!client) {
                throw new ai_types_1.AIEngineError(`Client not found for model: ${modelId}`, 'CLIENT_NOT_FOUND');
            }
            if (!this.healthStatus.get(modelId)) {
                throw new ai_types_1.AIServiceUnavailableError(config.provider, 'Service is unhealthy');
            }
            let response;
            if (config.provider === 'ollama') {
                response = await this.generateWithOllama(client, config, prompt, options);
            }
            else if (config.provider === 'lmstudio') {
                response = await this.generateWithLMStudio(client, config, prompt, options);
            }
            else {
                throw new ai_types_1.AIEngineError(`Unsupported provider: ${config.provider}`, 'UNSUPPORTED_PROVIDER');
            }
            const processingTime = Date.now() - startTime;
            const aiResponse = {
                id: `${modelId}-${Date.now()}`,
                timestamp: new Date().toISOString(),
                model: config.model,
                input: prompt,
                output: response.content,
                metadata: {
                    tokensUsed: response.tokens || 0,
                    processingTime,
                    confidence: response.confidence,
                    cost: this.calculateCost(config, response.tokens || 0)
                },
                context
            };
            this.emit('response:generated', aiResponse);
            return aiResponse;
        }
        catch (error) {
            logger_1.logger.error(`Error generating response with model ${modelId}:`, error);
            if (error instanceof ai_types_1.AIEngineError) {
                throw error;
            }
            throw new ai_types_1.AIEngineError(`Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`, 'GENERATION_FAILED', { modelId, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    /**
     * Get available models from provider
     */
    async getAvailableModels(providerId) {
        try {
            const config = this.modelConfigs.get(providerId);
            if (!config) {
                throw new ai_types_1.AIEngineError(`Provider not found: ${providerId}`, 'PROVIDER_NOT_FOUND');
            }
            const client = this.clients.get(providerId);
            if (!client) {
                throw new ai_types_1.AIEngineError(`Client not found: ${providerId}`, 'CLIENT_NOT_FOUND');
            }
            if (config.provider === 'ollama') {
                return await this.getOllamaModels(client);
            }
            else if (config.provider === 'lmstudio') {
                return await this.getLMStudioModels(client);
            }
            return [];
        }
        catch (error) {
            logger_1.logger.error(`Error getting available models for ${providerId}:`, error);
            return [];
        }
    }
    /**
     * Check health of all registered providers
     */
    async checkHealth() {
        const healthResults = new Map();
        for (const [providerId, client] of this.clients) {
            try {
                const config = this.modelConfigs.get(providerId);
                if (!config) {
                    healthResults.set(providerId, false);
                    continue;
                }
                if (config.provider === 'ollama') {
                    await client.get('/api/tags', { timeout: 5000 });
                }
                else if (config.provider === 'lmstudio') {
                    await client.get('/v1/models', { timeout: 5000 });
                }
                healthResults.set(providerId, true);
                this.healthStatus.set(providerId, true);
            }
            catch (error) {
                healthResults.set(providerId, false);
                this.healthStatus.set(providerId, false);
                logger_1.logger.warn(`Health check failed for provider ${providerId}:`, error);
            }
        }
        return healthResults;
    }
    /**
     * Get provider status
     */
    getProviderStatus(providerId) {
        const config = this.modelConfigs.get(providerId);
        if (!config) {
            return null;
        }
        return {
            id: providerId,
            config,
            healthy: this.healthStatus.get(providerId) || false
        };
    }
    async testConnection(client, config) {
        try {
            if (config.provider === 'ollama') {
                await client.get('/api/tags', { timeout: 10000 });
            }
            else if (config.provider === 'lmstudio') {
                await client.get('/v1/models', { timeout: 10000 });
            }
        }
        catch (error) {
            throw new ai_types_1.AIServiceUnavailableError(config.provider, `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async generateWithOllama(client, config, prompt, options) {
        const requestData = {
            model: config.model,
            prompt,
            stream: false,
            options: {
                temperature: options?.temperature || config.temperature,
                num_predict: options?.maxTokens || config.maxTokens
            }
        };
        if (options?.system) {
            requestData.system = options.system;
        }
        const response = await client.post('/api/generate', requestData);
        return {
            content: response.data.message.content,
            tokens: (response.data.prompt_eval_count || 0) + (response.data.eval_count || 0),
            confidence: 0.8 // Placeholder confidence
        };
    }
    async generateWithLMStudio(client, config, prompt, options) {
        const messages = [];
        if (options?.system) {
            messages.push({ role: 'system', content: options.system });
        }
        messages.push({ role: 'user', content: prompt });
        const requestData = {
            model: config.model,
            messages,
            temperature: options?.temperature || config.temperature,
            max_tokens: options?.maxTokens || config.maxTokens,
            stream: false
        };
        const response = await client.post('/v1/chat/completions', requestData);
        return {
            content: response.data.choices[0].message.content,
            tokens: response.data.usage?.total_tokens || 0,
            confidence: 0.8 // Placeholder confidence
        };
    }
    async getOllamaModels(client) {
        try {
            const response = await client.get('/api/tags');
            return response.data.models.map(model => model.name);
        }
        catch (error) {
            logger_1.logger.error('Error fetching Ollama models:', error);
            return [];
        }
    }
    async getLMStudioModels(client) {
        try {
            const response = await client.get('/v1/models');
            return response.data.data.map(model => model.id);
        }
        catch (error) {
            logger_1.logger.error('Error fetching LM Studio models:', error);
            return [];
        }
    }
    calculateCost(config, tokens) {
        if (!config.costPerToken) {
            return undefined;
        }
        return tokens * config.costPerToken;
    }
    setupHealthMonitoring() {
        // Check health every 5 minutes
        setInterval(() => {
            this.checkHealth().catch(error => {
                logger_1.logger.error('Error during health monitoring:', error);
            });
        }, 5 * 60 * 1000);
    }
    /**
     * Stream response from local LLM
     */
    async *streamResponse(modelId, prompt, context, options) {
        const config = this.modelConfigs.get(modelId);
        if (!config) {
            throw new ai_types_1.AIEngineError(`Model configuration not found: ${modelId}`, 'MODEL_NOT_FOUND');
        }
        const client = this.clients.get(modelId);
        if (!client) {
            throw new ai_types_1.AIEngineError(`Client not found for model: ${modelId}`, 'CLIENT_NOT_FOUND');
        }
        if (config.provider === 'ollama') {
            yield* this.streamOllamaResponse(client, config, prompt, options);
        }
        else if (config.provider === 'lmstudio') {
            yield* this.streamLMStudioResponse(client, config, prompt, options);
        }
        else {
            throw new ai_types_1.AIEngineError(`Streaming not supported for provider: ${config.provider}`, 'UNSUPPORTED_OPERATION');
        }
    }
    async *streamOllamaResponse(client, config, prompt, options) {
        const requestData = {
            model: config.model,
            prompt,
            stream: true,
            options: {
                temperature: options?.temperature || config.temperature,
                num_predict: options?.maxTokens || config.maxTokens
            }
        };
        try {
            const response = await client.post('/api/generate', requestData, {
                responseType: 'stream'
            });
            for await (const chunk of response.data) {
                const lines = chunk.toString().split('\n').filter((line) => line.trim());
                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);
                        yield {
                            chunk: data.message.content,
                            done: data.done
                        };
                        if (data.done) {
                            return;
                        }
                    }
                    catch (parseError) {
                        // Skip invalid JSON lines
                        continue;
                    }
                }
            }
        }
        catch (error) {
            logger_1.logger.error('Error streaming Ollama response:', error);
            throw new ai_types_1.AIEngineError(`Failed to stream response: ${error instanceof Error ? error.message : 'Unknown error'}`, 'STREAMING_FAILED');
        }
    }
    async *streamLMStudioResponse(client, config, prompt, options) {
        const messages = [];
        if (options?.system) {
            messages.push({ role: 'system', content: options.system });
        }
        messages.push({ role: 'user', content: prompt });
        const requestData = {
            model: config.model,
            messages,
            temperature: options?.temperature || config.temperature,
            max_tokens: options?.maxTokens || config.maxTokens,
            stream: true
        };
        try {
            const response = await client.post('/v1/chat/completions', requestData, {
                responseType: 'stream'
            });
            for await (const chunk of response.data) {
                const lines = chunk.toString().split('\n').filter((line) => line.trim());
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') {
                            yield { chunk: '', done: true };
                            return;
                        }
                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices?.[0]?.delta?.content || '';
                            yield {
                                chunk: content,
                                done: false
                            };
                        }
                        catch (parseError) {
                            // Skip invalid JSON lines
                            continue;
                        }
                    }
                }
            }
        }
        catch (error) {
            logger_1.logger.error('Error streaming LM Studio response:', error);
            throw new ai_types_1.AIEngineError(`Failed to stream response: ${error instanceof Error ? error.message : 'Unknown error'}`, 'STREAMING_FAILED');
        }
    }
}
exports.LocalLLMProvider = LocalLLMProvider;
exports.default = LocalLLMProvider;
//# sourceMappingURL=local-llm-provider.js.map