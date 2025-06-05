"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudAIProvider = void 0;
const events_1 = require("events");
const openai_1 = require("openai");
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const ai_types_1 = require("../types/ai.types");
const logger_1 = require("../utils/logger");
/**
 * Cloud AI Provider for Claude, GPT-4, and other cloud AI services
 */
class CloudAIProvider extends events_1.EventEmitter {
    constructor() {
        super();
        this.clients = new Map();
        this.modelConfigs = new Map();
        this.rateLimits = new Map();
        this.healthStatus = new Map();
        this.setupRateLimitReset();
    }
    /**
     * Register a cloud AI provider
     */
    async registerProvider(config) {
        try {
            if (!config.apiKey) {
                throw new ai_types_1.AIEngineError('API key required for cloud AI provider', 'MISSING_API_KEY');
            }
            const client = {};
            if (config.provider === 'openai') {
                client.openai = new openai_1.OpenAI({
                    apiKey: config.apiKey,
                    baseURL: config.endpoint
                });
                // Test connection
                await this.testOpenAIConnection(client.openai);
            }
            else if (config.provider === 'claude') {
                client.anthropic = new sdk_1.default({
                    apiKey: config.apiKey,
                    baseURL: config.endpoint
                });
                // Test connection
                await this.testAnthropicConnection(client.anthropic);
            }
            else {
                throw new ai_types_1.AIEngineError(`Unsupported cloud provider: ${config.provider}`, 'UNSUPPORTED_PROVIDER');
            }
            this.clients.set(config.id, client);
            this.modelConfigs.set(config.id, config);
            this.healthStatus.set(config.id, true);
            this.rateLimits.set(config.id, { requests: 0, resetTime: Date.now() + 60000 });
            this.emit('provider:registered', config);
            logger_1.logger.info(`Registered cloud AI provider: ${config.id} (${config.provider})`);
        }
        catch (error) {
            logger_1.logger.error(`Failed to register cloud AI provider ${config.id}:`, error);
            throw error;
        }
    }
    /**
     * Generate response using cloud AI
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
            // Check rate limits
            this.checkRateLimit(modelId);
            // Validate privacy requirements
            this.validatePrivacy(context, config);
            let response;
            if (config.provider === 'openai' && client.openai) {
                response = await this.generateWithOpenAI(client.openai, config, prompt, options);
            }
            else if (config.provider === 'claude' && client.anthropic) {
                response = await this.generateWithClaude(client.anthropic, config, prompt, options);
            }
            else {
                throw new ai_types_1.AIEngineError(`Unsupported provider: ${config.provider}`, 'UNSUPPORTED_PROVIDER');
            }
            const processingTime = Date.now() - startTime;
            // Update rate limit counter
            this.updateRateLimit(modelId);
            const aiResponse = {
                id: `${modelId}-${Date.now()}`,
                timestamp: new Date().toISOString(),
                model: config.model,
                input: prompt,
                output: response.content,
                metadata: {
                    tokensUsed: response.usage.totalTokens,
                    processingTime,
                    confidence: response.confidence,
                    cost: response.usage.cost
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
     * Stream response from cloud AI
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
        // Check rate limits
        this.checkRateLimit(modelId);
        // Validate privacy requirements
        this.validatePrivacy(context, config);
        if (config.provider === 'openai' && client.openai) {
            yield* this.streamOpenAIResponse(client.openai, config, prompt, options);
        }
        else if (config.provider === 'claude' && client.anthropic) {
            yield* this.streamClaudeResponse(client.anthropic, config, prompt, options);
        }
        else {
            throw new ai_types_1.AIEngineError(`Streaming not supported for provider: ${config.provider}`, 'UNSUPPORTED_OPERATION');
        }
        // Update rate limit counter
        this.updateRateLimit(modelId);
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
                if (config.provider === 'openai' && client.openai) {
                    await client.openai.models.list();
                }
                else if (config.provider === 'claude' && client.anthropic) {
                    // Anthropic doesn't have a models list endpoint, so we'll use a minimal message
                    await client.anthropic.messages.create({
                        model: 'claude-3-haiku-20240307',
                        max_tokens: 1,
                        messages: [{ role: 'user', content: 'test' }]
                    });
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
            if (config.provider === 'openai' && client.openai) {
                const models = await client.openai.models.list();
                return models.data.map(model => model.id);
            }
            else if (config.provider === 'claude') {
                // Return known Claude models
                return [
                    'claude-3-opus-20240229',
                    'claude-3-sonnet-20240229',
                    'claude-3-haiku-20240307',
                    'claude-3-5-sonnet-20241022'
                ];
            }
            return [];
        }
        catch (error) {
            logger_1.logger.error(`Error getting available models for ${providerId}:`, error);
            return [];
        }
    }
    /**
     * Get usage statistics for a provider
     */
    getUsageStats(providerId) {
        const rateLimit = this.rateLimits.get(providerId);
        if (!rateLimit) {
            return null;
        }
        // These would be tracked in a real implementation
        return {
            totalRequests: 0,
            totalTokens: 0,
            totalCost: 0,
            rateLimit: {
                current: rateLimit.requests,
                limit: 1000, // Default rate limit
                resetTime: rateLimit.resetTime
            }
        };
    }
    async testOpenAIConnection(client) {
        try {
            await client.models.list();
        }
        catch (error) {
            throw new ai_types_1.AIServiceUnavailableError('openai', `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async testAnthropicConnection(client) {
        try {
            // Test with minimal request
            await client.messages.create({
                model: 'claude-3-haiku-20240307',
                max_tokens: 1,
                messages: [{ role: 'user', content: 'test' }]
            });
        }
        catch (error) {
            throw new ai_types_1.AIServiceUnavailableError('claude', `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async generateWithOpenAI(client, config, prompt, options) {
        const messages = [];
        if (options?.system) {
            messages.push({ role: 'system', content: options.system });
        }
        messages.push({ role: 'user', content: prompt });
        const response = await client.chat.completions.create({
            model: config.model,
            messages,
            temperature: options?.temperature || config.temperature,
            max_tokens: options?.maxTokens || config.maxTokens,
            stream: false
        });
        const usage = response.usage;
        const cost = this.calculateOpenAICost(config.model, usage);
        return {
            content: response.choices[0].message.content || '',
            usage: {
                promptTokens: usage?.prompt_tokens || 0,
                completionTokens: usage?.completion_tokens || 0,
                totalTokens: usage?.total_tokens || 0,
                cost
            },
            confidence: 0.9 // High confidence for GPT models
        };
    }
    async generateWithClaude(client, config, prompt, options) {
        const requestData = {
            model: config.model,
            max_tokens: options?.maxTokens || config.maxTokens,
            messages: [{ role: 'user', content: prompt }]
        };
        if (options?.system) {
            requestData.system = options.system;
        }
        if (options?.temperature !== undefined) {
            requestData.temperature = options.temperature;
        }
        else if (config.temperature !== undefined) {
            requestData.temperature = config.temperature;
        }
        const response = await client.messages.create(requestData);
        const inputTokens = response.usage.input_tokens;
        const outputTokens = response.usage.output_tokens;
        const cost = this.calculateClaudeCost(config.model, inputTokens, outputTokens);
        return {
            content: response.content[0].type === 'text' ? response.content[0].text : '',
            usage: {
                promptTokens: inputTokens,
                completionTokens: outputTokens,
                totalTokens: inputTokens + outputTokens,
                cost
            },
            confidence: 0.95 // Very high confidence for Claude
        };
    }
    async *streamOpenAIResponse(client, config, prompt, options) {
        const messages = [];
        if (options?.system) {
            messages.push({ role: 'system', content: options.system });
        }
        messages.push({ role: 'user', content: prompt });
        const stream = await client.chat.completions.create({
            model: config.model,
            messages,
            temperature: options?.temperature || config.temperature,
            max_tokens: options?.maxTokens || config.maxTokens,
            stream: true
        });
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            const done = chunk.choices[0]?.finish_reason !== null;
            yield { chunk: content, done };
            if (done)
                break;
        }
    }
    async *streamClaudeResponse(client, config, prompt, options) {
        const requestData = {
            model: config.model,
            max_tokens: options?.maxTokens || config.maxTokens,
            messages: [{ role: 'user', content: prompt }],
            stream: true
        };
        if (options?.system) {
            requestData.system = options.system;
        }
        if (options?.temperature !== undefined) {
            requestData.temperature = options.temperature;
        }
        else if (config.temperature !== undefined) {
            requestData.temperature = config.temperature;
        }
        const stream = await client.messages.create(requestData);
        for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                yield { chunk: chunk.delta.text, done: false };
            }
            else if (chunk.type === 'message_stop') {
                yield { chunk: '', done: true };
                break;
            }
        }
    }
    calculateOpenAICost(model, usage) {
        // OpenAI pricing (as of 2024)
        const pricing = {
            'gpt-4o': { input: 0.005, output: 0.015 },
            'gpt-4-turbo': { input: 0.01, output: 0.03 },
            'gpt-4': { input: 0.03, output: 0.06 },
            'gpt-3.5-turbo': { input: 0.0015, output: 0.002 }
        };
        const modelPricing = pricing[model] || pricing['gpt-3.5-turbo'];
        const inputCost = (usage?.prompt_tokens || 0) * modelPricing.input / 1000;
        const outputCost = (usage?.completion_tokens || 0) * modelPricing.output / 1000;
        return inputCost + outputCost;
    }
    calculateClaudeCost(model, inputTokens, outputTokens) {
        // Claude pricing (as of 2024)
        const pricing = {
            'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
            'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
            'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
            'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 }
        };
        const modelPricing = pricing[model] || pricing['claude-3-haiku-20240307'];
        const inputCost = inputTokens * modelPricing.input / 1000;
        const outputCost = outputTokens * modelPricing.output / 1000;
        return inputCost + outputCost;
    }
    validatePrivacy(context, config) {
        if (!context)
            return;
        // Ensure cloud providers can't access private data
        if (context.privacyLevel === 'private' && config.type === 'cloud') {
            throw new ai_types_1.AIEngineError('Private data cannot be processed by cloud AI providers', 'PRIVACY_VIOLATION', { privacyLevel: context.privacyLevel, providerType: config.type });
        }
        // Check classification restrictions
        if (context.classification === 'secret' && config.type === 'cloud') {
            throw new ai_types_1.AIEngineError('Secret classified data cannot be processed by cloud AI providers', 'CLASSIFICATION_VIOLATION', { classification: context.classification, providerType: config.type });
        }
    }
    checkRateLimit(modelId) {
        const rateLimit = this.rateLimits.get(modelId);
        if (!rateLimit)
            return;
        if (Date.now() > rateLimit.resetTime) {
            // Reset rate limit
            this.rateLimits.set(modelId, { requests: 0, resetTime: Date.now() + 60000 });
            return;
        }
        if (rateLimit.requests >= 1000) { // Default rate limit
            throw new ai_types_1.AIEngineError('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', { resetTime: rateLimit.resetTime });
        }
    }
    updateRateLimit(modelId) {
        const rateLimit = this.rateLimits.get(modelId);
        if (rateLimit) {
            rateLimit.requests++;
        }
    }
    setupRateLimitReset() {
        // Reset rate limits every minute
        setInterval(() => {
            const now = Date.now();
            for (const [modelId, rateLimit] of this.rateLimits) {
                if (now > rateLimit.resetTime) {
                    this.rateLimits.set(modelId, { requests: 0, resetTime: now + 60000 });
                }
            }
        }, 60000);
    }
}
exports.CloudAIProvider = CloudAIProvider;
exports.default = CloudAIProvider;
//# sourceMappingURL=cloud-ai-provider.js.map