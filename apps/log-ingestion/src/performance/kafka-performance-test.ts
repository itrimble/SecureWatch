import { Kafka, Producer, Consumer, logLevel } from 'kafkajs';
import { kafkaConfig, producerConfig, consumerConfig, topics, performanceConfig } from '../config/kafka.config';

interface PerformanceMetrics {
  totalMessages: number;
  startTime: number;
  endTime: number;
  messagesPerSecond: number;
  avgLatency: number;
  maxLatency: number;
  minLatency: number;
  errors: number;
}

export class KafkaPerformanceTester {
  private kafka: Kafka;
  private producers: Producer[] = [];
  private consumers: Consumer[] = [];
  private metrics: PerformanceMetrics = {
    totalMessages: 0,
    startTime: 0,
    endTime: 0,
    messagesPerSecond: 0,
    avgLatency: 0,
    maxLatency: 0,
    minLatency: Infinity,
    errors: 0,
  };

  constructor() {
    this.kafka = new Kafka({
      ...kafkaConfig,
      logLevel: logLevel.WARN, // Reduce logging during performance tests
    });
  }

  async initialize(): Promise<void> {
    console.log('Initializing Kafka performance tester...');
    
    // Create multiple producers for load testing
    for (let i = 0; i < performanceConfig.producerPool.size; i++) {
      const producer = this.kafka.producer({
        ...producerConfig,
        transactionTimeout: 30000,
      });
      
      await producer.connect();
      this.producers.push(producer);
    }

    // Create multiple consumers for consumption testing
    for (let i = 0; i < performanceConfig.consumerInstances; i++) {
      const consumer = this.kafka.consumer({
        ...consumerConfig,
        groupId: `perf-test-consumer-${i}`,
      });
      
      await consumer.connect();
      await consumer.subscribe({ topic: topics.raw });
      this.consumers.push(consumer);
    }

    console.log(`Initialized ${this.producers.length} producers and ${this.consumers.length} consumers`);
  }

  async runProducerTest(
    targetMessagesPerSecond: number = 10_000_000,
    durationSeconds: number = 60
  ): Promise<PerformanceMetrics> {
    console.log(`Starting producer test: ${targetMessagesPerSecond} msg/sec for ${durationSeconds}s`);
    
    const totalMessages = targetMessagesPerSecond * durationSeconds;
    const messagesPerProducer = Math.ceil(totalMessages / this.producers.length);
    const intervalMs = 1000 / (targetMessagesPerSecond / this.producers.length);
    
    this.metrics.startTime = Date.now();
    this.metrics.totalMessages = 0;
    this.metrics.errors = 0;

    // Generate test message
    const testMessage = {
      timestamp: new Date().toISOString(),
      source: 'performance-test',
      level: 'info',
      message: 'Performance test message with sufficient data to simulate real log events',
      metadata: {
        host: 'test-host-001',
        application: 'securewatch-perf-test',
        environment: 'testing',
        version: '1.0.0',
        requestId: '00000000-0000-0000-0000-000000000000',
      },
      data: 'A'.repeat(512), // 512 bytes of data to simulate realistic message size
    };

    const messageBuffer = Buffer.from(JSON.stringify(testMessage));
    console.log(`Message size: ${messageBuffer.length} bytes`);

    // Start producers in parallel
    const producerPromises = this.producers.map(async (producer, index) => {
      let sent = 0;
      const startTime = Date.now();
      
      while (sent < messagesPerProducer && (Date.now() - this.metrics.startTime) < (durationSeconds * 1000)) {
        try {
          const batchPromises: Promise<any>[] = [];
          const batchSize = Math.min(performanceConfig.batchSize, messagesPerProducer - sent);
          
          // Send messages in batches
          for (let i = 0; i < batchSize; i++) {
            const messageStartTime = Date.now();
            
            const promise = producer.send({
              topic: topics.raw,
              messages: [{
                key: `perf-test-${index}-${sent + i}`,
                value: messageBuffer,
                timestamp: messageStartTime.toString(),
              }],
            }).then(() => {
              const latency = Date.now() - messageStartTime;
              this.updateLatencyMetrics(latency);
            }).catch(error => {
              this.metrics.errors++;
              console.error(`Producer ${index} error:`, error.message);
            });
            
            batchPromises.push(promise);
          }
          
          await Promise.all(batchPromises);
          sent += batchSize;
          this.metrics.totalMessages += batchSize;
          
          // Rate limiting
          if (intervalMs > 0) {
            const elapsed = Date.now() - startTime;
            const expectedTime = (sent / messagesPerProducer) * durationSeconds * 1000;
            const sleepTime = expectedTime - elapsed;
            
            if (sleepTime > 0) {
              await new Promise(resolve => setTimeout(resolve, Math.min(sleepTime, 100)));
            }
          }
          
        } catch (error) {
          this.metrics.errors++;
          console.error(`Producer ${index} batch error:`, error);
        }
      }
      
      console.log(`Producer ${index} completed: ${sent} messages`);
    });

    await Promise.all(producerPromises);
    
    this.metrics.endTime = Date.now();
    const durationMs = this.metrics.endTime - this.metrics.startTime;
    this.metrics.messagesPerSecond = (this.metrics.totalMessages / durationMs) * 1000;

    console.log('Producer test completed:', {
      totalMessages: this.metrics.totalMessages,
      duration: `${durationMs}ms`,
      messagesPerSecond: Math.round(this.metrics.messagesPerSecond),
      errors: this.metrics.errors,
      avgLatency: `${this.metrics.avgLatency.toFixed(2)}ms`,
      maxLatency: `${this.metrics.maxLatency}ms`,
      minLatency: `${this.metrics.minLatency}ms`,
    });

    return { ...this.metrics };
  }

  async runConsumerTest(durationSeconds: number = 60): Promise<PerformanceMetrics> {
    console.log(`Starting consumer test for ${durationSeconds}s`);
    
    this.metrics.startTime = Date.now();
    this.metrics.totalMessages = 0;
    this.metrics.errors = 0;

    const consumerPromises = this.consumers.map(async (consumer, index) => {
      let consumed = 0;
      
      await consumer.run({
        eachBatchAutoResolve: false,
        eachBatch: async ({ batch, resolveOffset, heartbeat }) => {
          try {
            const batchStartTime = Date.now();
            
            for (const message of batch.messages) {
              const messageLatency = Date.now() - parseInt(message.timestamp || '0');
              this.updateLatencyMetrics(messageLatency);
              consumed++;
              this.metrics.totalMessages++;
              
              resolveOffset(message.offset);
            }
            
            await heartbeat();
            
            if (Date.now() - this.metrics.startTime >= durationSeconds * 1000) {
              return; // Stop consuming after duration
            }
            
          } catch (error) {
            this.metrics.errors++;
            console.error(`Consumer ${index} error:`, error);
          }
        },
      });
      
      console.log(`Consumer ${index} processed: ${consumed} messages`);
    });

    // Wait for test duration
    await new Promise(resolve => setTimeout(resolve, durationSeconds * 1000));
    
    // Stop all consumers
    await Promise.all(this.consumers.map(consumer => consumer.stop()));
    
    this.metrics.endTime = Date.now();
    const durationMs = this.metrics.endTime - this.metrics.startTime;
    this.metrics.messagesPerSecond = (this.metrics.totalMessages / durationMs) * 1000;

    console.log('Consumer test completed:', {
      totalMessages: this.metrics.totalMessages,
      duration: `${durationMs}ms`,
      messagesPerSecond: Math.round(this.metrics.messagesPerSecond),
      errors: this.metrics.errors,
      avgLatency: `${this.metrics.avgLatency.toFixed(2)}ms`,
      maxLatency: `${this.metrics.maxLatency}ms`,
      minLatency: `${this.metrics.minLatency}ms`,
    });

    return { ...this.metrics };
  }

  private updateLatencyMetrics(latency: number): void {
    this.metrics.maxLatency = Math.max(this.metrics.maxLatency, latency);
    this.metrics.minLatency = Math.min(this.metrics.minLatency, latency);
    
    // Simple moving average for latency
    const count = this.metrics.totalMessages;
    this.metrics.avgLatency = ((this.metrics.avgLatency * count) + latency) / (count + 1);
  }

  async cleanup(): Promise<void> {
    console.log('Cleaning up performance tester...');
    
    await Promise.all([
      ...this.producers.map(producer => producer.disconnect()),
      ...this.consumers.map(consumer => consumer.disconnect()),
    ]);
    
    this.producers = [];
    this.consumers = [];
  }

  async runFullPerformanceTest(): Promise<{
    producerMetrics: PerformanceMetrics;
    consumerMetrics: PerformanceMetrics;
  }> {
    console.log('Starting full Kafka performance test suite...');
    
    await this.initialize();
    
    try {
      // Run producer test
      const producerMetrics = await this.runProducerTest(10_000_000, 60);
      
      // Wait a bit between tests
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Run consumer test
      const consumerMetrics = await this.runConsumerTest(30);
      
      return { producerMetrics, consumerMetrics };
      
    } finally {
      await this.cleanup();
    }
  }
}

// CLI interface for running performance tests
if (require.main === module) {
  const tester = new KafkaPerformanceTester();
  
  tester.runFullPerformanceTest()
    .then(results => {
      console.log('\n=== PERFORMANCE TEST RESULTS ===');
      console.log('Producer Performance:', results.producerMetrics);
      console.log('Consumer Performance:', results.consumerMetrics);
      
      const success = results.producerMetrics.messagesPerSecond >= 10_000_000;
      console.log(`\n${success ? '✅' : '❌'} Target of 10M+ events/second ${success ? 'ACHIEVED' : 'NOT ACHIEVED'}`);
      
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Performance test failed:', error);
      process.exit(1);
    });
}