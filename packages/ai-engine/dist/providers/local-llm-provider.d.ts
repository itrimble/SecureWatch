import { EventEmitter } from 'events';
import { AIModelConfig, AIResponse, SecurityContext } from '../types/ai.types';
/**
 * Local LLM Provider for Ollama and LM Studio integration
 */
export declare class LocalLLMProvider extends EventEmitter {
    private clients;
    private modelConfigs;
    private healthStatus;
    constructor();
    /**
     * Register a local LLM provider instance
     */
    registerProvider(config: AIModelConfig): Promise<void>;
    /**
     * Generate response using local LLM
     */
    generateResponse(modelId: string, prompt: string, context?: SecurityContext, options?: {
        temperature?: number;
        maxTokens?: number;
        system?: string;
        stream?: boolean;
    }): Promise<AIResponse>;
    /**
     * Get available models from provider
     */
    getAvailableModels(providerId: string): Promise<string[]>;
    /**
     * Check health of all registered providers
     */
    checkHealth(): Promise<Map<string, boolean>>;
    /**
     * Get provider status
     */
    getProviderStatus(providerId: string): {
        id: string;
        config: AIModelConfig;
        healthy: boolean;
        models?: string[];
    } | null;
    private testConnection;
    private generateWithOllama;
    private generateWithLMStudio;
    private getOllamaModels;
    private getLMStudioModels;
    private calculateCost;
    private setupHealthMonitoring;
    /**
     * Stream response from local LLM
     */
    streamResponse(modelId: string, prompt: string, context?: SecurityContext, options?: {
        temperature?: number;
        maxTokens?: number;
        system?: string;
    }): AsyncGenerator<{
        chunk: string;
        done: boolean;
    }>;
    private streamOllamaResponse;
    private streamLMStudioResponse;
}
export default LocalLLMProvider;
//# sourceMappingURL=local-llm-provider.d.ts.map