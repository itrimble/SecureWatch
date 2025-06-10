import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { RawLogEvent, LogSource, WindowsEventLog } from '../types/log-event.types';
import { KafkaProducerPool } from '../utils/kafka-producer-pool';
import { BufferManager } from '../buffers/buffer-manager';
import { MetricsCollector } from '../monitoring/metrics-collector';
import { v4 as uuidv4 } from 'uuid';
import { performance } from 'perf_hooks';
import logger from '../utils/logger';

interface WindowsEventLogConfig {
  channels: string[];
  servers: string[];
  batchSize: number;
  pollInterval: number;
  includeEventData: boolean;
  filters?: EventFilter[];
  // Enhanced configuration options
  realTimeCollection?: boolean;
  evtxFilePaths?: string[];
  maxConcurrentProcesses?: number;
  powerShellPath?: string;
  wefEnabled?: boolean;
  performanceOptimized?: boolean;
  compressionEnabled?: boolean;
  highVolumeMode?: boolean;
  credentials?: {
    username: string;
    password: string;
    domain?: string;
  };
}

interface EventFilter {
  eventIds?: number[];
  levels?: number[];
  providers?: string[];
  keywords?: string[];
  timeRange?: {
    startTime?: Date;
    endTime?: Date;
  };
  severityMin?: number;
  includeUserData?: boolean;
}

interface PerformanceMetrics {
  eventsPerSecond: number;
  averageLatencyMs: number;
  totalEventsProcessed: number;
  totalErrors: number;
  memoryUsageMB: number;
  cpuUsagePercent: number;
  networkBytesReceived: number;
  compressionRatio: number;
  startTime: number;
}

export class WindowsEventLogAdapter extends EventEmitter {
  private config: WindowsEventLogConfig;
  private producerPool: KafkaProducerPool;
  private bufferManager: BufferManager;
  private metrics: MetricsCollector;
  private isRunning: boolean = false;
  private pollIntervals: Map<string, NodeJS.Timer> = new Map();
  
  // Enhanced performance tracking
  private performanceMetrics: PerformanceMetrics;
  private activeProcesses: Map<string, ChildProcess> = new Map();
  private eventBuffer: RawLogEvent[] = [];
  private lastFlushTime: number = 0;
  private processingQueue: Promise<void>[] = [];
  private powerShellPath: string;
  
  // Performance optimization settings
  private readonly MAX_BUFFER_SIZE = 10000;
  private readonly FLUSH_INTERVAL_MS = 1000;
  private readonly MAX_CONCURRENT_PROCESSES = 8;

  constructor(
    config: WindowsEventLogConfig,
    producerPool: KafkaProducerPool,
    bufferManager: BufferManager,
    metrics: MetricsCollector
  ) {
    super();
    this.config = {
      maxConcurrentProcesses: 4,
      powerShellPath: 'powershell.exe',
      performanceOptimized: true,
      compressionEnabled: true,
      highVolumeMode: false,
      ...config
    };
    this.producerPool = producerPool;
    this.bufferManager = bufferManager;
    this.metrics = metrics;
    this.powerShellPath = this.config.powerShellPath || 'powershell.exe';
    
    this.performanceMetrics = {
      eventsPerSecond: 0,
      averageLatencyMs: 0,
      totalEventsProcessed: 0,
      totalErrors: 0,
      memoryUsageMB: 0,
      cpuUsagePercent: 0,
      networkBytesReceived: 0,
      compressionRatio: 1.0,
      startTime: performance.now()
    };
    
    // Set up performance monitoring
    this.setupPerformanceMonitoring();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Windows Event Log adapter is already running');
      return;
    }

    this.isRunning = true;
    this.performanceMetrics.startTime = performance.now();
    
    logger.info('Starting enhanced Windows Event Log adapter', {
      channels: this.config.channels,
      servers: this.config.servers,
      realTimeCollection: this.config.realTimeCollection,
      highVolumeMode: this.config.highVolumeMode,
      maxConcurrentProcesses: this.config.maxConcurrentProcesses,
    });

    // Start performance-optimized collection
    if (this.config.realTimeCollection) {
      await this.startRealTimeCollection();
    } else {
      await this.startPollingCollection();
    }

    // Process EVTX files if specified
    if (this.config.evtxFilePaths && this.config.evtxFilePaths.length > 0) {
      await this.processEvtxFiles();
    }

    // Start buffer flushing
    this.startBufferFlushing();

    this.emit('started');
    logger.info(`Windows Event Log adapter started with ${this.activeProcesses.size} active processes`);
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    logger.info('Stopping enhanced Windows Event Log adapter');

    // Stop all active PowerShell processes
    for (const [processName, process] of this.activeProcesses) {
      logger.debug(`Terminating process: ${processName}`);
      try {
        process.kill('SIGTERM');
        // Give process time to terminate gracefully
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (!process.killed) {
          process.kill('SIGKILL');
        }
      } catch (error) {
        logger.warn(`Error terminating process ${processName}:`, error);
      }
    }
    this.activeProcesses.clear();

    // Clear all polling intervals
    for (const [key, interval] of this.pollIntervals) {
      clearInterval(interval);
    }
    this.pollIntervals.clear();

    // Wait for processing queue to complete
    if (this.processingQueue.length > 0) {
      logger.info(`Waiting for ${this.processingQueue.length} processing tasks to complete...`);
      await Promise.allSettled(this.processingQueue);
    }

    // Flush any remaining buffered events
    await this.flushEventBuffer();
    await this.bufferManager.flush();

    // Log final performance metrics
    this.logFinalMetrics();

    this.emit('stopped');
  }

  private startChannelPolling(server: string, channel: string): void {
    const key = `${server}:${channel}`;
    
    // Initial poll
    this.pollEvents(server, channel);

    // Set up interval polling
    const interval = setInterval(() => {
      if (this.isRunning) {
        this.pollEvents(server, channel);
      }
    }, this.config.pollInterval);

    this.pollIntervals.set(key, interval);
  }

  private async pollEvents(server: string, channel: string): Promise<void> {
    try {
      const events = await this.queryWindowsEvents(server, channel);
      
      if (events.length > 0) {
        logger.debug(`Polled ${events.length} events from ${server}:${channel}`);
        await this.processEvents(events, server, channel);
      }
    } catch (error) {
      logger.error(`Error polling events from ${server}:${channel}`, error);
      this.metrics.incrementCounter('windows_event_log.poll_errors', {
        server,
        channel,
      });
    }
  }

  private async queryWindowsEvents(
    server: string,
    channel: string
  ): Promise<WindowsEventLog[]> {
    // In a real implementation, this would use Windows APIs or WMI
    // For now, we'll simulate with mock data
    const mockEvents: WindowsEventLog[] = [];
    
    // Simulate variable number of events
    const eventCount = Math.floor(Math.random() * 100);
    
    for (let i = 0; i < eventCount; i++) {
      const event: WindowsEventLog = {
        eventId: Math.floor(Math.random() * 10000),
        eventRecordId: Date.now() + i,
        level: Math.floor(Math.random() * 5) + 1,
        task: Math.floor(Math.random() * 100),
        opcode: Math.floor(Math.random() * 10),
        keywords: ['Security', 'Audit'],
        channel,
        provider: {
          name: 'Microsoft-Windows-Security-Auditing',
          guid: '54849625-5478-4994-a5ba-3e3b0328c30d',
        },
        computer: server,
        security: {
          userId: `S-1-5-21-${Math.random().toString().slice(2, 12)}`,
        },
        eventData: {
          SubjectUserName: 'testuser',
          SubjectDomainName: 'DOMAIN',
          TargetUserName: 'targetuser',
          LogonType: '3',
          IpAddress: '192.168.1.' + Math.floor(Math.random() * 255),
        },
      };

      // Apply filters if configured
      if (this.shouldFilterEvent(event)) {
        continue;
      }

      mockEvents.push(event);
    }

    return mockEvents;
  }

  private shouldFilterEvent(event: WindowsEventLog): boolean {
    if (!this.config.filters || this.config.filters.length === 0) {
      return false;
    }

    for (const filter of this.config.filters) {
      // Check event ID filter
      if (filter.eventIds && !filter.eventIds.includes(event.eventId)) {
        continue;
      }

      // Check level filter
      if (filter.levels && !filter.levels.includes(event.level)) {
        continue;
      }

      // Check provider filter
      if (filter.providers && !filter.providers.includes(event.provider.name)) {
        continue;
      }

      // Check keywords filter
      if (filter.keywords) {
        const hasKeyword = filter.keywords.some(keyword => 
          event.keywords.includes(keyword)
        );
        if (!hasKeyword) {
          continue;
        }
      }

      // Event matches this filter, don't filter it out
      return false;
    }

    // Event doesn't match any filter, filter it out
    return true;
  }

  private async processEvents(
    events: WindowsEventLog[],
    server: string,
    channel: string
  ): Promise<void> {
    const rawEvents: RawLogEvent[] = [];

    for (const event of events) {
      const rawEvent: RawLogEvent = {
        id: uuidv4(),
        source: LogSource.WINDOWS_EVENT_LOG,
        timestamp: new Date(),
        rawData: JSON.stringify(event),
        metadata: {
          ingestionId: uuidv4(),
          ingestionTime: new Date(),
          collector: 'windows-event-log-adapter',
          collectorVersion: '1.0.0',
          organizationId: process.env.ORGANIZATION_ID || 'default',
          environment: process.env.ENVIRONMENT || 'production',
          retention: {
            tier: 'hot',
            days: 7,
            compressed: false,
            encrypted: false,
          },
        },
        receivedAt: new Date(),
      };

      rawEvents.push(rawEvent);
    }

    // Update metrics
    this.metrics.incrementCounter('windows_event_log.events_received', 
      { server, channel },
      events.length
    );

    // Buffer events for batch processing
    await this.bufferManager.addEvents(rawEvents);

    // Process batches if ready
    const batches = await this.bufferManager.getBatches(this.config.batchSize);
    
    for (const batch of batches) {
      await this.sendToKafka(batch);
    }
  }

  private async sendToKafka(events: RawLogEvent[]): Promise<void> {
    try {
      const messages = events.map(event => ({
        key: event.metadata.organizationId,
        value: JSON.stringify(event),
        timestamp: event.timestamp.toISOString(),
        headers: {
          source: LogSource.WINDOWS_EVENT_LOG,
          ingestionId: event.metadata.ingestionId,
        },
      }));

      await this.producerPool.sendBatch('log-events-raw', messages);

      this.metrics.incrementCounter('windows_event_log.events_sent', 
        {},
        events.length
      );

      logger.debug(`Sent ${events.length} events to Kafka`);
    } catch (error) {
      logger.error('Error sending events to Kafka', error);
      this.metrics.incrementCounter('windows_event_log.kafka_errors');
      
      // Re-queue events for retry
      await this.bufferManager.requeueEvents(events);
    }
  }

  // Method to handle real Windows Event Log subscription (Windows only)
  private async subscribeToWindowsEvents(
    server: string,
    channel: string
  ): Promise<void> {
    // This would use Windows Event Log API or PowerShell remoting
    // Example implementation would use node-windows or edge-js
    
    // For production, consider using:
    // - Windows Event Forwarding (WEF)
    // - WMI Event Subscriptions
    // - PowerShell Remoting
    // - Windows Admin Center API
  }

  // Enhanced high-performance collection methods
  private async startRealTimeCollection(): Promise<void> {
    logger.info('Starting real-time Windows Event Log collection');
    
    const maxProcesses = Math.min(
      this.config.maxConcurrentProcesses || 4,
      this.MAX_CONCURRENT_PROCESSES
    );
    
    for (const server of this.config.servers) {
      for (const channel of this.config.channels) {
        // Limit concurrent processes
        if (this.activeProcesses.size >= maxProcesses) {
          logger.warn(`Maximum concurrent processes (${maxProcesses}) reached, queuing remaining collections`);
          break;
        }
        
        await this.startRealTimeChannelCollection(server, channel);
      }
    }
  }

  private async startRealTimeChannelCollection(server: string, channel: string): Promise<void> {
    const processName = `realtime-${server}-${channel}`;
    
    // Build optimized PowerShell script for real-time collection
    const script = this.buildOptimizedPowerShellScript(server, channel);
    
    const process = spawn(this.powerShellPath, [
      '-NoProfile',
      '-NoLogo',
      '-ExecutionPolicy', 'Bypass',
      '-OutputFormat', 'Text',
      '-Command', script
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env
    });

    this.activeProcesses.set(processName, process);
    
    logger.info(`Started real-time collection for ${server}:${channel} (PID: ${process.pid})`);

    // Handle process output with streaming parser
    let buffer = '';
    process.stdout?.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      for (const line of lines) {
        if (line.trim()) {
          this.processRealTimeEvent(line.trim(), server, channel);
        }
      }
    });

    process.stderr?.on('data', (data) => {
      const errorMsg = data.toString();
      logger.error(`PowerShell error from ${processName}:`, errorMsg);
      this.performanceMetrics.totalErrors++;
    });

    process.on('exit', (code, signal) => {
      logger.info(`Process ${processName} exited with code ${code}, signal ${signal}`);
      this.activeProcesses.delete(processName);
      
      // Restart process if it failed and we're still collecting
      if (this.isRunning && code !== 0 && code !== null) {
        logger.warn(`Restarting failed process ${processName} in 5 seconds...`);
        setTimeout(() => {
          if (this.isRunning) {
            this.startRealTimeChannelCollection(server, channel);
          }
        }, 5000);
      }
    });

    process.on('error', (error) => {
      logger.error(`Process ${processName} error:`, error);
      this.performanceMetrics.totalErrors++;
      this.activeProcesses.delete(processName);
    });
  }

  private buildOptimizedPowerShellScript(server: string, channel: string): string {
    const filters = this.buildEventFilters();
    const batchSize = this.config.highVolumeMode ? 1000 : 100;
    
    return `
      $ErrorActionPreference = 'Continue'
      $ProgressPreference = 'SilentlyContinue'
      
      try {
        # Create event subscription for real-time monitoring
        $filterXml = @"
<QueryList>
  <Query Id="0" Path="${channel}">
    <Select Path="${channel}">
      *${filters}
    </Select>
  </Query>
</QueryList>
"@

        # Subscribe to events with optimized settings
        $subscription = Register-WmiEvent -Query "SELECT * FROM __InstanceCreationEvent WITHIN 1 WHERE TargetInstance ISA 'Win32_NTLogEvent' AND TargetInstance.LogFile='${channel}'" -Action {
          $event = $Event.SourceEventArgs.NewEvent.TargetInstance
          
          # Build minimal event object for performance
          $eventObj = [PSCustomObject]@{
            TimeGenerated = $event.TimeGenerated
            EventCode = $event.EventCode
            SourceName = $event.SourceName
            Type = $event.Type
            Category = $event.Category
            User = $event.User
            Computer = $event.ComputerName
            Message = $event.Message
            RecordNumber = $event.RecordNumber
            LogFile = $event.LogFile
          }
          
          # Output as compressed JSON for efficiency
          $json = $eventObj | ConvertTo-Json -Compress -Depth 1
          Write-Output "EVT|$json"
        }
        
        # Keep subscription alive
        while ($true) {
          Start-Sleep -Seconds 1
          
          # Memory cleanup every 30 seconds
          if ((Get-Date).Second % 30 -eq 0) {
            [System.GC]::Collect()
            [System.GC]::WaitForPendingFinalizers()
          }
        }
      }
      catch {
        Write-Error "PowerShell subscription error: $($_.Exception.Message)"
        exit 1
      }
      finally {
        if ($subscription) {
          Unregister-Event -SourceIdentifier $subscription.Name -ErrorAction SilentlyContinue
        }
      }
    `;
  }

  private buildEventFilters(): string {
    if (!this.config.filters || this.config.filters.length === 0) {
      return '';
    }

    const conditions: string[] = [];
    
    for (const filter of this.config.filters) {
      if (filter.eventIds && filter.eventIds.length > 0) {
        const eventIdCondition = filter.eventIds.map(id => `EventID=${id}`).join(' or ');
        conditions.push(`(${eventIdCondition})`);
      }
      
      if (filter.levels && filter.levels.length > 0) {
        const levelCondition = filter.levels.map(level => `Level=${level}`).join(' or ');
        conditions.push(`(${levelCondition})`);
      }
      
      if (filter.timeRange?.startTime) {
        const startTime = filter.timeRange.startTime.toISOString();
        conditions.push(`TimeCreated[@SystemTime&gt;='${startTime}']`);
      }
    }
    
    return conditions.length > 0 ? ` and (${conditions.join(' and ')})` : '';
  }

  private processRealTimeEvent(line: string, server: string, channel: string): void {
    if (!line.startsWith('EVT|')) {
      return;
    }

    try {
      const startTime = performance.now();
      const jsonData = line.substring(4); // Remove 'EVT|' prefix
      const eventData = JSON.parse(jsonData);
      
      const rawEvent = this.convertToRawLogEvent(eventData, server, channel);
      this.addToEventBuffer(rawEvent);
      
      // Update performance metrics
      const processingTime = performance.now() - startTime;
      this.updatePerformanceMetrics(processingTime);
      
    } catch (error) {
      logger.warn(`Failed to parse real-time event: ${error.message}`, { line });
      this.performanceMetrics.totalErrors++;
    }
  }

  private async startPollingCollection(): Promise<void> {
    logger.info('Starting polling-based Windows Event Log collection');
    
    // Use original polling logic but with performance enhancements
    for (const server of this.config.servers) {
      for (const channel of this.config.channels) {
        this.startChannelPolling(server, channel);
      }
    }
  }

  private async processEvtxFiles(): Promise<void> {
    logger.info(`Processing ${this.config.evtxFilePaths!.length} EVTX files`);
    
    const processingPromises = this.config.evtxFilePaths!.map(async (filePath) => {
      await this.processEvtxFile(filePath);
    });
    
    await Promise.allSettled(processingPromises);
  }

  private async processEvtxFile(filePath: string): Promise<void> {
    const processName = `evtx-${Date.now()}`;
    
    // Use Get-WinEvent for efficient EVTX file processing
    const script = `
      $ErrorActionPreference = 'Continue'
      
      try {
        Get-WinEvent -Path '${filePath}' -MaxEvents 10000 | ForEach-Object {
          $eventObj = [PSCustomObject]@{
            TimeCreated = $_.TimeCreated
            Id = $_.Id
            LevelDisplayName = $_.LevelDisplayName
            ProviderName = $_.ProviderName
            Message = $_.Message
            RecordId = $_.RecordId
            Computer = $_.MachineName
            LogName = $_.LogName
          }
          
          $json = $eventObj | ConvertTo-Json -Compress -Depth 1
          Write-Output "EVT|$json"
        }
      }
      catch {
        Write-Error "EVTX processing error: $($_.Exception.Message)"
      }
    `;

    const process = spawn(this.powerShellPath, [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-Command', script
    ]);

    this.activeProcesses.set(processName, process);

    process.stdout?.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('EVT|')) {
          this.processRealTimeEvent(line.trim(), 'file', filePath);
        }
      }
    });

    return new Promise((resolve, reject) => {
      process.on('exit', (code) => {
        this.activeProcesses.delete(processName);
        if (code === 0) {
          logger.info(`Successfully processed EVTX file: ${filePath}`);
          resolve();
        } else {
          logger.error(`Failed to process EVTX file: ${filePath}, exit code: ${code}`);
          reject(new Error(`EVTX processing failed with code ${code}`));
        }
      });

      process.on('error', (error) => {
        this.activeProcesses.delete(processName);
        reject(error);
      });
    });
  }

  private addToEventBuffer(event: RawLogEvent): void {
    this.eventBuffer.push(event);
    
    // Check if buffer needs flushing
    if (this.eventBuffer.length >= this.MAX_BUFFER_SIZE ||
        (performance.now() - this.lastFlushTime) >= this.FLUSH_INTERVAL_MS) {
      this.flushEventBuffer();
    }
  }

  private async flushEventBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const events = [...this.eventBuffer];
    this.eventBuffer = [];
    this.lastFlushTime = performance.now();

    try {
      // Process events in buffer manager
      await this.bufferManager.addEvents(events);
      
      // Send to Kafka if batches are ready
      const batches = await this.bufferManager.getBatches(this.config.batchSize);
      for (const batch of batches) {
        await this.sendToKafka(batch);
      }
      
      logger.debug(`Flushed ${events.length} events from buffer`);
    } catch (error) {
      logger.error('Error flushing event buffer:', error);
      // Re-add events to buffer for retry
      this.eventBuffer.unshift(...events);
    }
  }

  private startBufferFlushing(): void {
    const flushInterval = setInterval(() => {
      if (this.isRunning) {
        this.flushEventBuffer();
      } else {
        clearInterval(flushInterval);
      }
    }, this.FLUSH_INTERVAL_MS);
  }

  private convertToRawLogEvent(eventData: any, server: string, channel: string): RawLogEvent {
    return {
      id: uuidv4(),
      source: LogSource.WINDOWS_EVENT_LOG,
      timestamp: new Date(eventData.TimeCreated || eventData.TimeGenerated),
      rawData: JSON.stringify(eventData),
      metadata: {
        ingestionId: uuidv4(),
        ingestionTime: new Date(),
        collector: 'enhanced-windows-event-log-adapter',
        collectorVersion: '2.0.0',
        organizationId: process.env.ORGANIZATION_ID || 'default',
        environment: process.env.ENVIRONMENT || 'production',
        retention: {
          tier: 'hot',
          days: 30,
          compressed: this.config.compressionEnabled || false,
          encrypted: false,
        },
      },
      receivedAt: new Date(),
      fields: {
        server,
        channel,
        eventId: eventData.Id || eventData.EventCode,
        recordId: eventData.RecordId || eventData.RecordNumber,
        provider: eventData.ProviderName || eventData.SourceName,
        computer: eventData.Computer || eventData.ComputerName,
        level: eventData.Level,
        levelName: eventData.LevelDisplayName || eventData.Type,
        message: eventData.Message,
        logName: eventData.LogName || channel,
      }
    };
  }

  private setupPerformanceMonitoring(): void {
    // Monitor performance metrics every 10 seconds
    const monitoringInterval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(monitoringInterval);
        return;
      }
      
      this.updateResourceMetrics();
      this.logPerformanceMetrics();
    }, 10000);
  }

  private updatePerformanceMetrics(processingTimeMs: number): void {
    this.performanceMetrics.totalEventsProcessed++;
    
    // Update average latency (simple moving average)
    const currentAvg = this.performanceMetrics.averageLatencyMs;
    const count = this.performanceMetrics.totalEventsProcessed;
    this.performanceMetrics.averageLatencyMs = 
      ((currentAvg * (count - 1)) + processingTimeMs) / count;
    
    // Calculate events per second
    const elapsedSeconds = (performance.now() - this.performanceMetrics.startTime) / 1000;
    this.performanceMetrics.eventsPerSecond = 
      this.performanceMetrics.totalEventsProcessed / elapsedSeconds;
  }

  private updateResourceMetrics(): void {
    const memUsage = process.memoryUsage();
    this.performanceMetrics.memoryUsageMB = memUsage.heapUsed / (1024 * 1024);
    
    // CPU usage would require additional monitoring (not implemented)
    // Network bytes would be tracked from actual network operations
  }

  private logPerformanceMetrics(): void {
    logger.info('Windows Event Log Adapter Performance Metrics', {
      eventsPerSecond: Math.round(this.performanceMetrics.eventsPerSecond),
      averageLatencyMs: this.performanceMetrics.averageLatencyMs.toFixed(2),
      totalEventsProcessed: this.performanceMetrics.totalEventsProcessed,
      totalErrors: this.performanceMetrics.totalErrors,
      memoryUsageMB: this.performanceMetrics.memoryUsageMB.toFixed(2),
      activeProcesses: this.activeProcesses.size,
      bufferSize: this.eventBuffer.length,
    });
  }

  private logFinalMetrics(): void {
    const totalRuntime = (performance.now() - this.performanceMetrics.startTime) / 1000;
    
    logger.info('Final Windows Event Log Adapter Metrics', {
      totalRuntime: `${totalRuntime.toFixed(2)}s`,
      totalEventsProcessed: this.performanceMetrics.totalEventsProcessed,
      averageEventsPerSecond: Math.round(this.performanceMetrics.eventsPerSecond),
      totalErrors: this.performanceMetrics.totalErrors,
      errorRate: `${((this.performanceMetrics.totalErrors / this.performanceMetrics.totalEventsProcessed) * 100).toFixed(2)}%`,
      finalMemoryUsageMB: this.performanceMetrics.memoryUsageMB.toFixed(2),
    });
  }

  // Enhanced statistics including performance metrics
  getStats(): object {
    return {
      isRunning: this.isRunning,
      channels: this.config.channels,
      servers: this.config.servers,
      activePollers: this.pollIntervals.size,
      activeProcesses: this.activeProcesses.size,
      bufferSize: this.bufferManager.getSize(),
      eventBufferSize: this.eventBuffer.length,
      performanceMetrics: this.performanceMetrics,
      configuration: {
        realTimeCollection: this.config.realTimeCollection,
        highVolumeMode: this.config.highVolumeMode,
        compressionEnabled: this.config.compressionEnabled,
        maxConcurrentProcesses: this.config.maxConcurrentProcesses,
      },
      metrics: this.metrics.getMetrics(),
    };
  }

  // Get real-time performance data
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  // Health check method
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    const isHealthy = this.isRunning && 
                     this.performanceMetrics.totalErrors < (this.performanceMetrics.totalEventsProcessed * 0.05) &&
                     this.activeProcesses.size > 0;
    
    return {
      healthy: isHealthy,
      details: {
        running: this.isRunning,
        activeProcesses: this.activeProcesses.size,
        errorRate: this.performanceMetrics.totalEventsProcessed > 0 ? 
          this.performanceMetrics.totalErrors / this.performanceMetrics.totalEventsProcessed : 0,
        eventsPerSecond: this.performanceMetrics.eventsPerSecond,
        memoryUsageMB: this.performanceMetrics.memoryUsageMB,
      }
    };
  }
}