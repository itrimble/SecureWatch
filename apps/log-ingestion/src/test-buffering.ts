// Simple test script for the enhanced buffering system
import { BufferManager } from './buffers/buffer-manager';
import { MetricsCollector } from './monitoring/metrics-collector';

interface TestEvent {
  id: string;
  timestamp: string;
  message: string;
  level: string;
}

async function testBuffering() {
  console.log('🧪 Testing Enhanced Buffering and Backpressure Management...\n');

  // Create metrics collector
  const metrics = new MetricsCollector();

  // Create buffer manager with test configuration
  const bufferManager = new BufferManager({
    memoryBufferSize: 1000,
    diskBufferSize: 5000,
    diskBufferPath: '/tmp/securewatch-test-buffer',
    highWaterMark: 80,
    lowWaterMark: 60,
    compressionEnabled: true,
    circuitBreaker: {
      failureThreshold: 0.3,
      resetTimeout: 30000,
      halfOpenRequests: 20,
      monitoringInterval: 5000,
      minRequests: 10
    },
    backpressure: {
      queueDepthThreshold: 800,
      latencyThreshold: 1000,
      errorRateThreshold: 0.1,
      monitoringInterval: 5000,
      adaptiveThresholds: true,
      recoveryFactor: 0.1
    },
    adaptiveBatch: {
      initialBatchSize: 100,
      minBatchSize: 10,
      maxBatchSize: 500,
      targetLatency: 200,
      adjustmentFactor: 0.1,
      evaluationInterval: 10000,
      throughputTarget: 1000,
      adaptiveEnabled: true
    },
    flowControl: {
      maxEventsPerSecond: 1000,
      burstSize: 200,
      slidingWindowSize: 60000,
      throttleEnabled: true,
      priorityLevels: 5,
      emergencyMode: {
        enabled: true,
        triggerThreshold: 0.2,
        throttleRate: 0.8
      }
    }
  }, metrics);

  try {
    // Initialize buffer manager
    await bufferManager.initialize();
    console.log('✅ Buffer manager initialized');

    // Test 1: Basic buffering
    console.log('\n📝 Test 1: Basic Event Buffering');
    const testEvents: TestEvent[] = [];
    for (let i = 0; i < 50; i++) {
      testEvents.push({
        id: `test-${i}`,
        timestamp: new Date().toISOString(),
        message: `Test message ${i}`,
        level: 'info'
      });
    }

    await bufferManager.addEvents(testEvents as any);
    console.log(`✅ Added ${testEvents.length} events to buffer`);

    // Test 2: Batch retrieval with adaptive sizing
    console.log('\n📤 Test 2: Adaptive Batch Retrieval');
    const batch = await bufferManager.getBatch();
    console.log(`✅ Retrieved batch of ${batch.length} events (adaptive size)`);

    // Test 3: Flow control
    console.log('\n🚦 Test 3: Flow Control');
    const flowMetrics = bufferManager.getFlowControlMetrics();
    console.log('Flow Control Metrics:', {
      currentRate: flowMetrics.currentRate.toFixed(2),
      allowedRate: flowMetrics.allowedRate,
      throttledEvents: flowMetrics.throttledEvents,
      emergencyMode: flowMetrics.emergencyModeActive
    });

    // Test 4: Backpressure monitoring
    console.log('\n⚡ Test 4: Backpressure Monitoring');
    const backpressureMetrics = bufferManager.getBackpressureMetrics();
    console.log('Backpressure Metrics:', {
      queueDepth: backpressureMetrics.queueDepth,
      averageLatency: backpressureMetrics.averageLatency.toFixed(2),
      errorRate: backpressureMetrics.errorRate.toFixed(3),
      active: backpressureMetrics.backpressureActive
    });

    // Test 5: Circuit breaker status
    console.log('\n🔌 Test 5: Circuit Breaker Status');
    const circuitStats = bufferManager.getCircuitBreakerStats();
    console.log('Circuit Breaker Stats:', {
      state: circuitStats.state,
      failures: circuitStats.failures,
      successes: circuitStats.successes,
      failureRate: circuitStats.failureRate.toFixed(3)
    });

    // Test 6: Adaptive batch metrics
    console.log('\n📊 Test 6: Adaptive Batch Metrics');
    const batchMetrics = bufferManager.getAdaptiveBatchMetrics();
    console.log('Adaptive Batch Metrics:', {
      currentBatchSize: batchMetrics.currentBatchSize,
      averageLatency: batchMetrics.averageLatency.toFixed(2),
      throughput: batchMetrics.throughput.toFixed(2),
      performanceScore: batchMetrics.performanceScore.toFixed(3)
    });

    // Test 7: Stress test with high volume
    console.log('\n🔥 Test 7: High Volume Stress Test');
    const stressEvents: TestEvent[] = [];
    for (let i = 0; i < 500; i++) {
      stressEvents.push({
        id: `stress-${i}`,
        timestamp: new Date().toISOString(),
        message: `Stress test message ${i}`,
        level: Math.random() > 0.9 ? 'error' : 'info'
      });
    }

    const startTime = Date.now();
    await bufferManager.addEvents(stressEvents as any, 1); // High priority
    const duration = Date.now() - startTime;
    console.log(`✅ Processed ${stressEvents.length} events in ${duration}ms`);

    // Final stats
    console.log('\n📈 Final Buffer Statistics');
    const finalStats = {
      memorySize: bufferManager.getSize(),
      totalSize: await bufferManager.getTotalSize(),
      isBackpressureActive: bufferManager.isBackpressureActive(),
      isCircuitBreakerOpen: bufferManager.isCircuitBreakerOpen()
    };
    console.log('Final Stats:', finalStats);

    console.log('\n🎉 All buffering tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Cleanup
    await bufferManager.close();
    console.log('🧹 Buffer manager closed');
  }
}

// Run the test
if (require.main === module) {
  testBuffering().catch(console.error);
}