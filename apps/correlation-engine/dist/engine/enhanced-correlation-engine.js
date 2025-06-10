// Enhanced Real-Time Correlation Engine for Sub-Second Performance
// Task 1.4 Implementation - Optimized for high-throughput threat detection
// @ts-nocheck
import { Pool } from 'pg';
import { createClient } from 'redis';
import PQueue from 'p-queue';
import { logger } from '../utils/logger';
import { RuleEvaluator } from './rule-evaluator';
import { PatternMatcher } from './pattern-matcher';
import { IncidentManager } from './incident-manager';
import { ActionExecutor } from './action-executor';
export class EnhancedCorrelationEngine {
    db;
    redis;
    queue;
    fastQueue; // High-priority queue for critical events
    ruleEvaluator;
    patternMatcher;
    incidentManager;
    actionExecutor;
    activeRules = new Map();
    eventBuffer = new Map();
    // Real-time performance enhancement fields
    realTimeConfig;
    performanceMetrics;
    ruleCache = new Map();
    eventBatch = [];
    batchTimer = null;
    indexedRules = new Map(); // Rules indexed by event type
    bloomFilter = new Set(); // Simple bloom filter for fast rule filtering
    processingTimes = []; // For P99 calculation
    isStreamMode = false;
    // Circuit breaker for performance protection
    circuitBreaker = {
        failures: 0,
        lastFailureTime: 0,
        isOpen: false,
        threshold: 5,
        timeoutMs: 30000,
        halfOpenRequests: 0
    };
    constructor() {
        this.db = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME || 'securewatch',
            user: process.env.DB_USER || 'securewatch',
            password: process.env.DB_PASSWORD || 'securewatch',
            // Performance optimizations for real-time processing
            max: 30, // Increased connection pool for high throughput
            idleTimeoutMillis: 15000,
            connectionTimeoutMillis: 1000,
            acquireTimeoutMillis: 2000,
            // Connection pooling optimizations
            allowExitOnIdle: false,
            keepAlive: true,
        });
        this.redis = createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379',
            // Real-time Redis optimizations
            socket: {
                connectTimeout: 500,
                commandTimeout: 200,
                keepAlive: true,
                noDelay: true
            },
            // Connection pooling
            lazyConnect: true
        });
        // High-performance queue configuration for sub-second processing
        this.queue = new PQueue({
            concurrency: parseInt(process.env.CORRELATION_CONCURRENCY || '50'),
            intervalCap: 2000,
            interval: 1000,
            timeout: 5000,
            throwOnTimeout: false
        });
        // Fast queue for critical/high-priority events
        this.fastQueue = new PQueue({
            concurrency: parseInt(process.env.FAST_CORRELATION_CONCURRENCY || '20'),
            intervalCap: 1000,
            interval: 500,
            timeout: 2000,
            throwOnTimeout: false
        });
        this.ruleEvaluator = new RuleEvaluator(this.db, this.redis);
        this.patternMatcher = new PatternMatcher(this.db);
        this.incidentManager = new IncidentManager(this.db);
        this.actionExecutor = new ActionExecutor(this.db);
        // Real-time configuration with sub-second targets
        this.realTimeConfig = {
            maxProcessingTimeMs: parseInt(process.env.MAX_PROCESSING_TIME_MS || '200'), // 200ms aggressive target
            batchProcessingEnabled: process.env.BATCH_PROCESSING === 'true',
            batchSize: parseInt(process.env.CORRELATION_BATCH_SIZE || '50'),
            cacheExpirationMs: parseInt(process.env.RULE_CACHE_EXPIRATION_MS || '30000'),
            parallelRuleEvaluation: process.env.PARALLEL_RULE_EVAL !== 'false',
            fastPathEnabled: process.env.FAST_PATH_ENABLED !== 'false',
            streamProcessingMode: process.env.STREAM_MODE === 'true',
            enableCircuitBreaker: process.env.CIRCUIT_BREAKER_ENABLED !== 'false',
            maxConcurrentEvents: parseInt(process.env.MAX_CONCURRENT_EVENTS || '1000'),
            priorityQueueEnabled: process.env.PRIORITY_QUEUE_ENABLED !== 'false'
        };
        // Initialize performance metrics
        this.performanceMetrics = {
            totalEventsProcessed: 0,
            averageProcessingTime: 0,
            ruleEvaluationCache: new Map(),
            eventBatchMetrics: {
                batchSize: 0,
                batchProcessingTime: 0,
                throughput: 0
            },
            p99ProcessingTime: 0,
            cacheMisses: 0,
            cacheHits: 0
        };
        // Start performance monitoring and cache cleanup
        this.startPerformanceMonitoring();
        this.startCacheCleanup();
    }
    async initialize() {
        try {
            // Connect to Redis with optimizations
            await this.redis.connect();
            // Enable pipelining for better performance
            if (this.redis.pipeline) {
                this.redis.pipeline();
            }
            logger.info('Enhanced correlation engine connected to Redis');
            // Load and index active rules for fast lookup
            try {
                await this.loadAndIndexActiveRules();
                logger.info(`Enhanced correlation engine loaded and indexed ${this.activeRules.size} rules`);
            }
            catch (error) {
                logger.warn('Could not load rules - tables may not exist yet:', error.message);
            }
            // Initialize components with performance optimizations
            await this.ruleEvaluator.initialize();
            await this.patternMatcher.initialize();
            await this.incidentManager.initialize();
            await this.actionExecutor.initialize();
            // Start optimized event buffer cleanup
            this.startOptimizedEventBufferCleanup();
            // Warm up caches
            await this.warmUpCaches();
            logger.info('Enhanced correlation engine initialized for sub-second performance');
        }
        catch (error) {
            logger.error('Failed to initialize enhanced correlation engine:', error);
            throw error;
        }
    }
    // Ultra-fast event processing with multiple optimization strategies
    async processEvent(event) {
        // Circuit breaker check for performance protection
        if (this.realTimeConfig.enableCircuitBreaker && this.isCircuitBreakerOpen()) {
            logger.warn('Circuit breaker open, dropping event', { eventId: event.id });
            return;
        }
        // Throttle if too many concurrent events
        if (this.queue.size + this.fastQueue.size > this.realTimeConfig.maxConcurrentEvents) {
            logger.warn('Max concurrent events reached, dropping event', {
                eventId: event.id,
                queueSize: this.queue.size,
                fastQueueSize: this.fastQueue.size
            });
            return;
        }
        const eventPriority = this.determineEventPriority(event);
        const targetQueue = eventPriority === 'high' ? this.fastQueue : this.queue;
        // Stream processing mode for ultra-low latency
        if (this.realTimeConfig.streamProcessingMode) {
            return this.processEventStream(event);
        }
        // Batch processing for high throughput
        if (this.realTimeConfig.batchProcessingEnabled) {
            return this.addEventToBatch(event);
        }
        // Real-time single event processing with sub-second target
        await targetQueue.add(async () => {
            const startTime = performance.now();
            try {
                const context = {
                    eventId: event.id,
                    timestamp: new Date(event.timestamp),
                    source: event.source,
                    eventType: event.event_id,
                    metadata: { priority: eventPriority }
                };
                // Fast path for known event types with caching
                if (this.realTimeConfig.fastPathEnabled && await this.canUseFastPath(event)) {
                    await this.processFastPath(event, context);
                }
                else {
                    await this.processStandardPath(event, context);
                }
                // Update performance metrics
                const processingTime = performance.now() - startTime;
                this.updatePerformanceMetrics(processingTime);
                // Performance warning if exceeding target
                if (processingTime > this.realTimeConfig.maxProcessingTimeMs) {
                    logger.warn(`Processing time exceeded target: ${processingTime.toFixed(2)}ms`, {
                        eventId: event.id,
                        target: this.realTimeConfig.maxProcessingTimeMs
                    });
                    this.circuitBreaker.failures++;
                }
                else {
                    // Reset circuit breaker on success
                    this.circuitBreaker.failures = Math.max(0, this.circuitBreaker.failures - 1);
                }
            }
            catch (error) {
                logger.error('Error processing event:', error, { eventId: event.id });
                this.circuitBreaker.failures++;
                this.circuitBreaker.lastFailureTime = Date.now();
            }
        });
    }
    // Ultra-fast stream processing for critical events
    async processEventStream(event) {
        const startTime = performance.now();
        try {
            // Pre-filter rules using bloom filter for negative lookups
            const potentialRules = this.getApplicableRulesForEvent(event);
            if (potentialRules.length === 0) {
                logger.debug('No applicable rules found via bloom filter', { eventId: event.id });
                return;
            }
            const promises = [];
            // Parallel rule evaluation with concurrency limit
            const maxConcurrentRules = 10;
            for (let i = 0; i < potentialRules.length; i += maxConcurrentRules) {
                const ruleBatch = potentialRules.slice(i, i + maxConcurrentRules);
                const batchPromises = ruleBatch.map(async (rule) => {
                    try {
                        const result = await this.evaluateRuleWithCache(rule, event);
                        if (result.matched) {
                            return this.handleRuleMatchAsync(result, event);
                        }
                    }
                    catch (error) {
                        logger.error('Rule evaluation error in stream mode:', error);
                    }
                });
                promises.push(...batchPromises);
            }
            // Wait for all evaluations with aggressive timeout
            await Promise.allSettled(promises);
            const processingTime = performance.now() - startTime;
            // Track stream processing metrics
            logger.debug(`Stream event processed in ${processingTime.toFixed(2)}ms`, {
                eventId: event.id,
                rulesEvaluated: potentialRules.length,
                target: 'sub-200ms'
            });
        }
        catch (error) {
            logger.error('Stream processing failed:', error, { eventId: event.id });
        }
    }
    // Optimized batch processing for high-throughput scenarios
    async addEventToBatch(event) {
        this.eventBatch.push(event);
        // Process batch when it reaches target size or timeout
        if (this.eventBatch.length >= this.realTimeConfig.batchSize) {
            await this.processBatch();
        }
        else if (!this.batchTimer) {
            // Set aggressive timeout for batch processing
            this.batchTimer = setTimeout(() => this.processBatch(), 50); // 50ms max batch delay
        }
    }
    async processBatch() {
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }
        if (this.eventBatch.length === 0)
            return;
        const batch = [...this.eventBatch];
        this.eventBatch = [];
        const startTime = performance.now();
        try {
            // Parallel batch processing with chunking
            const chunkSize = 10;
            const chunks = [];
            for (let i = 0; i < batch.length; i += chunkSize) {
                chunks.push(batch.slice(i, i + chunkSize));
            }
            const chunkPromises = chunks.map(chunk => Promise.allSettled(chunk.map(event => this.processEventStream(event))));
            await Promise.allSettled(chunkPromises);
            const processingTime = performance.now() - startTime;
            const throughput = (batch.length / processingTime) * 1000;
            this.performanceMetrics.eventBatchMetrics = {
                batchSize: batch.length,
                batchProcessingTime: processingTime,
                throughput: throughput
            };
            logger.info(`High-performance batch processed: ${batch.length} events in ${processingTime.toFixed(2)}ms`, {
                throughput: throughput.toFixed(2),
                targetThroughput: '10000+ eps'
            });
        }
        catch (error) {
            logger.error('Batch processing failed:', error);
        }
    }
    // Load and index rules for ultra-fast lookup
    async loadAndIndexActiveRules() {
        try {
            const query = `
        SELECT r.*, 
               array_agg(
                 json_build_object(
                   'id', c.id,
                   'condition_type', c.condition_type,
                   'field_name', c.field_name,
                   'operator', c.operator,
                   'value', c.value,
                   'condition_order', c.condition_order,
                   'is_required', c.is_required
                 ) ORDER BY c.condition_order
               ) as conditions
        FROM correlation_rules r
        LEFT JOIN rule_conditions c ON r.id = c.rule_id
        WHERE r.enabled = true
        GROUP BY r.id
        ORDER BY r.priority DESC, r.severity DESC
      `;
            const result = await this.db.query(query);
            this.activeRules.clear();
            this.indexedRules.clear();
            this.bloomFilter.clear();
            for (const row of result.rows) {
                const rule = {
                    ...row,
                    conditions: row.conditions.filter((c) => c.id !== null)
                };
                this.activeRules.set(row.id, rule);
                // Create multiple indexes for fast lookup
                const indexKeys = this.generateIndexKeysForRule(rule);
                for (const key of indexKeys) {
                    if (!this.indexedRules.has(key)) {
                        this.indexedRules.set(key, []);
                    }
                    this.indexedRules.get(key).push(rule);
                    // Add to bloom filter for fast negative lookups
                    this.bloomFilter.add(`${key}-${rule.id}`);
                }
            }
            logger.info(`Rules loaded and optimally indexed: ${this.activeRules.size} rules, ${this.indexedRules.size} index keys, ${this.bloomFilter.size} bloom entries`);
        }
        catch (error) {
            logger.error('Error loading and indexing active rules:', error);
            throw error;
        }
    }
    // Generate comprehensive index keys for rules
    generateIndexKeysForRule(rule) {
        const indexKeys = new Set();
        // Index by event ID, source, severity, type
        for (const condition of rule.conditions || []) {
            if (condition.field_name === 'event_id' && condition.operator === 'equals') {
                indexKeys.add(`event_id:${condition.value}`);
            }
            if (condition.field_name === 'source' && condition.operator === 'equals') {
                indexKeys.add(`source:${condition.value}`);
            }
        }
        // Add category-based indexing
        if (rule.metadata?.category) {
            indexKeys.add(`category:${rule.metadata.category}`);
        }
        // Add severity-based indexing
        indexKeys.add(`severity:${rule.severity}`);
        // Add type-based indexing
        indexKeys.add(`type:${rule.type}`);
        // Add wildcard for global rules
        if (indexKeys.size === 0) {
            indexKeys.add('*');
        }
        return Array.from(indexKeys);
    }
    // Get applicable rules using optimized indexing
    getApplicableRulesForEvent(event) {
        const applicableRules = new Map();
        // Build potential index keys for this event
        const eventIndexKeys = [
            `event_id:${event.event_id}`,
            `source:${event.source}`,
            `severity:${event.metadata?.severity || 'medium'}`,
            '*' // Global rules
        ];
        // Fast lookup using indexed rules
        for (const key of eventIndexKeys) {
            const rules = this.indexedRules.get(key) || [];
            for (const rule of rules) {
                // Use bloom filter for negative lookups first
                if (this.bloomFilter.has(`${key}-${rule.id}`)) {
                    applicableRules.set(rule.id, rule);
                }
            }
        }
        return Array.from(applicableRules.values());
    }
    // Fast path processing with aggressive caching
    async canUseFastPath(event) {
        // Fast path criteria: common events with simple rules
        const fastPathEventIds = ['4624', '4625', '4648', '4776', '4778']; // Common Windows events
        const fastPathSources = ['security', 'system'];
        return fastPathEventIds.includes(event.event_id) &&
            fastPathSources.includes(event.source.toLowerCase()) &&
            !event.metadata?.complex &&
            (this.getApplicableRulesForEvent(event).length <= 5);
    }
    async processFastPath(event, context) {
        const cacheKey = `fast:${event.event_id}:${event.source}:${event.user_name || 'unknown'}`;
        // Check cache first for ultimate speed
        const cached = this.performanceMetrics.ruleEvaluationCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < this.realTimeConfig.cacheExpirationMs)) {
            this.performanceMetrics.cacheHits++;
            logger.debug('Fast path cache hit', { eventId: event.id, cacheKey });
            return;
        }
        this.performanceMetrics.cacheMisses++;
        // Get top 3 rules for this event type (sorted by priority)
        const topRules = this.getApplicableRulesForEvent(event).slice(0, 3);
        // Parallel evaluation of top rules
        const evaluationPromises = topRules.map(rule => this.evaluateRuleWithCache(rule, event));
        const results = await Promise.allSettled(evaluationPromises);
        // Process matches immediately
        const matchPromises = results
            .filter(result => result.status === 'fulfilled' && result.value.matched)
            .map(result => this.handleRuleMatchAsync(result.value, event));
        await Promise.allSettled(matchPromises);
        // Cache the evaluation
        this.performanceMetrics.ruleEvaluationCache.set(cacheKey, {
            result: true,
            timestamp: Date.now()
        });
        logger.debug(`Fast path processed ${topRules.length} rules`, { eventId: event.id });
    }
    // Rule evaluation with caching layer
    async evaluateRuleWithCache(rule, event) {
        const ruleKey = `rule:${rule.id}:${event.event_id}:${event.source}`;
        // Check rule cache
        if (this.ruleCache.has(ruleKey)) {
            const cached = this.ruleCache.get(ruleKey);
            if (Date.now() - cached.timestamp < 10000) { // 10 second cache for rules
                return { ...cached.result, executionTime: 0 };
            }
        }
        const context = {
            eventId: event.id,
            timestamp: new Date(event.timestamp),
            source: event.source,
            eventType: event.event_id,
            metadata: {}
        };
        const result = await this.ruleEvaluator.evaluate(rule, event, context);
        // Cache successful evaluations
        if (result.matched) {
            this.ruleCache.set(ruleKey, {
                result,
                timestamp: Date.now()
            });
        }
        return result;
    }
    // Enhanced standard path with optimizations
    async processStandardPath(event, context) {
        // Optimized buffer management
        this.addEventToOptimizedBuffer(event);
        // Get applicable rules using bloom filter and indexing
        const applicableRules = this.getApplicableRulesForEvent(event);
        if (applicableRules.length === 0) {
            logger.debug('No applicable rules found', { eventId: event.id });
            return;
        }
        const evaluationResults = [];
        // Adaptive parallel vs sequential evaluation
        const useParallel = this.realTimeConfig.parallelRuleEvaluation &&
            applicableRules.length > 5 &&
            this.queue.size < 100; // Avoid overwhelming if queue is busy
        if (useParallel) {
            // Parallel rule evaluation with concurrency control
            const chunks = this.chunkArray(applicableRules, 5); // Process in chunks of 5
            for (const chunk of chunks) {
                const promises = chunk.map(rule => this.evaluateRuleWithCache(rule, event));
                const results = await Promise.allSettled(promises);
                for (const result of results) {
                    if (result.status === 'fulfilled' && result.value.matched) {
                        evaluationResults.push(result.value);
                    }
                }
            }
        }
        else {
            // Sequential evaluation for better resource control
            for (const rule of applicableRules.slice(0, 20)) { // Limit to top 20 rules
                try {
                    const result = await this.evaluateRuleWithCache(rule, event);
                    if (result.matched) {
                        evaluationResults.push(result);
                    }
                }
                catch (error) {
                    logger.error('Rule evaluation error:', error, { ruleId: rule.id });
                }
            }
        }
        // Asynchronous incident creation for better performance
        if (evaluationResults.length > 0) {
            const incidentPromises = evaluationResults.map(result => this.handleRuleMatchAsync(result, event).catch(error => {
                logger.error('Incident handling error:', error);
            }));
            // Don't wait for incident creation to complete
            Promise.allSettled(incidentPromises);
        }
        logger.debug(`Standard path: ${applicableRules.length} rules evaluated, ${evaluationResults.length} matches`, {
            eventId: event.id,
            parallel: useParallel
        });
    }
    // Optimized event buffering
    addEventToOptimizedBuffer(event) {
        const bufferKey = `${event.source}-${event.event_id}`;
        if (!this.eventBuffer.has(bufferKey)) {
            this.eventBuffer.set(bufferKey, []);
        }
        const buffer = this.eventBuffer.get(bufferKey);
        buffer.push(event);
        // More aggressive buffer management - keep only last 30 minutes
        const cutoffTime = new Date(Date.now() - 30 * 60 * 1000);
        // Only clean if buffer is getting large
        if (buffer.length > 100) {
            const filteredBuffer = buffer.filter(e => new Date(e.timestamp) > cutoffTime);
            this.eventBuffer.set(bufferKey, filteredBuffer.slice(-50)); // Keep max 50 recent events
        }
    }
    // Utility functions for performance
    chunkArray(array, chunkSize) {
        const chunks = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }
    determineEventPriority(event) {
        // Enhanced priority detection
        const criticalEventIds = [
            '4624', '4625', '4648', '4778', '4779', // Authentication
            '1102', '4720', '4732', '4728', '4756', // Administrative
            '4648', '4768', '4769', '4771', // Kerberos
            '5140', '5145', '5156' // Network and sharing
        ];
        const criticalSources = ['security', 'system', 'application'];
        const criticalUsers = ['administrator', 'admin', 'root'];
        // High priority conditions
        if (criticalEventIds.includes(event.event_id) ||
            criticalSources.includes(event.source.toLowerCase()) ||
            event.metadata?.severity === 'critical' ||
            event.metadata?.priority === 'high' ||
            criticalUsers.some(user => event.user_name?.toLowerCase().includes(user))) {
            return 'high';
        }
        return 'normal';
    }
    async handleRuleMatchAsync(result, event) {
        try {
            const rule = this.activeRules.get(result.ruleId);
            if (!rule)
                return;
            // Optimized incident lookup with caching
            const incidentCacheKey = `incident:${result.ruleId}:${this.extractAssetKey(event)}`;
            let incident;
            // Fast incident lookup
            const existingIncident = await this.incidentManager.findOpenIncident(result.ruleId, event, rule.time_window_minutes);
            if (existingIncident) {
                incident = await this.incidentManager.updateIncident(existingIncident.id, event, result);
            }
            else {
                incident = await this.incidentManager.createIncident({
                    rule_id: result.ruleId,
                    incident_type: rule.type,
                    severity: rule.severity,
                    title: this.generateIncidentTitle(rule, event),
                    description: this.generateIncidentDescription(rule, event, result),
                    first_seen: event.timestamp,
                    last_seen: event.timestamp,
                    event_count: 1,
                    affected_assets: this.extractAffectedAssets(event),
                    metadata: result.metadata
                });
            }
            // Asynchronous action execution for better performance
            setImmediate(() => {
                this.actionExecutor.executeActions(rule, incident, event).catch(error => {
                    logger.error('Action execution failed:', error);
                });
            });
        }
        catch (error) {
            logger.error('Error in async rule match handling:', error);
        }
    }
    extractAssetKey(event) {
        return `${event.computer_name || 'unknown'}-${event.ip_address || 'unknown'}`;
    }
    generateIncidentTitle(rule, event) {
        const templates = {
            'authentication': `Auth Alert: ${rule.name} (${event.user_name || 'unknown'})`,
            'network': `Network: ${rule.name} (${event.ip_address || 'unknown'})`,
            'malware': `Malware: ${rule.name} (${event.computer_name || 'unknown'})`,
            'data_exfiltration': `Data Exfil: ${rule.name}`,
            'privilege_escalation': `PrivEsc: ${rule.name}`,
            'lateral_movement': `Lateral: ${rule.name}`,
            'default': `Security: ${rule.name}`
        };
        const category = rule.metadata?.category || 'default';
        return templates[category] || templates.default;
    }
    generateIncidentDescription(rule, event, result) {
        const baseDescription = rule.description || 'Security incident detected.';
        const eventSummary = `Event: ${event.event_id} from ${event.source} at ${event.timestamp}`;
        const context = result.metadata?.context ?
            `Context: ${JSON.stringify(result.metadata.context)}` : '';
        return [baseDescription, eventSummary, context].filter(Boolean).join('\n');
    }
    extractAffectedAssets(event) {
        const assets = new Set();
        if (event.computer_name)
            assets.add(event.computer_name);
        if (event.user_name)
            assets.add(`user:${event.user_name}`);
        if (event.ip_address)
            assets.add(`ip:${event.ip_address}`);
        if (event.metadata?.target_host)
            assets.add(event.metadata.target_host);
        return Array.from(assets);
    }
    // Performance monitoring and metrics
    updatePerformanceMetrics(processingTime) {
        this.performanceMetrics.totalEventsProcessed++;
        // Update rolling average (exponential moving average)
        const alpha = 0.1;
        this.performanceMetrics.averageProcessingTime =
            (this.performanceMetrics.averageProcessingTime * (1 - alpha)) +
                (processingTime * alpha);
        // Track for P99 calculation
        this.processingTimes.push(processingTime);
        if (this.processingTimes.length > 1000) {
            this.processingTimes = this.processingTimes.slice(-1000); // Keep last 1000
        }
        // Calculate P99
        if (this.processingTimes.length >= 10) {
            const sorted = [...this.processingTimes].sort((a, b) => a - b);
            const p99Index = Math.floor(sorted.length * 0.99);
            this.performanceMetrics.p99ProcessingTime = sorted[p99Index];
        }
    }
    isCircuitBreakerOpen() {
        if (this.circuitBreaker.failures >= this.circuitBreaker.threshold) {
            const timeSinceLastFailure = Date.now() - this.circuitBreaker.lastFailureTime;
            if (timeSinceLastFailure < this.circuitBreaker.timeoutMs) {
                this.circuitBreaker.isOpen = true;
                return true;
            }
            else {
                // Reset circuit breaker after timeout
                this.circuitBreaker.failures = 0;
                this.circuitBreaker.isOpen = false;
                this.circuitBreaker.halfOpenRequests = 0;
            }
        }
        return false;
    }
    startPerformanceMonitoring() {
        setInterval(() => {
            const cacheHitRatio = this.performanceMetrics.cacheHits /
                (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses) * 100 || 0;
            const stats = {
                avgProcessingTime: this.performanceMetrics.averageProcessingTime.toFixed(2),
                p99ProcessingTime: this.performanceMetrics.p99ProcessingTime.toFixed(2),
                totalEventsProcessed: this.performanceMetrics.totalEventsProcessed,
                cacheHitRatio: cacheHitRatio.toFixed(2),
                queueSize: this.queue.size,
                fastQueueSize: this.fastQueue.size,
                throughput: this.performanceMetrics.eventBatchMetrics.throughput.toFixed(2),
                circuitBreakerStatus: this.circuitBreaker.isOpen ? 'OPEN' : 'CLOSED',
                rulesIndexed: this.indexedRules.size,
                bloomFilterSize: this.bloomFilter.size
            };
            logger.info('Enhanced correlation engine performance:', stats);
            // Performance alerts
            if (this.performanceMetrics.averageProcessingTime > this.realTimeConfig.maxProcessingTimeMs) {
                logger.warn('Performance degradation detected:', {
                    currentAvg: this.performanceMetrics.averageProcessingTime.toFixed(2),
                    target: this.realTimeConfig.maxProcessingTimeMs,
                    p99: this.performanceMetrics.p99ProcessingTime.toFixed(2)
                });
            }
            // Adaptive configuration based on performance
            this.adaptivePerformanceTuning();
        }, 15000); // Report every 15 seconds
    }
    adaptivePerformanceTuning() {
        const avgTime = this.performanceMetrics.averageProcessingTime;
        const target = this.realTimeConfig.maxProcessingTimeMs;
        // Auto-enable stream mode if consistently fast
        if (avgTime < target * 0.5 && !this.realTimeConfig.streamProcessingMode) {
            this.realTimeConfig.streamProcessingMode = true;
            logger.info('Auto-enabled stream processing mode due to excellent performance');
        }
        // Auto-enable batching if queue is consistently large
        if (this.queue.size > 100 && !this.realTimeConfig.batchProcessingEnabled) {
            this.realTimeConfig.batchProcessingEnabled = true;
            logger.info('Auto-enabled batch processing due to high load');
        }
        // Reduce batch size if processing time is high
        if (avgTime > target && this.realTimeConfig.batchSize > 20) {
            this.realTimeConfig.batchSize = Math.max(20, this.realTimeConfig.batchSize - 10);
            logger.info(`Reduced batch size to ${this.realTimeConfig.batchSize} due to performance`);
        }
    }
    startCacheCleanup() {
        setInterval(() => {
            this.cleanupCache();
        }, 60000); // Clean every minute
    }
    cleanupCache() {
        const now = Date.now();
        let cleaned = 0;
        // Clean rule evaluation cache
        for (const [key, entry] of this.performanceMetrics.ruleEvaluationCache) {
            if (now - entry.timestamp > this.realTimeConfig.cacheExpirationMs) {
                this.performanceMetrics.ruleEvaluationCache.delete(key);
                cleaned++;
            }
        }
        // Clean rule cache
        for (const [key, entry] of this.ruleCache) {
            if (now - entry.timestamp > 30000) { // 30 second rule cache
                this.ruleCache.delete(key);
                cleaned++;
            }
        }
        if (cleaned > 0) {
            logger.debug(`Cleaned ${cleaned} expired cache entries`);
        }
    }
    startOptimizedEventBufferCleanup() {
        setInterval(() => {
            const cutoffTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes
            let cleaned = 0;
            for (const [key, events] of this.eventBuffer) {
                const originalSize = events.length;
                const filteredEvents = events.filter(e => new Date(e.timestamp) > cutoffTime);
                if (filteredEvents.length === 0) {
                    this.eventBuffer.delete(key);
                    cleaned += originalSize;
                }
                else if (filteredEvents.length < originalSize) {
                    this.eventBuffer.set(key, filteredEvents.slice(-100)); // Keep max 100
                    cleaned += (originalSize - filteredEvents.length);
                }
            }
            logger.debug(`Optimized buffer cleanup: removed ${cleaned} old events, ${this.eventBuffer.size} buffers active`);
        }, 2 * 60 * 1000); // Run every 2 minutes
    }
    async warmUpCaches() {
        logger.info('Warming up caches for optimal performance...');
        // Pre-populate rule cache with common patterns
        const commonEvents = ['4624', '4625', '4648', '4778'];
        const commonSources = ['security', 'system'];
        for (const eventId of commonEvents) {
            for (const source of commonSources) {
                const mockEvent = {
                    id: 'warmup',
                    event_id: eventId,
                    source: source,
                    timestamp: new Date().toISOString(),
                    computer_name: 'warmup',
                    user_name: 'warmup'
                };
                const rules = this.getApplicableRulesForEvent(mockEvent);
                logger.debug(`Warmed up ${rules.length} rules for ${eventId}:${source}`);
            }
        }
        logger.info('Cache warm-up completed');
    }
    // Public API methods with enhanced metrics
    async getEngineStats() {
        const cacheHitRatio = this.performanceMetrics.cacheHits /
            (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses) * 100 || 0;
        return {
            activeRules: this.activeRules.size,
            eventBufferSize: await this.getEventBufferSize(),
            queueSize: this.queue.size,
            fastQueueSize: this.fastQueue.size,
            bufferKeys: this.eventBuffer.size,
            performance: {
                totalEventsProcessed: this.performanceMetrics.totalEventsProcessed,
                averageProcessingTimeMs: this.performanceMetrics.averageProcessingTime.toFixed(2),
                p99ProcessingTimeMs: this.performanceMetrics.p99ProcessingTime.toFixed(2),
                throughputEventsPerSecond: this.performanceMetrics.eventBatchMetrics.throughput.toFixed(2),
                cacheHitRatio: cacheHitRatio.toFixed(2),
                cacheSize: this.performanceMetrics.ruleEvaluationCache.size,
                ruleCacheSize: this.ruleCache.size
            },
            circuitBreaker: {
                status: this.circuitBreaker.isOpen ? 'OPEN' : 'CLOSED',
                failures: this.circuitBreaker.failures,
                threshold: this.circuitBreaker.threshold
            },
            indexing: {
                indexedEventTypes: this.indexedRules.size,
                bloomFilterSize: this.bloomFilter.size,
                totalIndexEntries: Array.from(this.indexedRules.values()).reduce((sum, rules) => sum + rules.length, 0)
            },
            realTimeConfig: this.realTimeConfig
        };
    }
    async getEventBufferSize() {
        let totalEvents = 0;
        for (const events of this.eventBuffer.values()) {
            totalEvents += events.length;
        }
        return totalEvents;
    }
    async reloadRules() {
        await this.loadAndIndexActiveRules();
        await this.warmUpCaches();
        logger.info(`Enhanced rules reloaded: ${this.activeRules.size} active rules with optimized indexing`);
    }
    // Configuration management
    async updateRealTimeConfig(config) {
        this.realTimeConfig = { ...this.realTimeConfig, ...config };
        logger.info('Real-time configuration updated for sub-second performance:', this.realTimeConfig);
    }
    async enableStreamMode() {
        this.realTimeConfig.streamProcessingMode = true;
        this.isStreamMode = true;
        logger.info('Ultra-low latency stream processing mode enabled');
    }
    async shutdown() {
        try {
            // Clear timers
            if (this.batchTimer) {
                clearTimeout(this.batchTimer);
            }
            // Process remaining batches
            if (this.eventBatch.length > 0) {
                await this.processBatch();
            }
            // Wait for queues to finish
            await Promise.allSettled([
                this.queue.onIdle(),
                this.fastQueue.onIdle()
            ]);
            // Close connections
            await this.redis.quit();
            await this.db.end();
            logger.info('Enhanced correlation engine shut down successfully');
        }
        catch (error) {
            logger.error('Error during enhanced correlation engine shutdown:', error);
        }
    }
}
export const enhancedCorrelationEngine = new EnhancedCorrelationEngine();
//# sourceMappingURL=enhanced-correlation-engine.js.map