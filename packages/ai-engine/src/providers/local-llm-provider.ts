import { EventEmitter } from 'events';
import axios, { AxiosInstance } from 'axios';
import { AIModelConfig, AIResponse, SecurityContext, AIEngineError, AIServiceUnavailableError } from '../types/ai.types';
import { logger } from '../utils/logger';

interface LocalLLMResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

interface LMStudioModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

/**
 * Local LLM Provider for Ollama and LM Studio integration
 */
export class LocalLLMProvider extends EventEmitter {
  private clients: Map<string, AxiosInstance> = new Map();
  private modelConfigs: Map<string, AIModelConfig> = new Map();
  private healthStatus: Map<string, boolean> = new Map();

  constructor() {
    super();
    this.setupHealthMonitoring();
  }

  /**
   * Register a local LLM provider instance
   */
  async registerProvider(config: AIModelConfig): Promise<void> {
    try {
      if (!config.endpoint) {
        throw new AIEngineError('Endpoint required for local LLM provider', 'MISSING_ENDPOINT');
      }

      const client = axios.create({
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
      logger.info(`Registered local LLM provider: ${config.id} (${config.provider})`);
    } catch (error) {
      logger.error(`Failed to register local LLM provider ${config.id}:`, error);
      throw error;
    }
  }

  /**
   * Generate response using local LLM
   */
  async generateResponse(
    modelId: string,
    prompt: string,
    context?: SecurityContext,
    options?: {
      temperature?: number;
      maxTokens?: number;
      system?: string;
      stream?: boolean;
    }
  ): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      const config = this.modelConfigs.get(modelId);
      if (!config) {
        throw new AIEngineError(`Model configuration not found: ${modelId}`, 'MODEL_NOT_FOUND');
      }

      const client = this.clients.get(modelId);
      if (!client) {
        throw new AIEngineError(`Client not found for model: ${modelId}`, 'CLIENT_NOT_FOUND');
      }

      if (!this.healthStatus.get(modelId)) {
        throw new AIServiceUnavailableError(config.provider, 'Service is unhealthy');
      }

      let response: any;
      
      if (config.provider === 'ollama') {
        response = await this.generateWithOllama(client, config, prompt, options);
      } else if (config.provider === 'lmstudio') {
        response = await this.generateWithLMStudio(client, config, prompt, options);
      } else {
        throw new AIEngineError(`Unsupported provider: ${config.provider}`, 'UNSUPPORTED_PROVIDER');
      }

      const processingTime = Date.now() - startTime;

      const aiResponse: AIResponse = {
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

    } catch (error) {
      logger.error(`Error generating response with model ${modelId}:`, error);
      
      if (error instanceof AIEngineError) {
        throw error;
      }
      
      throw new AIEngineError(
        `Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GENERATION_FAILED',
        { modelId, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Get available models from provider
   */
  async getAvailableModels(providerId: string): Promise<string[]> {
    try {
      const config = this.modelConfigs.get(providerId);
      if (!config) {
        throw new AIEngineError(`Provider not found: ${providerId}`, 'PROVIDER_NOT_FOUND');
      }

      const client = this.clients.get(providerId);
      if (!client) {
        throw new AIEngineError(`Client not found: ${providerId}`, 'CLIENT_NOT_FOUND');
      }

      if (config.provider === 'ollama') {
        return await this.getOllamaModels(client);
      } else if (config.provider === 'lmstudio') {
        return await this.getLMStudioModels(client);
      }

      return [];
    } catch (error) {
      logger.error(`Error getting available models for ${providerId}:`, error);
      return [];
    }
  }

  /**
   * Check health of all registered providers
   */
  async checkHealth(): Promise<Map<string, boolean>> {
    const healthResults = new Map<string, boolean>();

    for (const [providerId, client] of this.clients) {
      try {
        const config = this.modelConfigs.get(providerId);
        if (!config) {
          healthResults.set(providerId, false);
          continue;
        }

        if (config.provider === 'ollama') {
          await client.get('/api/tags', { timeout: 5000 });
        } else if (config.provider === 'lmstudio') {
          await client.get('/v1/models', { timeout: 5000 });
        }

        healthResults.set(providerId, true);
        this.healthStatus.set(providerId, true);
      } catch (error) {
        healthResults.set(providerId, false);
        this.healthStatus.set(providerId, false);
        logger.warn(`Health check failed for provider ${providerId}:`, error);
      }
    }

    return healthResults;
  }

  /**
   * Get provider status
   */
  getProviderStatus(providerId: string): {
    id: string;
    config: AIModelConfig;
    healthy: boolean;
    models?: string[];
  } | null {
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

  private async testConnection(client: AxiosInstance, config: AIModelConfig): Promise<void> {
    try {
      if (config.provider === 'ollama') {
        await client.get('/api/tags', { timeout: 10000 });
      } else if (config.provider === 'lmstudio') {
        await client.get('/v1/models', { timeout: 10000 });
      }
    } catch (error) {
      throw new AIServiceUnavailableError(
        config.provider,
        `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async generateWithOllama(
    client: AxiosInstance,
    config: AIModelConfig,
    prompt: string,
    options?: any
  ): Promise<{ content: string; tokens: number; confidence?: number }> {
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
      (requestData as any).system = options.system;
    }

    const response = await client.post<LocalLLMResponse>('/api/generate', requestData);
    
    return {
      content: response.data.message.content,
      tokens: (response.data.prompt_eval_count || 0) + (response.data.eval_count || 0),
      confidence: 0.8 // Placeholder confidence
    };
  }

  private async generateWithLMStudio(
    client: AxiosInstance,
    config: AIModelConfig,
    prompt: string,
    options?: any
  ): Promise<{ content: string; tokens: number; confidence?: number }> {
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

  private async getOllamaModels(client: AxiosInstance): Promise<string[]> {
    try {
      const response = await client.get<{ models: OllamaModel[] }>('/api/tags');
      return response.data.models.map(model => model.name);
    } catch (error) {
      logger.error('Error fetching Ollama models:', error);
      return [];
    }
  }

  private async getLMStudioModels(client: AxiosInstance): Promise<string[]> {
    try {
      const response = await client.get<{ data: LMStudioModel[] }>('/v1/models');
      return response.data.data.map(model => model.id);
    } catch (error) {
      logger.error('Error fetching LM Studio models:', error);
      return [];
    }
  }

  private calculateCost(config: AIModelConfig, tokens: number): number | undefined {
    if (!config.costPerToken) {
      return undefined;
    }
    return tokens * config.costPerToken;
  }

  private setupHealthMonitoring(): void {
    // Check health every 5 minutes
    setInterval(() => {
      this.checkHealth().catch(error => {
        logger.error('Error during health monitoring:', error);
      });
    }, 5 * 60 * 1000);
  }

  /**
   * Stream response from local LLM
   */
  async *streamResponse(
    modelId: string,
    prompt: string,
    context?: SecurityContext,
    options?: {
      temperature?: number;
      maxTokens?: number;
      system?: string;
    }
  ): AsyncGenerator<{ chunk: string; done: boolean }> {
    const config = this.modelConfigs.get(modelId);
    if (!config) {
      throw new AIEngineError(`Model configuration not found: ${modelId}`, 'MODEL_NOT_FOUND');
    }

    const client = this.clients.get(modelId);
    if (!client) {
      throw new AIEngineError(`Client not found for model: ${modelId}`, 'CLIENT_NOT_FOUND');
    }

    if (config.provider === 'ollama') {
      yield* this.streamOllamaResponse(client, config, prompt, options);
    } else if (config.provider === 'lmstudio') {
      yield* this.streamLMStudioResponse(client, config, prompt, options);
    } else {
      throw new AIEngineError(`Streaming not supported for provider: ${config.provider}`, 'UNSUPPORTED_OPERATION');
    }
  }

  private async *streamOllamaResponse(
    client: AxiosInstance,
    config: AIModelConfig,
    prompt: string,
    options?: any
  ): AsyncGenerator<{ chunk: string; done: boolean }> {
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
        const lines = chunk.toString().split('\n').filter((line: string) => line.trim());
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line) as LocalLLMResponse;
            yield {
              chunk: data.message.content,
              done: data.done
            };
            
            if (data.done) {
              return;
            }
          } catch (parseError) {
            // Skip invalid JSON lines
            continue;
          }
        }
      }
    } catch (error) {
      logger.error('Error streaming Ollama response:', error);
      throw new AIEngineError(
        `Failed to stream response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STREAMING_FAILED'
      );
    }
  }

  private async *streamLMStudioResponse(
    client: AxiosInstance,
    config: AIModelConfig,
    prompt: string,
    options?: any
  ): AsyncGenerator<{ chunk: string; done: boolean }> {
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
        const lines = chunk.toString().split('\n').filter((line: string) => line.trim());
        
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
            } catch (parseError) {
              // Skip invalid JSON lines
              continue;
            }
          }
        }
      }
    } catch (error) {
      logger.error('Error streaming LM Studio response:', error);
      throw new AIEngineError(
        `Failed to stream response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STREAMING_FAILED'
      );
    }
  }
}

export default LocalLLMProvider;