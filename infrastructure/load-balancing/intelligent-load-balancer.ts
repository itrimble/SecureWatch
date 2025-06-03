/**
 * SecureWatch Intelligent Load Balancer
 * Advanced load balancing with health-aware distribution and circuit breaking
 */

import { EventEmitter } from 'events';
import { createHash } from 'crypto';

// Backend Server Interface
export interface BackendServer {
  id: string;
  host: string;
  port: number;
  weight: number;
  maxConnections: number;
  currentConnections: number;
  healthStatus: 'healthy' | 'unhealthy' | 'warning' | 'unknown';
  lastHealthCheck: Date;
  responseTime: number;
  errorRate: number;
  cpu: number;
  memory: number;
  region?: string;
  zone?: string;
  tags?: Record<string, string>;
}

// Load Balancing Strategies
export type LoadBalancingStrategy = 
  | 'round-robin'
  | 'weighted-round-robin'
  | 'least-connections'
  | 'least-response-time'
  | 'resource-based'
  | 'geolocation'
  | 'consistent-hash'
  | 'adaptive';

// Request Context
export interface RequestContext {
  id: string;
  clientIP: string;
  userAgent?: string;
  path: string;
  method: string;
  headers: Record<string, string>;
  sessionId?: string;
  userId?: string;
  tenantId?: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  timestamp: Date;
  region?: string;
}

// Load Balancer Configuration
export interface LoadBalancerConfig {
  strategy: LoadBalancingStrategy;
  healthCheckInterval: number;
  healthCheckTimeout: number;
  healthCheckPath: string;
  maxRetries: number;
  retryBackoff: number;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
  stickySessionTTL: number;
  enableMetrics: boolean;
  enableTracing: boolean;
}

// Circuit Breaker State
export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  nextAttemptTime?: Date;
}

// Load Balancer Metrics
export interface LoadBalancerMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  throughput: number;
  activeConnections: number;
  backendDistribution: Record<string, number>;
  circuitBreakerTrips: number;
  lastUpdated: Date;
}

export class IntelligentLoadBalancer extends EventEmitter {
  private servers: Map<string, BackendServer> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private stickySessions: Map<string, string> = new Map();
  private roundRobinIndex = 0;
  private metrics: LoadBalancerMetrics;
  private healthCheckTimer?: NodeJS.Timeout;
  private metricsTimer?: NodeJS.Timeout;
  private config: LoadBalancerConfig;

  constructor(config: Partial<LoadBalancerConfig> = {}) {
    super();
    
    this.config = {
      strategy: 'adaptive',
      healthCheckInterval: 30000,
      healthCheckTimeout: 5000,
      healthCheckPath: '/health',
      maxRetries: 3,
      retryBackoff: 1000,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 60000,
      stickySessionTTL: 3600000,
      enableMetrics: true,
      enableTracing: true,
      ...config,
    };

    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      throughput: 0,
      activeConnections: 0,
      backendDistribution: {},
      circuitBreakerTrips: 0,
      lastUpdated: new Date(),
    };

    this.startHealthChecks();
    this.startMetricsCollection();
  }

  /**
   * Add a backend server to the load balancer
   */
  addServer(server: Omit<BackendServer, 'id' | 'currentConnections' | 'healthStatus' | 'lastHealthCheck' | 'responseTime' | 'errorRate'>): void {
    const backendServer: BackendServer = {
      ...server,
      id: this.generateServerId(server.host, server.port),
      currentConnections: 0,
      healthStatus: 'unknown',
      lastHealthCheck: new Date(),
      responseTime: 0,
      errorRate: 0,
    };

    this.servers.set(backendServer.id, backendServer);
    this.initializeCircuitBreaker(backendServer.id);
    
    this.emit('serverAdded', backendServer);
    console.log(`Added backend server: ${backendServer.host}:${backendServer.port}`);
  }

  /**
   * Remove a backend server
   */
  removeServer(serverId: string): void {
    const server = this.servers.get(serverId);
    if (server) {
      this.servers.delete(serverId);
      this.circuitBreakers.delete(serverId);
      this.emit('serverRemoved', server);
      console.log(`Removed backend server: ${server.host}:${server.port}`);
    }
  }

  /**
   * Select the best backend server for a request
   */
  async selectServer(context: RequestContext): Promise<BackendServer | null> {
    const healthyServers = this.getHealthyServers();
    
    if (healthyServers.length === 0) {
      this.emit('noHealthyServers');
      return null;
    }

    // Check for sticky session
    if (context.sessionId) {
      const stickyServer = this.getStickySessionServer(context.sessionId);
      if (stickyServer && this.isServerAvailable(stickyServer)) {
        return stickyServer;
      }
    }

    // Select server based on strategy
    let selectedServer: BackendServer | null = null;

    switch (this.config.strategy) {
      case 'round-robin':
        selectedServer = this.selectRoundRobin(healthyServers);
        break;
      case 'weighted-round-robin':
        selectedServer = this.selectWeightedRoundRobin(healthyServers);
        break;
      case 'least-connections':
        selectedServer = this.selectLeastConnections(healthyServers);
        break;
      case 'least-response-time':
        selectedServer = this.selectLeastResponseTime(healthyServers);
        break;
      case 'resource-based':
        selectedServer = this.selectResourceBased(healthyServers);
        break;
      case 'geolocation':
        selectedServer = this.selectGeolocation(healthyServers, context);
        break;
      case 'consistent-hash':
        selectedServer = this.selectConsistentHash(healthyServers, context);
        break;
      case 'adaptive':
        selectedServer = this.selectAdaptive(healthyServers, context);
        break;
      default:
        selectedServer = this.selectRoundRobin(healthyServers);
    }

    if (selectedServer && context.sessionId) {
      this.setStickySession(context.sessionId, selectedServer.id);
    }

    return selectedServer;
  }

  /**
   * Process a request through the load balancer
   */
  async processRequest(context: RequestContext): Promise<{
    server: BackendServer | null;
    success: boolean;
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      const server = await this.selectServer(context);
      if (!server) {
        this.metrics.failedRequests++;
        return {
          server: null,
          success: false,
          responseTime: 0,
          error: 'No available servers',
        };
      }

      // Check circuit breaker
      if (!this.isCircuitBreakerClosed(server.id)) {
        this.metrics.failedRequests++;
        return {
          server,
          success: false,
          responseTime: 0,
          error: 'Circuit breaker open',
        };
      }

      // Increment connection count
      server.currentConnections++;
      this.metrics.activeConnections++;

      // Simulate request processing
      const responseTime = await this.simulateRequest(server, context);
      
      // Update metrics
      this.updateServerMetrics(server.id, responseTime, true);
      this.updateCircuitBreaker(server.id, true);
      this.metrics.successfulRequests++;

      // Decrement connection count
      server.currentConnections--;
      this.metrics.activeConnections--;

      return {
        server,
        success: true,
        responseTime,
      };

    } catch (error) {
      this.metrics.failedRequests++;
      const responseTime = Date.now() - startTime;
      
      return {
        server: null,
        success: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get healthy servers
   */
  private getHealthyServers(): BackendServer[] {
    return Array.from(this.servers.values()).filter(server => 
      server.healthStatus === 'healthy' || server.healthStatus === 'warning'
    );
  }

  /**
   * Round Robin Selection
   */
  private selectRoundRobin(servers: BackendServer[]): BackendServer {
    const server = servers[this.roundRobinIndex % servers.length];
    this.roundRobinIndex++;
    return server;
  }

  /**
   * Weighted Round Robin Selection
   */
  private selectWeightedRoundRobin(servers: BackendServer[]): BackendServer {
    const totalWeight = servers.reduce((sum, server) => sum + server.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const server of servers) {
      random -= server.weight;
      if (random <= 0) {
        return server;
      }
    }
    
    return servers[0];
  }

  /**
   * Least Connections Selection
   */
  private selectLeastConnections(servers: BackendServer[]): BackendServer {
    return servers.reduce((min, server) => 
      server.currentConnections < min.currentConnections ? server : min
    );
  }

  /**
   * Least Response Time Selection
   */
  private selectLeastResponseTime(servers: BackendServer[]): BackendServer {
    return servers.reduce((min, server) => 
      server.responseTime < min.responseTime ? server : min
    );
  }

  /**
   * Resource-based Selection
   */
  private selectResourceBased(servers: BackendServer[]): BackendServer {
    // Calculate resource score (lower is better)
    const getResourceScore = (server: BackendServer) => {
      const cpuScore = server.cpu / 100;
      const memoryScore = server.memory / 100;
      const connectionScore = server.currentConnections / server.maxConnections;
      return (cpuScore + memoryScore + connectionScore) / 3;
    };

    return servers.reduce((best, server) => 
      getResourceScore(server) < getResourceScore(best) ? server : best
    );
  }

  /**
   * Geolocation-based Selection
   */
  private selectGeolocation(servers: BackendServer[], context: RequestContext): BackendServer {
    // Prefer servers in the same region
    if (context.region) {
      const regionServers = servers.filter(server => server.region === context.region);
      if (regionServers.length > 0) {
        return this.selectLeastConnections(regionServers);
      }
    }
    
    return this.selectLeastConnections(servers);
  }

  /**
   * Consistent Hash Selection
   */
  private selectConsistentHash(servers: BackendServer[], context: RequestContext): BackendServer {
    const key = context.userId || context.sessionId || context.clientIP;
    const hash = createHash('md5').update(key).digest('hex');
    const hashValue = parseInt(hash.substring(0, 8), 16);
    const index = hashValue % servers.length;
    return servers[index];
  }

  /**
   * Adaptive Selection (combines multiple strategies)
   */
  private selectAdaptive(servers: BackendServer[], context: RequestContext): BackendServer {
    // High priority requests go to best performing servers
    if (context.priority === 'critical' || context.priority === 'high') {
      return this.selectResourceBased(servers);
    }

    // Use geolocation for regional optimization
    if (context.region) {
      const regionServers = servers.filter(server => server.region === context.region);
      if (regionServers.length > 0) {
        return this.selectLeastResponseTime(regionServers);
      }
    }

    // Default to least connections
    return this.selectLeastConnections(servers);
  }

  /**
   * Check if server is available
   */
  private isServerAvailable(server: BackendServer): boolean {
    return server.healthStatus === 'healthy' && 
           server.currentConnections < server.maxConnections &&
           this.isCircuitBreakerClosed(server.id);
  }

  /**
   * Initialize circuit breaker for server
   */
  private initializeCircuitBreaker(serverId: string): void {
    this.circuitBreakers.set(serverId, {
      state: 'closed',
      failureCount: 0,
      successCount: 0,
    });
  }

  /**
   * Check if circuit breaker is closed
   */
  private isCircuitBreakerClosed(serverId: string): boolean {
    const breaker = this.circuitBreakers.get(serverId);
    if (!breaker) return true;

    if (breaker.state === 'open') {
      if (breaker.nextAttemptTime && Date.now() > breaker.nextAttemptTime.getTime()) {
        breaker.state = 'half-open';
        breaker.successCount = 0;
      } else {
        return false;
      }
    }

    return true;
  }

  /**
   * Update circuit breaker state
   */
  private updateCircuitBreaker(serverId: string, success: boolean): void {
    const breaker = this.circuitBreakers.get(serverId);
    if (!breaker) return;

    if (success) {
      breaker.successCount++;
      if (breaker.state === 'half-open' && breaker.successCount >= 3) {
        breaker.state = 'closed';
        breaker.failureCount = 0;
      }
    } else {
      breaker.failureCount++;
      breaker.lastFailureTime = new Date();
      
      if (breaker.failureCount >= this.config.circuitBreakerThreshold) {
        breaker.state = 'open';
        breaker.nextAttemptTime = new Date(Date.now() + this.config.circuitBreakerTimeout);
        this.metrics.circuitBreakerTrips++;
        this.emit('circuitBreakerTripped', serverId);
      }
    }
  }

  /**
   * Sticky session management
   */
  private getStickySessionServer(sessionId: string): BackendServer | null {
    const serverId = this.stickySessions.get(sessionId);
    return serverId ? this.servers.get(serverId) || null : null;
  }

  private setStickySession(sessionId: string, serverId: string): void {
    this.stickySessions.set(sessionId, serverId);
    
    // Auto-expire sticky sessions
    setTimeout(() => {
      this.stickyessions.delete(sessionId);
    }, this.config.stickySessionTTL);
  }

  /**
   * Simulate request processing
   */
  private async simulateRequest(server: BackendServer, context: RequestContext): Promise<number> {
    const baseTime = 50 + Math.random() * 100; // 50-150ms base
    const loadFactor = server.currentConnections / server.maxConnections;
    const cpuFactor = server.cpu / 100;
    
    const responseTime = baseTime * (1 + loadFactor + cpuFactor);
    
    // Simulate request delay
    await new Promise(resolve => setTimeout(resolve, responseTime));
    
    return responseTime;
  }

  /**
   * Update server metrics
   */
  private updateServerMetrics(serverId: string, responseTime: number, success: boolean): void {
    const server = this.servers.get(serverId);
    if (!server) return;

    // Update response time (exponential moving average)
    server.responseTime = server.responseTime * 0.9 + responseTime * 0.1;
    
    // Update error rate
    const currentErrorRate = success ? 0 : 1;
    server.errorRate = server.errorRate * 0.95 + currentErrorRate * 0.05;

    // Update distribution metrics
    this.metrics.backendDistribution[serverId] = 
      (this.metrics.backendDistribution[serverId] || 0) + 1;
  }

  /**
   * Start health checks
   */
  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform health checks on all servers
   */
  private async performHealthChecks(): Promise<void> {
    const promises = Array.from(this.servers.values()).map(server => 
      this.checkServerHealth(server)
    );
    
    await Promise.all(promises);
  }

  /**
   * Check health of a single server
   */
  private async checkServerHealth(server: BackendServer): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Simulate health check
      const isHealthy = Math.random() > 0.05; // 95% success rate
      const responseTime = Date.now() - startTime;
      
      const previousStatus = server.healthStatus;
      
      if (isHealthy) {
        server.healthStatus = responseTime < 1000 ? 'healthy' : 'warning';
        server.cpu = 30 + Math.random() * 40; // 30-70%
        server.memory = 40 + Math.random() * 30; // 40-70%
      } else {
        server.healthStatus = 'unhealthy';
      }
      
      server.lastHealthCheck = new Date();
      
      if (previousStatus !== server.healthStatus) {
        this.emit('serverHealthChanged', {
          server,
          previousStatus,
          currentStatus: server.healthStatus,
        });
      }
      
    } catch (error) {
      server.healthStatus = 'unhealthy';
      server.lastHealthCheck = new Date();
      console.error(`Health check failed for ${server.host}:${server.port}:`, error);
    }
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    if (this.config.enableMetrics) {
      this.metricsTimer = setInterval(() => {
        this.updateMetrics();
      }, 10000); // Update every 10 seconds
    }
  }

  /**
   * Update metrics
   */
  private updateMetrics(): void {
    const now = Date.now();
    const timeDelta = now - this.metrics.lastUpdated.getTime();
    
    // Calculate throughput (requests per second)
    this.metrics.throughput = (this.metrics.totalRequests * 1000) / timeDelta;
    
    // Calculate average response time
    if (this.metrics.successfulRequests > 0) {
      const totalResponseTime = Array.from(this.servers.values())
        .reduce((sum, server) => sum + server.responseTime, 0);
      this.metrics.averageResponseTime = totalResponseTime / this.servers.size;
    }
    
    this.metrics.lastUpdated = new Date();
    
    this.emit('metricsUpdated', this.metrics);
  }

  /**
   * Get current metrics
   */
  getMetrics(): LoadBalancerMetrics {
    return { ...this.metrics };
  }

  /**
   * Get server status
   */
  getServerStatus(): BackendServer[] {
    return Array.from(this.servers.values());
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(): Record<string, CircuitBreakerState> {
    const status: Record<string, CircuitBreakerState> = {};
    for (const [serverId, state] of this.circuitBreakers.entries()) {
      status[serverId] = { ...state };
    }
    return status;
  }

  /**
   * Generate server ID
   */
  private generateServerId(host: string, port: number): string {
    return createHash('md5').update(`${host}:${port}`).digest('hex').substring(0, 8);
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
    }
    this.removeAllListeners();
  }
}

// Load Balancer Manager for multiple load balancer instances
export class LoadBalancerManager {
  private loadBalancers: Map<string, IntelligentLoadBalancer> = new Map();
  
  /**
   * Create a new load balancer instance
   */
  createLoadBalancer(name: string, config?: Partial<LoadBalancerConfig>): IntelligentLoadBalancer {
    const lb = new IntelligentLoadBalancer(config);
    this.loadBalancers.set(name, lb);
    return lb;
  }
  
  /**
   * Get load balancer by name
   */
  getLoadBalancer(name: string): IntelligentLoadBalancer | null {
    return this.loadBalancers.get(name) || null;
  }
  
  /**
   * Remove load balancer
   */
  removeLoadBalancer(name: string): void {
    const lb = this.loadBalancers.get(name);
    if (lb) {
      lb.cleanup();
      this.loadBalancers.delete(name);
    }
  }
  
  /**
   * Get all load balancer metrics
   */
  getAllMetrics(): Record<string, LoadBalancerMetrics> {
    const metrics: Record<string, LoadBalancerMetrics> = {};
    for (const [name, lb] of this.loadBalancers.entries()) {
      metrics[name] = lb.getMetrics();
    }
    return metrics;
  }
}

// Export singleton manager
export const loadBalancerManager = new LoadBalancerManager();