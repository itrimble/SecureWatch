/**
 * SecureWatch User Experience Monitoring
 * Real User Monitoring (RUM) and synthetic monitoring
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

// Performance Metrics
export interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  
  // Additional metrics
  ttfb?: number; // Time to First Byte
  fcp?: number; // First Contentful Paint
  tti?: number; // Time to Interactive
  tbt?: number; // Total Blocking Time
  
  // Navigation timing
  domContentLoaded?: number;
  loadComplete?: number;
  
  // Resource timing
  resourceLoadTime?: number;
  resourceCount?: number;
  resourceSize?: number;
}

// User Journey
export interface UserJourney {
  sessionId: string;
  userId?: string;
  startTime: Date;
  endTime?: Date;
  pages: PageView[];
  interactions: UserInteraction[];
  errors: UserError[];
  performance: PerformanceMetrics;
  satisfaction?: number; // 1-5 scale
  completed: boolean;
}

// Page View
export interface PageView {
  url: string;
  title: string;
  timestamp: Date;
  loadTime: number;
  referrer?: string;
  exitPage?: boolean;
}

// User Interaction
export interface UserInteraction {
  type: 'click' | 'scroll' | 'form' | 'search' | 'navigation';
  target: string;
  timestamp: Date;
  value?: any;
  duration?: number;
}

// User Error
export interface UserError {
  type: 'javascript' | 'network' | 'timeout' | 'crash';
  message: string;
  stack?: string;
  timestamp: Date;
  url: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
}

// Apdex Score (Application Performance Index)
export interface ApdexScore {
  score: number; // 0-1
  satisfied: number;
  tolerating: number;
  frustrated: number;
  total: number;
  threshold: {
    satisfied: number; // ms
    tolerating: number; // ms
  };
}

export class UserExperienceMonitor extends EventEmitter {
  private sessions: Map<string, UserJourney> = new Map();
  private apdexThreshold = {
    satisfied: 500, // 500ms
    tolerating: 2000, // 2s
  };

  /**
   * Start a new user session
   */
  startSession(sessionId: string, userId?: string): void {
    const journey: UserJourney = {
      sessionId,
      userId,
      startTime: new Date(),
      pages: [],
      interactions: [],
      errors: [],
      performance: {},
      completed: false,
    };

    this.sessions.set(sessionId, journey);
    this.emit('sessionStart', journey);
  }

  /**
   * Record page view
   */
  recordPageView(sessionId: string, pageView: Omit<PageView, 'timestamp'>): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const view: PageView = {
      ...pageView,
      timestamp: new Date(),
    };

    session.pages.push(view);
    this.emit('pageView', { sessionId, pageView: view });

    // Update performance metrics
    if (view.loadTime) {
      this.updateApdexScore(view.loadTime);
    }
  }

  /**
   * Record user interaction
   */
  recordInteraction(
    sessionId: string,
    interaction: Omit<UserInteraction, 'timestamp'>
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const event: UserInteraction = {
      ...interaction,
      timestamp: new Date(),
    };

    session.interactions.push(event);
    this.emit('userInteraction', { sessionId, interaction: event });
  }

  /**
   * Record user error
   */
  recordError(sessionId: string, error: Omit<UserError, 'timestamp'>): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const userError: UserError = {
      ...error,
      timestamp: new Date(),
    };

    session.errors.push(userError);
    this.emit('userError', { sessionId, error: userError });

    // Alert on critical errors
    if (userError.impact === 'critical') {
      this.emit('criticalError', { sessionId, error: userError });
    }
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics(sessionId: string, metrics: PerformanceMetrics): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.performance = {
      ...session.performance,
      ...metrics,
    };

    this.emit('performanceUpdate', { sessionId, metrics });
    this.checkPerformanceThresholds(sessionId, metrics);
  }

  /**
   * Calculate user satisfaction score
   */
  calculateSatisfactionScore(sessionId: string): number {
    const session = this.sessions.get(sessionId);
    if (!session) return 0;

    let score = 5; // Start with perfect score

    // Deduct for errors
    score -= session.errors.length * 0.5;
    score -= session.errors.filter(e => e.impact === 'critical').length * 1;

    // Deduct for slow page loads
    const avgLoadTime = session.pages.reduce((sum, p) => sum + p.loadTime, 0) / session.pages.length;
    if (avgLoadTime > 3000) score -= 1;
    else if (avgLoadTime > 2000) score -= 0.5;

    // Deduct for poor web vitals
    if (session.performance.lcp && session.performance.lcp > 2500) score -= 0.5;
    if (session.performance.fid && session.performance.fid > 100) score -= 0.5;
    if (session.performance.cls && session.performance.cls > 0.1) score -= 0.5;

    return Math.max(1, Math.min(5, score));
  }

  /**
   * End user session
   */
  endSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.endTime = new Date();
    session.completed = true;
    session.satisfaction = this.calculateSatisfactionScore(sessionId);

    this.emit('sessionEnd', session);
    
    // Archive session data
    this.archiveSession(session);
    this.sessions.delete(sessionId);
  }

  /**
   * Get Apdex score
   */
  getApdexScore(): ApdexScore {
    const measurements = this.getRecentMeasurements();
    
    let satisfied = 0;
    let tolerating = 0;
    let frustrated = 0;

    measurements.forEach(time => {
      if (time <= this.apdexThreshold.satisfied) {
        satisfied++;
      } else if (time <= this.apdexThreshold.tolerating) {
        tolerating++;
      } else {
        frustrated++;
      }
    });

    const total = satisfied + tolerating + frustrated;
    const score = total > 0 ? (satisfied + tolerating / 2) / total : 1;

    return {
      score,
      satisfied,
      tolerating,
      frustrated,
      total,
      threshold: this.apdexThreshold,
    };
  }

  /**
   * Get user flow analysis
   */
  getUserFlowAnalysis(): any {
    const flows: Record<string, number> = {};
    const dropoffs: Record<string, number> = {};

    this.sessions.forEach(session => {
      // Analyze page flow
      for (let i = 0; i < session.pages.length - 1; i++) {
        const from = session.pages[i].url;
        const to = session.pages[i + 1].url;
        const flowKey = `${from} -> ${to}`;
        flows[flowKey] = (flows[flowKey] || 0) + 1;
      }

      // Analyze dropoffs
      if (session.pages.length > 0) {
        const lastPage = session.pages[session.pages.length - 1];
        if (lastPage.exitPage) {
          dropoffs[lastPage.url] = (dropoffs[lastPage.url] || 0) + 1;
        }
      }
    });

    return {
      flows: Object.entries(flows)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
      dropoffs: Object.entries(dropoffs)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
    };
  }

  /**
   * Get error summary
   */
  getErrorSummary(): any {
    const errors: Record<string, { count: number; impact: string }> = {};

    this.sessions.forEach(session => {
      session.errors.forEach(error => {
        const key = `${error.type}:${error.message}`;
        if (!errors[key]) {
          errors[key] = { count: 0, impact: error.impact };
        }
        errors[key].count++;
      });
    });

    return Object.entries(errors)
      .map(([key, data]) => ({
        error: key,
        count: data.count,
        impact: data.impact,
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): any {
    const metrics: Record<string, number[]> = {
      lcp: [],
      fid: [],
      cls: [],
      ttfb: [],
      loadTime: [],
    };

    this.sessions.forEach(session => {
      if (session.performance.lcp) metrics.lcp.push(session.performance.lcp);
      if (session.performance.fid) metrics.fid.push(session.performance.fid);
      if (session.performance.cls) metrics.cls.push(session.performance.cls);
      if (session.performance.ttfb) metrics.ttfb.push(session.performance.ttfb);
      
      session.pages.forEach(page => {
        metrics.loadTime.push(page.loadTime);
      });
    });

    const summary: any = {};
    
    Object.entries(metrics).forEach(([metric, values]) => {
      if (values.length > 0) {
        summary[metric] = {
          p50: this.percentile(values, 50),
          p75: this.percentile(values, 75),
          p95: this.percentile(values, 95),
          p99: this.percentile(values, 99),
          avg: values.reduce((a, b) => a + b, 0) / values.length,
        };
      }
    });

    return summary;
  }

  /**
   * Check performance thresholds
   */
  private checkPerformanceThresholds(sessionId: string, metrics: PerformanceMetrics): void {
    const alerts: string[] = [];

    // Check Core Web Vitals
    if (metrics.lcp && metrics.lcp > 4000) {
      alerts.push(`Poor LCP: ${metrics.lcp}ms (threshold: 2500ms)`);
    }

    if (metrics.fid && metrics.fid > 300) {
      alerts.push(`Poor FID: ${metrics.fid}ms (threshold: 100ms)`);
    }

    if (metrics.cls && metrics.cls > 0.25) {
      alerts.push(`Poor CLS: ${metrics.cls} (threshold: 0.1)`);
    }

    if (alerts.length > 0) {
      this.emit('performanceAlert', {
        sessionId,
        alerts,
        metrics,
      });
    }
  }

  /**
   * Update Apdex score
   */
  private updateApdexScore(responseTime: number): void {
    // This would typically update a rolling window of measurements
    // For now, we'll emit an event
    this.emit('apdexMeasurement', { responseTime });
  }

  /**
   * Get recent measurements
   */
  private getRecentMeasurements(): number[] {
    // In a real implementation, this would return actual measurements
    // from a time-series database or circular buffer
    const measurements: number[] = [];
    
    this.sessions.forEach(session => {
      session.pages.forEach(page => {
        measurements.push(page.loadTime);
      });
    });

    return measurements;
  }

  /**
   * Calculate percentile
   */
  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Archive session data
   */
  private archiveSession(session: UserJourney): void {
    // In a real implementation, this would store session data
    // in a time-series database for historical analysis
    console.log(`Archiving session ${session.sessionId} with satisfaction score ${session.satisfaction}`);
  }
}

// Browser-side RUM script
export const rumScript = `
(function() {
  const sessionId = Math.random().toString(36).substring(2);
  const apiEndpoint = '/api/rum';
  
  // Track page views
  function trackPageView() {
    const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
    
    fetch(apiEndpoint + '/pageview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        url: window.location.href,
        title: document.title,
        loadTime,
        referrer: document.referrer,
      }),
    });
  }
  
  // Track Core Web Vitals
  function trackWebVitals() {
    if ('PerformanceObserver' in window) {
      // LCP
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        fetch(apiEndpoint + '/performance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            lcp: lastEntry.renderTime || lastEntry.loadTime,
          }),
        });
      }).observe({ entryTypes: ['largest-contentful-paint'] });
      
      // FID
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const firstInput = entries[0];
        
        fetch(apiEndpoint + '/performance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            fid: firstInput.processingStart - firstInput.startTime,
          }),
        });
      }).observe({ entryTypes: ['first-input'] });
      
      // CLS
      let clsValue = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        
        fetch(apiEndpoint + '/performance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            cls: clsValue,
          }),
        });
      }).observe({ entryTypes: ['layout-shift'] });
    }
  }
  
  // Track errors
  window.addEventListener('error', (event) => {
    fetch(apiEndpoint + '/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        type: 'javascript',
        message: event.message,
        stack: event.error?.stack,
        url: event.filename,
        line: event.lineno,
        column: event.colno,
      }),
    });
  });
  
  // Track unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    fetch(apiEndpoint + '/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        type: 'javascript',
        message: event.reason?.message || 'Unhandled Promise Rejection',
        stack: event.reason?.stack,
        url: window.location.href,
      }),
    });
  });
  
  // Initialize
  window.addEventListener('load', () => {
    trackPageView();
    trackWebVitals();
  });
  
  // Track page unload
  window.addEventListener('beforeunload', () => {
    navigator.sendBeacon(apiEndpoint + '/session/end', JSON.stringify({ sessionId }));
  });
})();
`;

// Export singleton
export const userExperienceMonitor = new UserExperienceMonitor();