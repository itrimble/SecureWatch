import { EventEmitter } from 'events';
import { MetricsCollector } from '../monitoring/metrics-collector';
import logger from '../utils/logger';

export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Failure rate threshold (0-1)
  resetTimeout: number;          // Time before attempting reset (ms)
  halfOpenRequests: number;      // Max requests in half-open state
  monitoringInterval: number;    // Stats monitoring interval (ms)
  minRequests: number;           // Minimum requests before evaluation
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  totalRequests: number;
  failureRate: number;
  lastFailureTime?: number;
  stateTransitions: number;
  halfOpenRequests: number;
}

export class CircuitBreaker extends EventEmitter {
  private config: CircuitBreakerConfig;
  private metrics: MetricsCollector;
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private totalRequests: number = 0;
  private lastFailureTime?: number;
  private stateTransitions: number = 0;
  private halfOpenRequests: number = 0;
  private monitoringTimer?: NodeJS.Timeout;

  constructor(config: CircuitBreakerConfig, metrics: MetricsCollector) {
    super();
    this.config = config;
    this.metrics = metrics;
    this.startMonitoring();
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.totalRequests++;
    this.metrics.incrementCounter('circuit_breaker.requests_total');

    if (this.state === CircuitState.OPEN) {
      // Check if we should attempt reset
      if (this.shouldAttemptReset()) {
        this.transitionToHalfOpen();
      } else {
        this.metrics.incrementCounter('circuit_breaker.requests_rejected');
        throw new Error('Circuit breaker is OPEN - downstream service unavailable');
      }
    }

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.halfOpenRequests >= this.config.halfOpenRequests) {
        this.metrics.incrementCounter('circuit_breaker.requests_rejected');
        throw new Error('Circuit breaker HALF_OPEN - max test requests exceeded');
      }
      this.halfOpenRequests++;
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.successes++;
    this.metrics.incrementCounter('circuit_breaker.requests_success');

    if (this.state === CircuitState.HALF_OPEN) {
      // Check if we have enough successful requests to close the circuit
      if (this.halfOpenRequests >= this.config.halfOpenRequests) {
        this.transitionToClosed();
      }
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    this.metrics.incrementCounter('circuit_breaker.requests_failure');

    if (this.state === CircuitState.HALF_OPEN) {
      // Single failure in half-open state opens the circuit
      this.transitionToOpen();
    } else if (this.state === CircuitState.CLOSED) {
      // Check if we should open the circuit
      if (this.shouldOpenCircuit()) {
        this.transitionToOpen();
      }
    }
  }

  private shouldOpenCircuit(): boolean {
    // Need minimum requests to evaluate
    if (this.totalRequests < this.config.minRequests) {
      return false;
    }

    const failureRate = this.failures / this.totalRequests;
    return failureRate >= this.config.failureThreshold;
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) {
      return true;
    }
    return Date.now() - this.lastFailureTime >= this.config.resetTimeout;
  }

  private transitionToClosed(): void {
    const previousState = this.state;
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.totalRequests = 0;
    this.halfOpenRequests = 0;
    this.stateTransitions++;

    logger.info('Circuit breaker transitioned to CLOSED', {
      previousState,
      transitions: this.stateTransitions
    });

    this.metrics.setGauge('circuit_breaker.state', 0); // 0 = closed
    this.metrics.incrementCounter('circuit_breaker.state_transitions');
    this.emit('stateChanged', CircuitState.CLOSED, previousState);
  }

  private transitionToOpen(): void {
    const previousState = this.state;
    this.state = CircuitState.OPEN;
    this.halfOpenRequests = 0;
    this.stateTransitions++;

    logger.warn('Circuit breaker transitioned to OPEN', {
      previousState,
      failures: this.failures,
      total: this.totalRequests,
      failureRate: this.getFailureRate(),
      transitions: this.stateTransitions
    });

    this.metrics.setGauge('circuit_breaker.state', 1); // 1 = open
    this.metrics.incrementCounter('circuit_breaker.state_transitions');
    this.emit('stateChanged', CircuitState.OPEN, previousState);
  }

  private transitionToHalfOpen(): void {
    const previousState = this.state;
    this.state = CircuitState.HALF_OPEN;
    this.halfOpenRequests = 0;
    this.stateTransitions++;

    logger.info('Circuit breaker transitioned to HALF_OPEN', {
      previousState,
      transitions: this.stateTransitions
    });

    this.metrics.setGauge('circuit_breaker.state', 0.5); // 0.5 = half-open
    this.metrics.incrementCounter('circuit_breaker.state_transitions');
    this.emit('stateChanged', CircuitState.HALF_OPEN, previousState);
  }

  private getFailureRate(): number {
    return this.totalRequests > 0 ? this.failures / this.totalRequests : 0;
  }

  private startMonitoring(): void {
    this.monitoringTimer = setInterval(() => {
      this.updateMetrics();
    }, this.config.monitoringInterval);
  }

  private updateMetrics(): void {
    const stats = this.getStats();
    
    this.metrics.setGauge('circuit_breaker.failures', stats.failures);
    this.metrics.setGauge('circuit_breaker.successes', stats.successes);
    this.metrics.setGauge('circuit_breaker.total_requests', stats.totalRequests);
    this.metrics.setGauge('circuit_breaker.failure_rate', stats.failureRate);
    this.metrics.setGauge('circuit_breaker.state_transitions', stats.stateTransitions);
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.metrics.setGauge('circuit_breaker.half_open_requests', stats.halfOpenRequests);
    }
  }

  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      totalRequests: this.totalRequests,
      failureRate: this.getFailureRate(),
      lastFailureTime: this.lastFailureTime,
      stateTransitions: this.stateTransitions,
      halfOpenRequests: this.halfOpenRequests
    };
  }

  isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }

  isClosed(): boolean {
    return this.state === CircuitState.CLOSED;
  }

  isHalfOpen(): boolean {
    return this.state === CircuitState.HALF_OPEN;
  }

  reset(): void {
    this.transitionToClosed();
    logger.info('Circuit breaker manually reset');
  }

  destroy(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }
    this.removeAllListeners();
  }
}