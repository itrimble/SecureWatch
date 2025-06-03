/**
 * SecureWatch Distributed Tracing Implementation
 * OpenTelemetry integration with Jaeger backend
 */

import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { BatchSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { 
  trace, 
  context, 
  SpanStatusCode, 
  SpanKind,
  Span,
  Context,
  Tracer,
  SpanOptions,
  Attributes
} from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { AsyncHooksContextManager } from '@opentelemetry/context-async-hooks';

// Tracing Configuration
export interface TracingConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  jaegerEndpoint?: string;
  samplingRate?: number;
  enableConsoleExporter?: boolean;
  enableMetrics?: boolean;
  attributes?: Record<string, string>;
}

// Span Decorator Options
export interface SpanDecoratorOptions {
  name?: string;
  kind?: SpanKind;
  attributes?: Attributes;
  recordException?: boolean;
}

// Distributed Tracing Service
export class DistributedTracingService {
  private static instance: DistributedTracingService;
  private tracer!: Tracer;
  private provider!: NodeTracerProvider;
  private config!: TracingConfig;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): DistributedTracingService {
    if (!DistributedTracingService.instance) {
      DistributedTracingService.instance = new DistributedTracingService();
    }
    return DistributedTracingService.instance;
  }

  /**
   * Initialize distributed tracing
   */
  async initialize(config: TracingConfig): Promise<void> {
    if (this.isInitialized) {
      console.warn('Tracing already initialized');
      return;
    }

    this.config = config;

    // Create resource
    const resource = Resource.default().merge(
      new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: config.serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: config.serviceVersion,
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config.environment,
        ...config.attributes,
      })
    );

    // Create provider
    this.provider = new NodeTracerProvider({
      resource,
      sampler: {
        shouldSample: () => ({
          decision: Math.random() < (config.samplingRate || 0.1) ? 1 : 0,
          attributes: {},
        }),
      },
    });

    // Configure Jaeger exporter
    const jaegerExporter = new JaegerExporter({
      endpoint: config.jaegerEndpoint || 'http://jaeger-collector:14268/api/traces',
      username: process.env.JAEGER_USERNAME,
      password: process.env.JAEGER_PASSWORD,
    });

    // Add span processors
    this.provider.addSpanProcessor(new BatchSpanProcessor(jaegerExporter));

    // Add console exporter for development
    if (config.enableConsoleExporter) {
      this.provider.addSpanProcessor(
        new BatchSpanProcessor(new ConsoleSpanExporter())
      );
    }

    // Set global propagator
    this.provider.register({
      contextManager: new AsyncHooksContextManager(),
      propagator: new W3CTraceContextPropagator(),
    });

    // Register instrumentations
    registerInstrumentations({
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': {
            enabled: false, // Disable fs instrumentation to reduce noise
          },
          '@opentelemetry/instrumentation-http': {
            requestHook: (span, request) => {
              span.setAttributes({
                'http.request.body.size': request.headers['content-length'] || 0,
                'http.user_agent': request.headers['user-agent'] || 'unknown',
              });
            },
            responseHook: (span, response) => {
              span.setAttributes({
                'http.response.body.size': response.headers['content-length'] || 0,
              });
            },
          },
          '@opentelemetry/instrumentation-express': {
            requestHook: (span, info) => {
              span.setAttributes({
                'express.route': info.route,
                'express.type': info.layerType,
              });
            },
          },
        }),
      ],
    });

    // Initialize metrics if enabled
    if (config.enableMetrics) {
      await this.initializeMetrics();
    }

    // Get tracer
    this.tracer = trace.getTracer(config.serviceName, config.serviceVersion);

    this.isInitialized = true;
    console.log(`Distributed tracing initialized for ${config.serviceName}`);
  }

  /**
   * Initialize metrics collection
   */
  private async initializeMetrics(): Promise<void> {
    const prometheusExporter = new PrometheusExporter(
      {
        port: 9464,
        endpoint: '/metrics',
      },
      () => {
        console.log('Prometheus metrics server started on port 9464');
      }
    );

    const meterProvider = new MeterProvider({
      readers: [prometheusExporter],
    });

    // Set global meter provider
    meterProvider.addMetricReader(
      new PeriodicExportingMetricReader({
        exporter: prometheusExporter,
        exportIntervalMillis: 10000,
      })
    );
  }

  /**
   * Get tracer instance
   */
  getTracer(): Tracer {
    if (!this.isInitialized) {
      throw new Error('Tracing not initialized');
    }
    return this.tracer;
  }

  /**
   * Create a new span
   */
  createSpan(
    name: string,
    options?: SpanOptions,
    parentContext?: Context
  ): Span {
    const ctx = parentContext || context.active();
    return this.tracer.startSpan(name, options, ctx);
  }

  /**
   * Execute function with span
   */
  async withSpan<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    options?: SpanOptions
  ): Promise<T> {
    const span = this.createSpan(name, options);
    
    try {
      const result = await context.with(
        trace.setSpan(context.active(), span),
        async () => await fn(span)
      );
      
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Decorator for tracing methods
   */
  static trace(options: SpanDecoratorOptions = {}) {
    return function (
      target: any,
      propertyKey: string,
      descriptor: PropertyDescriptor
    ) {
      const originalMethod = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        const service = DistributedTracingService.getInstance();
        const spanName = options.name || `${target.constructor.name}.${propertyKey}`;
        
        return service.withSpan(
          spanName,
          async (span) => {
            // Set span attributes
            if (options.attributes) {
              span.setAttributes(options.attributes);
            }

            // Set span kind
            if (options.kind) {
              span.setKind(options.kind);
            }

            // Add method metadata
            span.setAttributes({
              'code.function': propertyKey,
              'code.namespace': target.constructor.name,
            });

            try {
              const result = await originalMethod.apply(this, args);
              return result;
            } catch (error) {
              if (options.recordException !== false) {
                span.recordException(error as Error);
              }
              throw error;
            }
          },
          { kind: options.kind || SpanKind.INTERNAL }
        );
      };

      return descriptor;
    };
  }

  /**
   * Extract trace context from headers
   */
  extractContext(headers: Record<string, string>): Context {
    const propagator = new W3CTraceContextPropagator();
    return propagator.extract(context.active(), headers, {
      get: (headers, key) => headers[key as string],
      keys: (headers) => Object.keys(headers),
    });
  }

  /**
   * Inject trace context into headers
   */
  injectContext(headers: Record<string, string>): void {
    const propagator = new W3CTraceContextPropagator();
    propagator.inject(context.active(), headers, {
      set: (headers, key, value) => {
        headers[key as string] = value;
      },
    });
  }

  /**
   * Create baggage for cross-service context propagation
   */
  setBaggage(key: string, value: string): void {
    const span = trace.getActiveSpan();
    if (span) {
      span.setAttribute(`baggage.${key}`, value);
    }
  }

  /**
   * Get baggage value
   */
  getBaggage(key: string): string | undefined {
    const span = trace.getActiveSpan();
    if (span) {
      const attributes = (span as any).attributes;
      return attributes[`baggage.${key}`];
    }
    return undefined;
  }

  /**
   * Shutdown tracing
   */
  async shutdown(): Promise<void> {
    if (this.provider) {
      await this.provider.shutdown();
      this.isInitialized = false;
      console.log('Distributed tracing shut down');
    }
  }
}

// Express middleware for tracing
export function tracingMiddleware() {
  return (req: any, res: any, next: any) => {
    const service = DistributedTracingService.getInstance();
    
    // Extract context from headers
    const parentContext = service.extractContext(req.headers);
    
    // Create span for request
    const span = service.createSpan(
      `${req.method} ${req.path}`,
      {
        kind: SpanKind.SERVER,
        attributes: {
          'http.method': req.method,
          'http.url': req.url,
          'http.target': req.path,
          'http.host': req.hostname,
          'http.scheme': req.protocol,
          'http.user_agent': req.headers['user-agent'] || 'unknown',
          'http.remote_addr': req.ip || req.connection.remoteAddress,
        },
      },
      parentContext
    );

    // Store span in request for later use
    req.span = span;

    // Hook into response to capture status
    const originalSend = res.send;
    res.send = function (data: any) {
      span.setAttributes({
        'http.status_code': res.statusCode,
        'http.response.size': Buffer.byteLength(data),
      });

      if (res.statusCode >= 400) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `HTTP ${res.statusCode}`,
        });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }

      span.end();
      return originalSend.call(this, data);
    };

    // Continue with context
    context.with(trace.setSpan(context.active(), span), () => {
      next();
    });
  };
}

// Helper to create child spans
export function createChildSpan(
  name: string,
  options?: SpanOptions
): Span {
  const service = DistributedTracingService.getInstance();
  return service.createSpan(name, options);
}

// Helper to get current span
export function getCurrentSpan(): Span | undefined {
  return trace.getActiveSpan();
}

// Export singleton instance
export const tracing = DistributedTracingService.getInstance();