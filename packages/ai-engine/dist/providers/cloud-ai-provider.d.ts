import { EventEmitter } from 'events';
import { AIModelConfig, AIResponse, SecurityContext } from '../types/ai.types';
/**
 * Cloud AI Provider for Claude, GPT-4, and other cloud AI services
 */
export declare class CloudAIProvider extends EventEmitter {
    private clients;
    private modelConfigs;
    private rateLimits;
    private healthStatus;
    constructor();
    /**
     * Register a cloud AI provider
     */
    registerProvider(config: AIModelConfig): Promise<void>;
    /**
     * Generate response using cloud AI
     */
    generateResponse(modelId: string, prompt: string, context?: SecurityContext, options?: {
        temperature?: number;
        maxTokens?: number;
        system?: string;
        stream?: boolean;
    }): Promise<AIResponse>;
    /**
     * Stream response from cloud AI
     */
    streamResponse(modelId: string, prompt: string, context?: SecurityContext, options?: {
        temperature?: number;
        maxTokens?: number;
        system?: string;
    }): AsyncGenerator<{
        chunk: string;
        done: boolean;
    }>;
    /**
     * Check health of all registered providers
     */
    checkHealth(): Promise<Map<string, boolean>>;
    /**
     * Get available models from provider
     */
    getAvailableModels(providerId: string): Promise<string[]>;
    /**
     * Get usage statistics for a provider
     */
    getUsageStats(providerId: string): {
        totalRequests: number;
        totalTokens: number;
        totalCost: number;
        rateLimit: {
            current: number;
            limit: number;
            resetTime: number;
        };
    } | null;
    private testOpenAIConnection;
    private testAnthropicConnection;
    private generateWithOpenAI;
    private generateWithClaude;
    private streamOpenAIResponse;
    private streamClaudeResponse;
    private calculateOpenAICost;
    private calculateClaudeCost;
    private validatePrivacy;
    private checkRateLimit;
    private updateRateLimit;
    private setupRateLimitReset;
}
export default CloudAIProvider;
//# sourceMappingURL=cloud-ai-provider.d.ts.map