import { EventEmitter } from 'events';
import { MetricsCollector } from '../monitoring/metrics-collector';
import { BackpressureMonitor } from './backpressure-monitor';
import logger from '../utils/logger';

export interface AdaptiveBatchConfig {
  initialBatchSize: number;         // Starting batch size
  minBatchSize: number;             // Minimum batch size
  maxBatchSize: number;             // Maximum batch size
  targetLatency: number;            // Target processing latency (ms)
  adjustmentFactor: number;         // Batch size adjustment factor (0-1)
  evaluationInterval: number;       // How often to evaluate performance (ms)
  throughputTarget: number;         // Target throughput (events/sec)
  adaptiveEnabled: boolean;         // Enable adaptive adjustment
}

export interface BatchMetrics {
  currentBatchSize: number;
  averageLatency: number;
  throughput: number;
  adjustmentHistory: number[];
  performanceScore: number;
  backpressureActive: boolean;
}

export class AdaptiveBatchManager extends EventEmitter {
  private config: AdaptiveBatchConfig;
  private metrics: MetricsCollector;
  private backpressureMonitor: BackpressureMonitor;
  private currentBatchSize: number;
  private latencyHistory: number[] = [];
  private throughputHistory: number[] = [];
  private adjustmentHistory: number[] = [];
  private lastEvaluation: number = Date.now();
  private evaluationTimer?: NodeJS.Timeout;
  private performanceScore: number = 1.0;

  constructor(
    config: AdaptiveBatchConfig, 
    metrics: MetricsCollector, 
    backpressureMonitor: BackpressureMonitor
  ) {
    super();
    this.config = config;
    this.metrics = metrics;
    this.backpressureMonitor = backpressureMonitor;
    this.currentBatchSize = config.initialBatchSize;
    
    // Listen to backpressure events
    this.backpressureMonitor.on('backpressureActivated', this.onBackpressureActivated.bind(this));
    this.backpressureMonitor.on('backpressureDeactivated', this.onBackpressureDeactivated.bind(this));
    
    if (config.adaptiveEnabled) {
      this.startEvaluation();
    }
  }

  getBatchSize(): number {
    return this.currentBatchSize;
  }

  recordBatchProcessing(batchSize: number, latency: number, throughput: number): void {
    // Record metrics
    this.latencyHistory.push(latency);
    this.throughputHistory.push(throughput);
    
    // Keep only recent history
    if (this.latencyHistory.length > 100) {
      this.latencyHistory.shift();
    }
    if (this.throughputHistory.length > 100) {
      this.throughputHistory.shift();
    }
    
    // Update metrics
    this.metrics.recordHistogram('batch.processing_latency', latency);
    this.metrics.recordHistogram('batch.throughput', throughput);
    this.metrics.setGauge('batch.current_size', this.currentBatchSize);
  }

  private onBackpressureActivated(): void {
    if (this.config.adaptiveEnabled) {
      // Reduce batch size when backpressure is detected
      const newBatchSize = Math.max(
        this.config.minBatchSize,
        Math.floor(this.currentBatchSize * 0.7) // Reduce by 30%
      );
      
      this.adjustBatchSize(newBatchSize, 'backpressure_activated');
    }
  }

  private onBackpressureDeactivated(): void {
    if (this.config.adaptiveEnabled) {
      // Gradually increase batch size when backpressure is resolved
      const newBatchSize = Math.min(
        this.config.maxBatchSize,
        Math.floor(this.currentBatchSize * 1.1) // Increase by 10%
      );
      
      this.adjustBatchSize(newBatchSize, 'backpressure_deactivated');
    }
  }

  private startEvaluation(): void {
    this.evaluationTimer = setInterval(() => {
      this.evaluatePerformance();
    }, this.config.evaluationInterval);
  }

  private evaluatePerformance(): void {
    if (this.latencyHistory.length < 5 || this.throughputHistory.length < 5) {
      return; // Need more data points
    }

    const avgLatency = this.latencyHistory.reduce((sum, lat) => sum + lat, 0) / this.latencyHistory.length;
    const avgThroughput = this.throughputHistory.reduce((sum, tp) => sum + tp, 0) / this.throughputHistory.length;
    
    // Calculate performance score
    const latencyScore = this.config.targetLatency / Math.max(avgLatency, this.config.targetLatency);
    const throughputScore = Math.min(avgThroughput / this.config.throughputTarget, 1.0);
    this.performanceScore = (latencyScore + throughputScore) / 2;
    
    // Determine if adjustment is needed
    const shouldAdjust = this.shouldAdjustBatchSize(avgLatency, avgThroughput);
    
    if (shouldAdjust) {
      const newBatchSize = this.calculateOptimalBatchSize(avgLatency, avgThroughput);
      this.adjustBatchSize(newBatchSize, 'performance_optimization');
    }
    
    // Update metrics
    this.updateEvaluationMetrics(avgLatency, avgThroughput);
  }

  private shouldAdjustBatchSize(avgLatency: number, avgThroughput: number): boolean {
    // Don't adjust if backpressure is active
    if (this.backpressureMonitor.isActive()) {
      return false;
    }
    
    // Adjust if latency is significantly off target
    const latencyRatio = avgLatency / this.config.targetLatency;
    if (latencyRatio > 1.2 || latencyRatio < 0.8) {
      return true;
    }
    
    // Adjust if throughput is significantly below target
    const throughputRatio = avgThroughput / this.config.throughputTarget;
    if (throughputRatio < 0.9) {
      return true;
    }
    
    return false;
  }

  private calculateOptimalBatchSize(avgLatency: number, avgThroughput: number): number {
    let newBatchSize = this.currentBatchSize;
    
    // Adjust based on latency
    if (avgLatency > this.config.targetLatency * 1.2) {
      // Latency too high, reduce batch size
      newBatchSize = Math.floor(newBatchSize * (1 - this.config.adjustmentFactor));
    } else if (avgLatency < this.config.targetLatency * 0.8) {
      // Latency low, can increase batch size
      newBatchSize = Math.floor(newBatchSize * (1 + this.config.adjustmentFactor));
    }
    
    // Adjust based on throughput
    if (avgThroughput < this.config.throughputTarget * 0.9) {
      // Throughput low, try increasing batch size (if latency allows)
      if (avgLatency < this.config.targetLatency) {
        newBatchSize = Math.floor(newBatchSize * (1 + this.config.adjustmentFactor * 0.5));
      }
    }
    
    // Apply constraints
    newBatchSize = Math.max(this.config.minBatchSize, newBatchSize);
    newBatchSize = Math.min(this.config.maxBatchSize, newBatchSize);
    
    return newBatchSize;
  }

  private adjustBatchSize(newBatchSize: number, reason: string): void {
    if (newBatchSize === this.currentBatchSize) {
      return;
    }
    
    const oldBatchSize = this.currentBatchSize;
    this.currentBatchSize = newBatchSize;
    this.adjustmentHistory.push(newBatchSize);
    
    // Keep only recent adjustment history
    if (this.adjustmentHistory.length > 50) {
      this.adjustmentHistory.shift();
    }
    
    logger.info('Batch size adjusted', {
      oldSize: oldBatchSize,
      newSize: newBatchSize,
      reason,
      performanceScore: this.performanceScore
    });
    
    this.metrics.incrementCounter('batch.size_adjustments');
    this.metrics.setGauge('batch.current_size', newBatchSize);
    this.emit('batchSizeChanged', {
      oldSize: oldBatchSize,
      newSize: newBatchSize,
      reason
    });
  }

  private updateEvaluationMetrics(avgLatency: number, avgThroughput: number): void {
    this.metrics.setGauge('batch.average_latency', avgLatency);
    this.metrics.setGauge('batch.average_throughput', avgThroughput);
    this.metrics.setGauge('batch.performance_score', this.performanceScore);
    this.metrics.setGauge('batch.target_latency_ratio', avgLatency / this.config.targetLatency);
    this.metrics.setGauge('batch.target_throughput_ratio', avgThroughput / this.config.throughputTarget);
  }

  getMetrics(): BatchMetrics {
    const avgLatency = this.latencyHistory.length > 0
      ? this.latencyHistory.reduce((sum, lat) => sum + lat, 0) / this.latencyHistory.length
      : 0;
      
    const throughput = this.throughputHistory.length > 0
      ? this.throughputHistory.reduce((sum, tp) => sum + tp, 0) / this.throughputHistory.length
      : 0;
    
    return {
      currentBatchSize: this.currentBatchSize,
      averageLatency: avgLatency,
      throughput,
      adjustmentHistory: [...this.adjustmentHistory],
      performanceScore: this.performanceScore,
      backpressureActive: this.backpressureMonitor.isActive()
    };
  }

  setBatchSize(size: number): void {
    const constrainedSize = Math.max(
      this.config.minBatchSize,
      Math.min(this.config.maxBatchSize, size)
    );
    
    this.adjustBatchSize(constrainedSize, 'manual_override');
  }

  reset(): void {
    this.currentBatchSize = this.config.initialBatchSize;
    this.latencyHistory = [];
    this.throughputHistory = [];
    this.adjustmentHistory = [];
    this.performanceScore = 1.0;
    
    logger.info('Adaptive batch manager reset');
  }

  destroy(): void {
    if (this.evaluationTimer) {
      clearInterval(this.evaluationTimer);
    }
    this.backpressureMonitor.removeAllListeners();
    this.removeAllListeners();
  }
}