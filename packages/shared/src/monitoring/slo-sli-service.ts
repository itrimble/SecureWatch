/**
 * SecureWatch SLO/SLI Monitoring Service
 * Service Level Objectives and Indicators tracking
 */

import { EventEmitter } from 'events';
import { Registry, Counter, Histogram, Gauge, Summary } from 'prom-client';

// SLI Types
export enum SLIType {
  AVAILABILITY = 'availability',
  LATENCY = 'latency',
  ERROR_RATE = 'error_rate',
  THROUGHPUT = 'throughput',
  SATURATION = 'saturation',
  CORRECTNESS = 'correctness'
}

// SLO Target Configuration
export interface SLOTarget {
  id: string;
  name: string;
  description: string;
  sliType: SLIType;
  target: number;
  window: string; // e.g., "7d", "30d", "90d"
  service: string;
  method?: string;
  tags?: Record<string, string>;
}

// SLI Measurement
export interface SLIMeasurement {
  timestamp: Date;
  value: number;
  sloId: string;
  labels: Record<string, string>;
}

// Error Budget
export interface ErrorBudget {
  sloId: string;
  totalBudget: number;
  consumed: number;
  remaining: number;
  burnRate: number;
  timeRemaining: number; // milliseconds
}

// SLO Report
export interface SLOReport {
  slo: SLOTarget;
  period: {
    start: Date;
    end: Date;
  };
  compliance: number;
  measurements: {
    total: number;
    good: number;
    bad: number;
  };
  errorBudget: ErrorBudget;
  violations: Array<{
    timestamp: Date;
    duration: number;
    severity: 'minor' | 'major' | 'critical';
  }>;
  trend: 'improving' | 'stable' | 'degrading';
}

// Burn Rate Alert
export interface BurnRateAlert {
  sloId: string;
  severity: 'warning' | 'critical';
  currentBurnRate: number;
  threshold: number;
  message: string;
  windowDuration: string;
}

export class SLOSLIService extends EventEmitter {
  private registry: Registry;
  private slos: Map<string, SLOTarget> = new Map();
  private measurements: Map<string, SLIMeasurement[]> = new Map();
  
  // Prometheus metrics
  private sliMetrics: Map<string, Histogram | Counter> = new Map();
  private sloComplianceGauge: Gauge;
  private errorBudgetGauge: Gauge;
  private burnRateGauge: Gauge;

  constructor(registry?: Registry) {
    super();
    this.registry = registry || new Registry();
    
    // Initialize metrics
    this.sloComplianceGauge = new Gauge({
      name: 'slo_compliance',
      help: 'Current SLO compliance percentage',
      labelNames: ['slo_id', 'service', 'sli_type'],
      registers: [this.registry],
    });

    this.errorBudgetGauge = new Gauge({
      name: 'error_budget_remaining',
      help: 'Remaining error budget percentage',
      labelNames: ['slo_id', 'service'],
      registers: [this.registry],
    });

    this.burnRateGauge = new Gauge({
      name: 'error_budget_burn_rate',
      help: 'Current error budget burn rate',
      labelNames: ['slo_id', 'service', 'window'],
      registers: [this.registry],
    });
  }

  /**
   * Register an SLO
   */
  registerSLO(slo: SLOTarget): void {
    this.slos.set(slo.id, slo);
    
    // Create appropriate metric based on SLI type
    switch (slo.sliType) {
      case SLIType.AVAILABILITY:
      case SLIType.ERROR_RATE:
        this.sliMetrics.set(slo.id, new Counter({
          name: `sli_${slo.sliType}_${slo.id}`,
          help: `SLI metric for ${slo.name}`,
          labelNames: ['status', 'service', 'method'],
          registers: [this.registry],
        }));
        break;
        
      case SLIType.LATENCY:
        this.sliMetrics.set(slo.id, new Histogram({
          name: `sli_latency_${slo.id}`,
          help: `Latency SLI for ${slo.name}`,
          labelNames: ['service', 'method', 'status'],
          buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
          registers: [this.registry],
        }));
        break;
        
      case SLIType.THROUGHPUT:
      case SLIType.SATURATION:
        this.sliMetrics.set(slo.id, new Gauge({
          name: `sli_${slo.sliType}_${slo.id}`,
          help: `${slo.sliType} SLI for ${slo.name}`,
          labelNames: ['service', 'resource'],
          registers: [this.registry],
        }));
        break;
    }

    console.log(`Registered SLO: ${slo.name} (${slo.id})`);
  }

  /**
   * Record an SLI measurement
   */
  recordSLI(sloId: string, value: number, labels: Record<string, string> = {}): void {
    const slo = this.slos.get(sloId);
    if (!slo) {
      console.error(`SLO not found: ${sloId}`);
      return;
    }

    // Record in Prometheus metrics
    const metric = this.sliMetrics.get(sloId);
    if (metric) {
      switch (slo.sliType) {
        case SLIType.AVAILABILITY:
        case SLIType.ERROR_RATE:
          (metric as Counter).inc(labels);
          break;
        case SLIType.LATENCY:
          (metric as Histogram).observe(labels, value);
          break;
        case SLIType.THROUGHPUT:
        case SLIType.SATURATION:
          (metric as Gauge).set(labels, value);
          break;
      }
    }

    // Store measurement
    const measurement: SLIMeasurement = {
      timestamp: new Date(),
      value,
      sloId,
      labels,
    };

    if (!this.measurements.has(sloId)) {
      this.measurements.set(sloId, []);
    }
    this.measurements.get(sloId)!.push(measurement);

    // Check for violations
    this.checkViolations(slo, measurement);
    
    // Update compliance metrics
    this.updateComplianceMetrics(slo);
  }

  /**
   * Calculate SLO compliance
   */
  calculateCompliance(sloId: string, window?: string): number {
    const slo = this.slos.get(sloId);
    if (!slo) return 0;

    const measurements = this.getMeasurementsInWindow(sloId, window || slo.window);
    if (measurements.length === 0) return 100;

    let goodCount = 0;
    const totalCount = measurements.length;

    switch (slo.sliType) {
      case SLIType.AVAILABILITY:
        goodCount = measurements.filter(m => m.value === 1).length;
        break;
        
      case SLIType.ERROR_RATE:
        goodCount = measurements.filter(m => m.value < (1 - slo.target)).length;
        break;
        
      case SLIType.LATENCY:
        goodCount = measurements.filter(m => m.value <= slo.target).length;
        break;
        
      case SLIType.THROUGHPUT:
        goodCount = measurements.filter(m => m.value >= slo.target).length;
        break;
        
      case SLIType.SATURATION:
        goodCount = measurements.filter(m => m.value < slo.target).length;
        break;
    }

    return (goodCount / totalCount) * 100;
  }

  /**
   * Calculate error budget
   */
  calculateErrorBudget(sloId: string): ErrorBudget {
    const slo = this.slos.get(sloId);
    if (!slo) {
      throw new Error(`SLO not found: ${sloId}`);
    }

    const compliance = this.calculateCompliance(sloId);
    const targetCompliance = slo.target * 100;
    const totalBudget = 100 - targetCompliance;
    const consumed = Math.max(0, targetCompliance - compliance);
    const remaining = Math.max(0, totalBudget - consumed);
    
    // Calculate burn rate
    const windowMs = this.parseWindow(slo.window);
    const measurements = this.getMeasurementsInWindow(sloId, slo.window);
    const burnRate = this.calculateBurnRate(slo, measurements, windowMs);
    
    // Calculate time remaining at current burn rate
    const timeRemaining = remaining > 0 && burnRate > 0 
      ? (remaining / burnRate) * windowMs 
      : Infinity;

    return {
      sloId,
      totalBudget,
      consumed,
      remaining,
      burnRate,
      timeRemaining,
    };
  }

  /**
   * Generate SLO report
   */
  generateReport(sloId: string, startDate?: Date, endDate?: Date): SLOReport {
    const slo = this.slos.get(sloId);
    if (!slo) {
      throw new Error(`SLO not found: ${sloId}`);
    }

    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - this.parseWindow(slo.window));
    
    const measurements = this.measurements.get(sloId)?.filter(
      m => m.timestamp >= start && m.timestamp <= end
    ) || [];

    const compliance = this.calculateCompliance(sloId);
    const errorBudget = this.calculateErrorBudget(sloId);
    const violations = this.detectViolations(slo, measurements);
    const trend = this.analyzeTrend(slo, measurements);

    let good = 0, bad = 0;
    measurements.forEach(m => {
      if (this.isMeasurementGood(slo, m)) {
        good++;
      } else {
        bad++;
      }
    });

    return {
      slo,
      period: { start, end },
      compliance,
      measurements: {
        total: measurements.length,
        good,
        bad,
      },
      errorBudget,
      violations,
      trend,
    };
  }

  /**
   * Check burn rate alerts
   */
  checkBurnRateAlerts(): BurnRateAlert[] {
    const alerts: BurnRateAlert[] = [];

    for (const [sloId, slo] of this.slos) {
      // Check multiple burn rate windows
      const windows = [
        { duration: '1h', warningThreshold: 14.4, criticalThreshold: 36 },
        { duration: '6h', warningThreshold: 6, criticalThreshold: 15 },
        { duration: '1d', warningThreshold: 3, criticalThreshold: 7.5 },
        { duration: '3d', warningThreshold: 1, criticalThreshold: 2.5 },
      ];

      for (const window of windows) {
        const measurements = this.getMeasurementsInWindow(sloId, window.duration);
        const burnRate = this.calculateBurnRate(slo, measurements, this.parseWindow(window.duration));

        if (burnRate >= window.criticalThreshold) {
          alerts.push({
            sloId,
            severity: 'critical',
            currentBurnRate: burnRate,
            threshold: window.criticalThreshold,
            message: `Critical burn rate: ${burnRate.toFixed(2)}x in ${window.duration} window`,
            windowDuration: window.duration,
          });
        } else if (burnRate >= window.warningThreshold) {
          alerts.push({
            sloId,
            severity: 'warning',
            currentBurnRate: burnRate,
            threshold: window.warningThreshold,
            message: `High burn rate: ${burnRate.toFixed(2)}x in ${window.duration} window`,
            windowDuration: window.duration,
          });
        }
      }
    }

    return alerts;
  }

  /**
   * Get measurements in time window
   */
  private getMeasurementsInWindow(sloId: string, window: string): SLIMeasurement[] {
    const windowMs = this.parseWindow(window);
    const cutoff = new Date(Date.now() - windowMs);
    
    return this.measurements.get(sloId)?.filter(
      m => m.timestamp >= cutoff
    ) || [];
  }

  /**
   * Parse window string to milliseconds
   */
  private parseWindow(window: string): number {
    const match = window.match(/^(\d+)([hdwmy])$/);
    if (!match) {
      throw new Error(`Invalid window format: ${window}`);
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      case 'w': return value * 7 * 24 * 60 * 60 * 1000;
      case 'm': return value * 30 * 24 * 60 * 60 * 1000;
      case 'y': return value * 365 * 24 * 60 * 60 * 1000;
      default: throw new Error(`Unknown time unit: ${unit}`);
    }
  }

  /**
   * Check if measurement is good
   */
  private isMeasurementGood(slo: SLOTarget, measurement: SLIMeasurement): boolean {
    switch (slo.sliType) {
      case SLIType.AVAILABILITY:
        return measurement.value === 1;
      case SLIType.ERROR_RATE:
        return measurement.value < (1 - slo.target);
      case SLIType.LATENCY:
        return measurement.value <= slo.target;
      case SLIType.THROUGHPUT:
        return measurement.value >= slo.target;
      case SLIType.SATURATION:
        return measurement.value < slo.target;
      case SLIType.CORRECTNESS:
        return measurement.value >= slo.target;
      default:
        return true;
    }
  }

  /**
   * Check for violations
   */
  private checkViolations(slo: SLOTarget, measurement: SLIMeasurement): void {
    if (!this.isMeasurementGood(slo, measurement)) {
      this.emit('sloViolation', {
        slo,
        measurement,
        severity: this.getViolationSeverity(slo, measurement),
      });
    }
  }

  /**
   * Detect violation periods
   */
  private detectViolations(
    slo: SLOTarget, 
    measurements: SLIMeasurement[]
  ): SLOReport['violations'] {
    const violations: SLOReport['violations'] = [];
    let violationStart: Date | null = null;

    for (const measurement of measurements) {
      const isGood = this.isMeasurementGood(slo, measurement);
      
      if (!isGood && !violationStart) {
        violationStart = measurement.timestamp;
      } else if (isGood && violationStart) {
        const duration = measurement.timestamp.getTime() - violationStart.getTime();
        violations.push({
          timestamp: violationStart,
          duration,
          severity: this.getViolationDurationSeverity(duration),
        });
        violationStart = null;
      }
    }

    // Handle ongoing violation
    if (violationStart) {
      const duration = Date.now() - violationStart.getTime();
      violations.push({
        timestamp: violationStart,
        duration,
        severity: this.getViolationDurationSeverity(duration),
      });
    }

    return violations;
  }

  /**
   * Get violation severity
   */
  private getViolationSeverity(slo: SLOTarget, measurement: SLIMeasurement): string {
    const deviation = Math.abs(measurement.value - slo.target) / slo.target;
    
    if (deviation > 0.5) return 'critical';
    if (deviation > 0.2) return 'major';
    return 'minor';
  }

  /**
   * Get violation duration severity
   */
  private getViolationDurationSeverity(duration: number): 'minor' | 'major' | 'critical' {
    const minutes = duration / (60 * 1000);
    
    if (minutes > 60) return 'critical';
    if (minutes > 15) return 'major';
    return 'minor';
  }

  /**
   * Calculate burn rate
   */
  private calculateBurnRate(
    slo: SLOTarget,
    measurements: SLIMeasurement[],
    windowMs: number
  ): number {
    if (measurements.length === 0) return 0;

    const badMeasurements = measurements.filter(m => !this.isMeasurementGood(slo, m)).length;
    const errorRate = badMeasurements / measurements.length;
    const allowedErrorRate = 1 - slo.target;
    
    return allowedErrorRate > 0 ? errorRate / allowedErrorRate : 0;
  }

  /**
   * Analyze trend
   */
  private analyzeTrend(
    slo: SLOTarget,
    measurements: SLIMeasurement[]
  ): 'improving' | 'stable' | 'degrading' {
    if (measurements.length < 10) return 'stable';

    // Split measurements into two halves
    const midpoint = Math.floor(measurements.length / 2);
    const firstHalf = measurements.slice(0, midpoint);
    const secondHalf = measurements.slice(midpoint);

    const firstHalfGood = firstHalf.filter(m => this.isMeasurementGood(slo, m)).length;
    const secondHalfGood = secondHalf.filter(m => this.isMeasurementGood(slo, m)).length;

    const firstHalfRate = firstHalfGood / firstHalf.length;
    const secondHalfRate = secondHalfGood / secondHalf.length;

    const difference = secondHalfRate - firstHalfRate;

    if (difference > 0.05) return 'improving';
    if (difference < -0.05) return 'degrading';
    return 'stable';
  }

  /**
   * Update compliance metrics
   */
  private updateComplianceMetrics(slo: SLOTarget): void {
    const compliance = this.calculateCompliance(slo.id);
    const errorBudget = this.calculateErrorBudget(slo.id);

    this.sloComplianceGauge.set(
      { slo_id: slo.id, service: slo.service, sli_type: slo.sliType },
      compliance
    );

    this.errorBudgetGauge.set(
      { slo_id: slo.id, service: slo.service },
      errorBudget.remaining
    );

    this.burnRateGauge.set(
      { slo_id: slo.id, service: slo.service, window: slo.window },
      errorBudget.burnRate
    );
  }

  /**
   * Export metrics for Prometheus
   */
  getMetrics(): string {
    return this.registry.metrics();
  }

  /**
   * Get all SLO statuses
   */
  getAllSLOStatuses(): Array<{
    slo: SLOTarget;
    compliance: number;
    errorBudget: ErrorBudget;
    status: 'healthy' | 'at_risk' | 'breached';
  }> {
    const statuses = [];

    for (const [sloId, slo] of this.slos) {
      const compliance = this.calculateCompliance(sloId);
      const errorBudget = this.calculateErrorBudget(sloId);
      
      let status: 'healthy' | 'at_risk' | 'breached';
      if (compliance < slo.target * 100) {
        status = 'breached';
      } else if (errorBudget.remaining < 20) {
        status = 'at_risk';
      } else {
        status = 'healthy';
      }

      statuses.push({ slo, compliance, errorBudget, status });
    }

    return statuses;
  }
}

// Export singleton instance
export const sloSliService = new SLOSLIService();