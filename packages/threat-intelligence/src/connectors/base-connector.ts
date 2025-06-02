import { EventEmitter } from 'events';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import pLimit from 'p-limit';
import pRetry from 'p-retry';
import { ThreatFeedConfig, IOC, ThreatIntelResponse, ThreatIntelError } from '../types/threat-intel.types';
import { logger } from '../utils/logger';

export interface ConnectorOptions {
  config: ThreatFeedConfig;
  cache?: any; // Cache implementation
}

export abstract class BaseThreatIntelConnector extends EventEmitter {
  protected config: ThreatFeedConfig;
  protected axios: AxiosInstance;
  protected rateLimiter?: ReturnType<typeof pLimit>;
  protected cache?: any;
  protected lastPoll?: Date;
  protected isPolling: boolean = false;
  private pollInterval?: NodeJS.Timeout;

  constructor(options: ConnectorOptions) {
    super();
    this.config = options.config;
    this.cache = options.cache;

    // Setup axios instance
    this.axios = axios.create({
      baseURL: this.config.endpoint,
      timeout: this.config.timeout,
      headers: this.getDefaultHeaders()
    });

    // Setup proxy if configured
    if (this.config.proxy) {
      this.setupProxy(this.config.proxy);
    }

    // Setup rate limiter if configured
    if (this.config.rateLimit) {
      const { requests, period } = this.config.rateLimit;
      this.rateLimiter = pLimit(Math.floor(requests / (period / 1000)));
    }

    // Add request/response interceptors
    this.setupInterceptors();
  }

  // Abstract methods to be implemented by specific connectors
  abstract fetchIOCs(params?: any): Promise<IOC[]>;
  abstract fetchThreatActors(params?: any): Promise<any[]>;
  abstract searchIOC(ioc: string, type: string): Promise<ThreatIntelResponse>;
  abstract getHealth(): Promise<{ status: 'healthy' | 'unhealthy'; details?: any }>;

  // Common methods
  async start(): Promise<void> {
    if (!this.config.enabled) {
      logger.info(`Connector ${this.config.name} is disabled`);
      return;
    }

    logger.info(`Starting threat intel connector: ${this.config.name}`);
    
    // Initial poll
    await this.poll();

    // Setup recurring poll
    this.pollInterval = setInterval(async () => {
      await this.poll();
    }, this.config.pollInterval);

    this.emit('started', { connector: this.config.name });
  }

  async stop(): Promise<void> {
    logger.info(`Stopping threat intel connector: ${this.config.name}`);
    
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = undefined;
    }

    this.isPolling = false;
    this.emit('stopped', { connector: this.config.name });
  }

  protected async poll(): Promise<void> {
    if (this.isPolling) {
      logger.warn(`Skipping poll for ${this.config.name} - previous poll still running`);
      return;
    }

    this.isPolling = true;
    const startTime = Date.now();

    try {
      logger.debug(`Starting poll for ${this.config.name}`);
      
      const iocs = await this.fetchIOCs({
        since: this.lastPoll,
        filters: this.config.filters
      });

      const duration = Date.now() - startTime;
      this.lastPoll = new Date();

      logger.info(`Poll completed for ${this.config.name}`, {
        iocCount: iocs.length,
        duration
      });

      this.emit('poll-complete', {
        connector: this.config.name,
        iocCount: iocs.length,
        duration
      });

      // Emit IOCs for processing
      if (iocs.length > 0) {
        this.emit('iocs', iocs);
      }
    } catch (error) {
      logger.error(`Poll failed for ${this.config.name}`, error);
      this.emit('poll-error', {
        connector: this.config.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      this.isPolling = false;
    }
  }

  protected async makeRequest<T>(config: AxiosRequestConfig): Promise<T> {
    const requestFn = async () => {
      if (this.rateLimiter) {
        return await this.rateLimiter(() => this.axios.request<T>(config));
      }
      return await this.axios.request<T>(config);
    };

    try {
      const response = await pRetry(requestFn, {
        retries: 3,
        onFailedAttempt: (error) => {
          logger.warn(`Request failed, attempt ${error.attemptNumber}`, {
            connector: this.config.name,
            error: error.message
          });
        }
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new ThreatIntelError(
          `Request failed: ${error.message}`,
          'REQUEST_FAILED',
          {
            status: error.response?.status,
            data: error.response?.data
          }
        );
      }
      throw error;
    }
  }

  protected getDefaultHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': 'SecureWatch-ThreatIntel/1.0',
      'Accept': 'application/json'
    };

    if (this.config.apiKey) {
      headers['X-API-Key'] = this.config.apiKey;
    }

    return headers;
  }

  protected setupProxy(proxyUrl: string): void {
    const proxyConfig = this.parseProxyUrl(proxyUrl);
    this.axios.defaults.proxy = proxyConfig;
  }

  private parseProxyUrl(proxyUrl: string): any {
    const url = new URL(proxyUrl);
    return {
      host: url.hostname,
      port: parseInt(url.port),
      auth: url.username && url.password ? {
        username: url.username,
        password: url.password
      } : undefined,
      protocol: url.protocol.replace(':', '')
    };
  }

  protected setupInterceptors(): void {
    // Request interceptor
    this.axios.interceptors.request.use(
      (config) => {
        logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
          connector: this.config.name
        });
        return config;
      },
      (error) => {
        logger.error('Request interceptor error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axios.interceptors.response.use(
      (response) => {
        logger.debug(`API Response: ${response.status} ${response.config.url}`, {
          connector: this.config.name
        });
        return response;
      },
      (error) => {
        if (error.response) {
          logger.error(`API Error: ${error.response.status} ${error.response.config.url}`, {
            connector: this.config.name,
            data: error.response.data
          });
        }
        return Promise.reject(error);
      }
    );
  }

  protected async getCached<T>(key: string): Promise<T | null> {
    if (!this.cache) return null;
    
    try {
      return await this.cache.get(key);
    } catch (error) {
      logger.error('Cache get error', error);
      return null;
    }
  }

  protected async setCached<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.cache) return;
    
    try {
      await this.cache.set(key, value, ttl);
    } catch (error) {
      logger.error('Cache set error', error);
    }
  }

  // Helper method to normalize IOCs
  protected normalizeIOC(raw: any, source: string): Partial<IOC> {
    return {
      source,
      firstSeen: new Date(),
      lastSeen: new Date(),
      confidence: 75, // Default confidence
      severity: 'medium', // Default severity
      active: true,
      tags: [],
      metadata: {},
      relatedIOCs: []
    };
  }

  // Helper to validate and filter IOCs based on config
  protected filterIOCs(iocs: IOC[]): IOC[] {
    if (!this.config.filters) return iocs;

    return iocs.filter(ioc => {
      // Filter by type
      if (this.config.filters?.types && 
          !this.config.filters.types.includes(ioc.type)) {
        return false;
      }

      // Filter by tags
      if (this.config.filters?.tags && 
          !ioc.tags.some(tag => this.config.filters?.tags?.includes(tag))) {
        return false;
      }

      // Filter by confidence
      if (this.config.filters?.confidence !== undefined &&
          ioc.confidence < this.config.filters.confidence) {
        return false;
      }

      // Filter by age
      if (this.config.filters?.age !== undefined) {
        const ageInDays = (Date.now() - ioc.firstSeen.getTime()) / (1000 * 60 * 60 * 24);
        if (ageInDays > this.config.filters.age) {
          return false;
        }
      }

      return true;
    });
  }

  // Get connector info
  getInfo(): {
    id: string;
    name: string;
    type: string;
    enabled: boolean;
    lastPoll?: Date;
    isPolling: boolean;
  } {
    return {
      id: this.config.id,
      name: this.config.name,
      type: this.config.type,
      enabled: this.config.enabled,
      lastPoll: this.lastPoll,
      isPolling: this.isPolling
    };
  }
}