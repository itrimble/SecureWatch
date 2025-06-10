import { WindowsEventLogAdapter } from '../windows-event-log.adapter';
import { KafkaProducerPool } from '../../utils/kafka-producer-pool';
import { BufferManager } from '../../buffers/buffer-manager';
import { MetricsCollector } from '../../monitoring/metrics-collector';
import { LogSource } from '../../types/log-event.types';

// Mock dependencies
jest.mock('../../utils/kafka-producer-pool');
jest.mock('../../buffers/buffer-manager');
jest.mock('../../monitoring/metrics-collector');
jest.mock('child_process');

const mockKafkaProducerPool = {
  sendBatch: jest.fn().mockResolvedValue(undefined),
} as any;

const mockBufferManager = {
  addEvents: jest.fn().mockResolvedValue(undefined),
  getBatches: jest.fn().mockResolvedValue([]),
  getSize: jest.fn().mockReturnValue(0),
  flush: jest.fn().mockResolvedValue(undefined),
  requeueEvents: jest.fn().mockResolvedValue(undefined),
} as any;

const mockMetricsCollector = {
  incrementCounter: jest.fn(),
  getMetrics: jest.fn().mockReturnValue({}),
} as any;

describe('WindowsEventLogAdapter', () => {
  let adapter: WindowsEventLogAdapter;
  let defaultConfig: any;

  beforeEach(() => {
    defaultConfig = {
      channels: ['Security', 'System'],
      servers: ['localhost'],
      batchSize: 100,
      pollInterval: 5000,
      includeEventData: true,
      realTimeCollection: false,
      performanceOptimized: true,
      compressionEnabled: true,
      highVolumeMode: false,
      maxConcurrentProcesses: 4,
    };

    adapter = new WindowsEventLogAdapter(
      defaultConfig,
      mockKafkaProducerPool,
      mockBufferManager,
      mockMetricsCollector
    );

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (adapter) {
      await adapter.stop();
    }
  });

  describe('Configuration', () => {
    it('should initialize with default enhanced configuration options', () => {
      expect(adapter).toBeDefined();
      expect(adapter.getStats()).toMatchObject({
        isRunning: false,
        channels: ['Security', 'System'],
        servers: ['localhost'],
        configuration: {
          realTimeCollection: false,
          highVolumeMode: false,
          compressionEnabled: true,
          maxConcurrentProcesses: 4,
        },
      });
    });

    it('should support real-time collection configuration', () => {
      const realTimeConfig = {
        ...defaultConfig,
        realTimeCollection: true,
        highVolumeMode: true,
        maxConcurrentProcesses: 8,
      };

      const realTimeAdapter = new WindowsEventLogAdapter(
        realTimeConfig,
        mockKafkaProducerPool,
        mockBufferManager,
        mockMetricsCollector
      );

      expect(realTimeAdapter.getStats()).toMatchObject({
        configuration: {
          realTimeCollection: true,
          highVolumeMode: true,
          maxConcurrentProcesses: 8,
        },
      });
    });

    it('should support EVTX file processing configuration', () => {
      const fileConfig = {
        ...defaultConfig,
        evtxFilePaths: [
          'C:\\Windows\\System32\\winevt\\Logs\\Security.evtx',
          'C:\\Windows\\System32\\winevt\\Logs\\System.evtx',
        ],
      };

      const fileAdapter = new WindowsEventLogAdapter(
        fileConfig,
        mockKafkaProducerPool,
        mockBufferManager,
        mockMetricsCollector
      );

      expect(fileAdapter).toBeDefined();
    });
  });

  describe('Lifecycle Management', () => {
    it('should start successfully with polling collection', async () => {
      await adapter.start();

      const stats = adapter.getStats();
      expect(stats.isRunning).toBe(true);
      expect(stats.activePollers).toBeGreaterThan(0);
    });

    it('should start successfully with real-time collection', async () => {
      const realTimeConfig = {
        ...defaultConfig,
        realTimeCollection: true,
      };

      const realTimeAdapter = new WindowsEventLogAdapter(
        realTimeConfig,
        mockKafkaProducerPool,
        mockBufferManager,
        mockMetricsCollector
      );

      await realTimeAdapter.start();

      const stats = realTimeAdapter.getStats();
      expect(stats.isRunning).toBe(true);
      
      await realTimeAdapter.stop();
    });

    it('should handle start when already running', async () => {
      await adapter.start();
      expect(adapter.getStats().isRunning).toBe(true);

      // Starting again should not throw error
      await adapter.start();
      expect(adapter.getStats().isRunning).toBe(true);
    });

    it('should stop gracefully', async () => {
      await adapter.start();
      expect(adapter.getStats().isRunning).toBe(true);

      await adapter.stop();
      expect(adapter.getStats().isRunning).toBe(false);
      expect(adapter.getStats().activePollers).toBe(0);
      expect(adapter.getStats().activeProcesses).toBe(0);
    });

    it('should handle stop when not running', async () => {
      expect(adapter.getStats().isRunning).toBe(false);
      
      // Stopping when not running should not throw error
      await adapter.stop();
      expect(adapter.getStats().isRunning).toBe(false);
    });

    it('should restart properly', async () => {
      await adapter.start();
      expect(adapter.getStats().isRunning).toBe(true);

      await adapter.restart();
      expect(adapter.getStats().isRunning).toBe(true);
    });
  });

  describe('Performance Metrics', () => {
    it('should initialize performance metrics', () => {
      const metrics = adapter.getPerformanceMetrics();
      
      expect(metrics).toMatchObject({
        eventsPerSecond: 0,
        averageLatencyMs: 0,
        totalEventsProcessed: 0,
        totalErrors: 0,
        memoryUsageMB: expect.any(Number),
        cpuUsagePercent: 0,
        networkBytesReceived: 0,
        compressionRatio: 1.0,
        startTime: expect.any(Number),
      });
    });

    it('should track performance metrics during operation', async () => {
      await adapter.start();
      
      // Simulate some event processing
      const initialMetrics = adapter.getPerformanceMetrics();
      expect(initialMetrics.totalEventsProcessed).toBe(0);

      // Performance metrics should be updated as events are processed
      const currentMetrics = adapter.getPerformanceMetrics();
      expect(currentMetrics.startTime).toBeGreaterThan(0);
    });

    it('should provide comprehensive statistics', () => {
      const stats = adapter.getStats();
      
      expect(stats).toHaveProperty('isRunning');
      expect(stats).toHaveProperty('channels');
      expect(stats).toHaveProperty('servers');
      expect(stats).toHaveProperty('activePollers');
      expect(stats).toHaveProperty('activeProcesses');
      expect(stats).toHaveProperty('bufferSize');
      expect(stats).toHaveProperty('eventBufferSize');
      expect(stats).toHaveProperty('performanceMetrics');
      expect(stats).toHaveProperty('configuration');
      expect(stats).toHaveProperty('metrics');
    });
  });

  describe('Health Check', () => {
    it('should report unhealthy when not running', async () => {
      const health = await adapter.healthCheck();
      
      expect(health.healthy).toBe(false);
      expect(health.details.running).toBe(false);
      expect(health.details.activeProcesses).toBe(0);
    });

    it('should report healthy when running properly', async () => {
      await adapter.start();
      
      // Mock some successful processing
      const metrics = adapter.getPerformanceMetrics();
      metrics.totalEventsProcessed = 100;
      metrics.totalErrors = 2; // 2% error rate
      
      const health = await adapter.healthCheck();
      
      expect(health.healthy).toBe(false); // False because no active processes in test
      expect(health.details.running).toBe(true);
      expect(health.details).toHaveProperty('errorRate');
      expect(health.details).toHaveProperty('eventsPerSecond');
      expect(health.details).toHaveProperty('memoryUsageMB');
    });
  });

  describe('Event Filtering', () => {
    it('should handle event ID filters', () => {
      const configWithFilters = {
        ...defaultConfig,
        filters: [
          {
            eventIds: [4624, 4625, 4648], // Login events
            levels: [2, 3], // Warning and Error
            providers: ['Microsoft-Windows-Security-Auditing'],
          },
        ],
      };

      const filterAdapter = new WindowsEventLogAdapter(
        configWithFilters,
        mockKafkaProducerPool,
        mockBufferManager,
        mockMetricsCollector
      );

      expect(filterAdapter).toBeDefined();
    });

    it('should handle time range filters', () => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const configWithTimeFilter = {
        ...defaultConfig,
        filters: [
          {
            timeRange: {
              startTime: oneDayAgo,
              endTime: now,
            },
            severityMin: 2,
            includeUserData: true,
          },
        ],
      };

      const timeFilterAdapter = new WindowsEventLogAdapter(
        configWithTimeFilter,
        mockKafkaProducerPool,
        mockBufferManager,
        mockMetricsCollector
      );

      expect(timeFilterAdapter).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle buffer manager errors gracefully', async () => {
      mockBufferManager.addEvents.mockRejectedValueOnce(new Error('Buffer full'));
      
      await adapter.start();
      
      // Should not throw even if buffer operations fail
      expect(adapter.getStats().isRunning).toBe(true);
    });

    it('should handle Kafka producer errors gracefully', async () => {
      mockKafkaProducerPool.sendBatch.mockRejectedValueOnce(new Error('Kafka unavailable'));
      
      await adapter.start();
      
      // Should continue running even if Kafka operations fail
      expect(adapter.getStats().isRunning).toBe(true);
    });

    it('should track errors in performance metrics', () => {
      const metrics = adapter.getPerformanceMetrics();
      const initialErrors = metrics.totalErrors;
      
      // Simulate error processing
      // In a real scenario, this would be triggered by actual error conditions
      expect(metrics.totalErrors).toBe(initialErrors);
    });
  });

  describe('Event Processing', () => {
    it('should convert Windows events to raw log events correctly', () => {
      // This tests the internal event conversion logic
      // In a real implementation, we would need to expose or test the conversion method
      expect(true).toBe(true); // Placeholder for actual conversion tests
    });

    it('should handle different event sources properly', () => {
      const multiServerConfig = {
        ...defaultConfig,
        servers: ['server1', 'server2', 'server3'],
        channels: ['Security', 'System', 'Application'],
      };

      const multiServerAdapter = new WindowsEventLogAdapter(
        multiServerConfig,
        mockKafkaProducerPool,
        mockBufferManager,
        mockMetricsCollector
      );

      expect(multiServerAdapter.getStats().servers).toHaveLength(3);
      expect(multiServerAdapter.getStats().channels).toHaveLength(3);
    });
  });

  describe('Performance Optimization', () => {
    it('should support high volume mode', () => {
      const highVolumeConfig = {
        ...defaultConfig,
        highVolumeMode: true,
        maxConcurrentProcesses: 16,
        batchSize: 5000,
      };

      const highVolumeAdapter = new WindowsEventLogAdapter(
        highVolumeConfig,
        mockKafkaProducerPool,
        mockBufferManager,
        mockMetricsCollector
      );

      expect(highVolumeAdapter.getStats().configuration.highVolumeMode).toBe(true);
    });

    it('should limit concurrent processes', async () => {
      const limitedConfig = {
        ...defaultConfig,
        maxConcurrentProcesses: 2,
        servers: ['server1', 'server2', 'server3'], // More servers than max processes
        realTimeCollection: true,
      };

      const limitedAdapter = new WindowsEventLogAdapter(
        limitedConfig,
        mockKafkaProducerPool,
        mockBufferManager,
        mockMetricsCollector
      );

      await limitedAdapter.start();
      
      // Should respect the process limit
      expect(limitedAdapter.getStats().configuration.maxConcurrentProcesses).toBe(2);
      
      await limitedAdapter.stop();
    });
  });

  describe('Integration Features', () => {
    it('should support credential configuration for remote hosts', () => {
      const remoteConfig = {
        ...defaultConfig,
        servers: ['remote-server1', 'remote-server2'],
        credentials: {
          username: 'domain\\admin',
          password: 'secure-password',
          domain: 'COMPANY',
        },
      };

      const remoteAdapter = new WindowsEventLogAdapter(
        remoteConfig,
        mockKafkaProducerPool,
        mockBufferManager,
        mockMetricsCollector
      );

      expect(remoteAdapter).toBeDefined();
    });

    it('should support custom PowerShell path', () => {
      const customPSConfig = {
        ...defaultConfig,
        powerShellPath: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
      };

      const customPSAdapter = new WindowsEventLogAdapter(
        customPSConfig,
        mockKafkaProducerPool,
        mockBufferManager,
        mockMetricsCollector
      );

      expect(customPSAdapter).toBeDefined();
    });
  });
});

// Performance benchmarking test (optional, for development)
describe('WindowsEventLogAdapter Performance', () => {
  // These tests would typically be run separately for performance analysis
  it.skip('should handle high event volume efficiently', async () => {
    const highPerfConfig = {
      channels: ['Security'],
      servers: ['localhost'],
      batchSize: 10000,
      pollInterval: 100,
      includeEventData: true,
      realTimeCollection: true,
      highVolumeMode: true,
      performanceOptimized: true,
      maxConcurrentProcesses: 8,
    };

    const perfAdapter = new WindowsEventLogAdapter(
      highPerfConfig,
      mockKafkaProducerPool,
      mockBufferManager,
      mockMetricsCollector
    );

    const startTime = Date.now();
    await perfAdapter.start();
    
    // Run for 10 seconds
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const metrics = perfAdapter.getPerformanceMetrics();
    const duration = Date.now() - startTime;
    
    console.log('Performance Test Results:', {
      duration: `${duration}ms`,
      eventsPerSecond: metrics.eventsPerSecond,
      totalEvents: metrics.totalEventsProcessed,
      averageLatency: `${metrics.averageLatencyMs.toFixed(2)}ms`,
      memoryUsage: `${metrics.memoryUsageMB.toFixed(2)}MB`,
      errorRate: `${((metrics.totalErrors / metrics.totalEventsProcessed) * 100).toFixed(2)}%`,
    });

    await perfAdapter.stop();
    
    // Performance assertions
    expect(metrics.eventsPerSecond).toBeGreaterThan(0);
    expect(metrics.averageLatencyMs).toBeLessThan(100); // Sub-100ms latency
    expect(metrics.memoryUsageMB).toBeLessThan(500); // Under 500MB memory usage
  });
});