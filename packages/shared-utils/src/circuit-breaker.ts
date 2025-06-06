/**
 * Circuit Breaker Pattern Implementation for SecureWatch SIEM
 * Provides service resilience and failure isolation
 */

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Circuit breaker activated - blocking requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service has recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening circuit
  successThreshold: number;      // Number of successes to close circuit when half-open
  timeout: number;               // Time in ms before attempting to close circuit
  monitoringPeriod: number;      // Time window for failure tracking
  onStateChange?: (state: CircuitBreakerState, error?: Error) => void;
  onFailure?: (error: Error) => void;
  onSuccess?: () => void;
}

export interface CircuitBreakerMetrics {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  circuitOpenCount: number;
  averageResponseTime: number;
}

export class CircuitBreakerError extends Error {
  constructor(public state: CircuitBreakerState, message?: string) {
    super(message || `Circuit breaker is ${state.toLowerCase()}`);
    this.name = 'CircuitBreakerError';
  }
}

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private nextAttempt?: Date;
  private config: Required<CircuitBreakerConfig>;
  
  // Metrics
  private totalRequests = 0;
  private successfulRequests = 0;
  private failedRequests = 0;
  private circuitOpenCount = 0;
  private responseTimes: number[] = [];

  constructor(private name: string, config: CircuitBreakerConfig) {
    this.config = {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 60000, // 1 minute
      monitoringPeriod: 60000, // 1 minute
      onStateChange: () => {},
      onFailure: () => {},
      onSuccess: () => {},
      ...config
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    this.totalRequests++;

    try {
      // Check if circuit is open
      if (this.state === CircuitBreakerState.OPEN) {
        if (this.shouldAttemptReset()) {
          this.state = CircuitBreakerState.HALF_OPEN;
          this.config.onStateChange(this.state);
        } else {
          throw new CircuitBreakerError(this.state, 'Circuit breaker is OPEN');
        }
      }

      // Execute the function
      const result = await fn();
      const responseTime = Date.now() - startTime;
      
      this.onSuccess(responseTime);
      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.onFailure(error as Error, responseTime);
      throw error;
    }
  }

  /**
   * Execute with timeout protection
   */
  async executeWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number = 30000): Promise<T> {
    return this.execute(() => 
      Promise.race([
        fn(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
        )
      ])
    );
  }

  /**
   * Handle successful execution
   */
  private onSuccess(responseTime: number): void {
    this.recordResponseTime(responseTime);
    this.successfulRequests++;
    this.lastSuccessTime = new Date();
    this.config.onSuccess();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.reset();
      }
    } else if (this.state === CircuitBreakerState.CLOSED) {
      // Reset failure count on success in closed state
      this.failureCount = 0;
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(error: Error, responseTime: number): void {
    this.recordResponseTime(responseTime);
    this.failedRequests++;
    this.failureCount++;
    this.lastFailureTime = new Date();
    this.config.onFailure(error);

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Immediately return to open state on failure
      this.trip();
    } else if (this.state === CircuitBreakerState.CLOSED) {
      // Check if we should trip the circuit
      if (this.shouldTrip()) {
        this.trip();
      }
    }
  }

  /**
   * Check if circuit should be tripped
   */
  private shouldTrip(): boolean {
    return this.failureCount >= this.config.failureThreshold;
  }

  /**
   * Check if circuit should attempt reset
   */
  private shouldAttemptReset(): boolean {
    return this.nextAttempt ? new Date() >= this.nextAttempt : false;
  }

  /**
   * Trip the circuit breaker (open it)
   */
  private trip(): void {
    this.state = CircuitBreakerState.OPEN;
    this.circuitOpenCount++;
    this.nextAttempt = new Date(Date.now() + this.config.timeout);
    this.config.onStateChange(this.state, this.lastFailureTime ? new Error('Circuit breaker tripped') : undefined);
  }

  /**
   * Reset the circuit breaker (close it)
   */
  private reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = undefined;
    this.config.onStateChange(this.state);
  }

  /**
   * Force reset the circuit breaker
   */
  forceReset(): void {
    this.reset();
  }

  /**
   * Force trip the circuit breaker
   */
  forceTrip(): void {
    this.trip();
  }

  /**
   * Record response time for metrics
   */
  private recordResponseTime(responseTime: number): void {
    this.responseTimes.push(responseTime);
    // Keep only recent response times
    if (this.responseTimes.length > 100) {
      this.responseTimes = this.responseTimes.slice(-50);
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    const averageResponseTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length
      : 0;

    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,
      circuitOpenCount: this.circuitOpenCount,
      averageResponseTime: Math.round(averageResponseTime)
    };
  }

  /**
   * Get current state
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Get circuit breaker name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get health status
   */
  isHealthy(): boolean {
    return this.state !== CircuitBreakerState.OPEN;
  }

  /**
   * Get failure rate
   */
  getFailureRate(): number {
    if (this.totalRequests === 0) return 0;
    return (this.failedRequests / this.totalRequests) * 100;
  }

  /**
   * Clean up old metrics (should be called periodically)
   */
  cleanupMetrics(): void {
    const cutoff = new Date(Date.now() - this.config.monitoringPeriod);
    
    // Reset counters if outside monitoring period
    if (this.lastFailureTime && this.lastFailureTime < cutoff) {
      this.failureCount = 0;
    }
  }
}

/**
 * Circuit Breaker Manager for multiple services
 */
export class CircuitBreakerManager {
  private breakers = new Map<string, CircuitBreaker>();
  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    // Start cleanup process
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Cleanup every minute
  }

  /**
   * Get or create a circuit breaker for a service
   */
  getBreaker(serviceName: string, config?: CircuitBreakerConfig): CircuitBreaker {
    let breaker = this.breakers.get(serviceName);
    
    if (!breaker) {
      const defaultConfig: CircuitBreakerConfig = {
        failureThreshold: 5,
        successThreshold: 3,
        timeout: 60000,
        monitoringPeriod: 60000,
        onStateChange: (state, error) => {
          console.log(`Circuit breaker ${serviceName} state changed to ${state}`, error?.message);
        },
        onFailure: (error) => {
          console.warn(`Circuit breaker ${serviceName} failure:`, error.message);
        }
      };

      breaker = new CircuitBreaker(serviceName, { ...defaultConfig, ...config });
      this.breakers.set(serviceName, breaker);
    }
    
    return breaker;
  }

  /**
   * Get all circuit breakers
   */
  getAllBreakers(): Map<string, CircuitBreaker> {
    return new Map(this.breakers);
  }

  /**
   * Get health status of all circuit breakers
   */
  getHealthStatus(): Record<string, { state: CircuitBreakerState; healthy: boolean; metrics: CircuitBreakerMetrics }> {
    const status: Record<string, any> = {};
    
    for (const [name, breaker] of this.breakers) {
      status[name] = {
        state: breaker.getState(),
        healthy: breaker.isHealthy(),
        metrics: breaker.getMetrics()
      };
    }
    
    return status;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.forceReset();
    }
  }

  /**
   * Cleanup old metrics
   */
  private cleanup(): void {
    for (const breaker of this.breakers.values()) {
      breaker.cleanupMetrics();
    }
  }

  /**
   * Destroy the manager
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.breakers.clear();
  }
}

// Global circuit breaker manager instance
export const circuitBreakerManager = new CircuitBreakerManager();

// Helper function for database operations
export function withDatabaseCircuitBreaker<T>(operation: () => Promise<T>): Promise<T> {
  const breaker = circuitBreakerManager.getBreaker('database', {
    failureThreshold: 3,
    timeout: 30000,
    onStateChange: (state) => {
      console.log(`Database circuit breaker state: ${state}`);
    }
  });
  
  return breaker.executeWithTimeout(operation, 30000);
}

// Helper function for external API operations
export function withExternalApiCircuitBreaker<T>(apiName: string, operation: () => Promise<T>): Promise<T> {
  const breaker = circuitBreakerManager.getBreaker(`external-api-${apiName}`, {
    failureThreshold: 5,
    timeout: 60000,
    onStateChange: (state) => {
      console.log(`External API ${apiName} circuit breaker state: ${state}`);
    }
  });
  
  return breaker.executeWithTimeout(operation, 30000);
}

// Helper function for search operations
export function withSearchCircuitBreaker<T>(operation: () => Promise<T>): Promise<T> {
  const breaker = circuitBreakerManager.getBreaker('search-engine', {
    failureThreshold: 10,
    timeout: 120000,
    onStateChange: (state) => {
      console.log(`Search engine circuit breaker state: ${state}`);
    }
  });
  
  return breaker.executeWithTimeout(operation, 120000);
}