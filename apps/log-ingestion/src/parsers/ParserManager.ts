// SecureWatch Parser Manager
// Core parsing engine with automatic detection and community integration

import {
  LogParser,
  ParsedEvent,
  NormalizedEvent,
  ParserStats,
  ParserError,
  ParserValidationError,
  ParserTestResult,
  ParserValidationResult,
  SigmaRule,
  OSSECRule,
  ElasticRule,
} from './types';
import { CommunityParserLoader } from './loaders/CommunityParserLoader';
import { ParserValidator } from './validation/ParserValidator';
import { ParserMetrics } from './metrics/ParserMetrics';
import { EnrichmentEngine } from './enrichment/EnrichmentEngine';
import { logger } from '../utils/logger';

export class ParserManager {
  private parsers: Map<string, LogParser> = new Map();
  private parsersBySource: Map<string, LogParser[]> = new Map();
  private parsersByCategory: Map<string, LogParser[]> = new Map();
  private communityLoader: CommunityParserLoader;
  private validator: ParserValidator;
  private metrics: ParserMetrics;
  private enrichment: EnrichmentEngine;
  private isInitialized: boolean = false;

  constructor() {
    this.communityLoader = new CommunityParserLoader();
    this.validator = new ParserValidator();
    this.metrics = new ParserMetrics();
    this.enrichment = new EnrichmentEngine();
  }

  // Initialize the parser manager
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      logger.info('Initializing SecureWatch Parser Framework...');

      // Load built-in parsers
      await this.loadBuiltInParsers();

      // Load community parsers
      await this.loadCommunityParsers();

      // Initialize enrichment engine
      await this.enrichment.initialize();

      this.isInitialized = true;

      logger.info(
        `Parser framework initialized with ${this.parsers.size} parsers`
      );
      this.logParserStats();
    } catch (error) {
      logger.error('Failed to initialize parser framework:', error);
      throw error;
    }
  }

  // Register a new parser with validation
  async registerParser(parser: LogParser): Promise<void> {
    try {
      // Validate parser implementation
      const validationResult = await this.validator.validateParser(parser);
      if (!validationResult.isValid) {
        throw new ParserValidationError(
          parser.id,
          `Validation failed: ${validationResult.errors.join(', ')}`
        );
      }

      // Check for duplicate parser IDs
      if (this.parsers.has(parser.id)) {
        logger.warn(`Parser ${parser.id} already exists, replacing...`);
      }

      // Register parser
      this.parsers.set(parser.id, parser);

      // Index by log source
      if (!this.parsersBySource.has(parser.logSource)) {
        this.parsersBySource.set(parser.logSource, []);
      }
      this.parsersBySource.get(parser.logSource)!.push(parser);

      // Index by category
      if (!this.parsersByCategory.has(parser.category)) {
        this.parsersByCategory.set(parser.category, []);
      }
      this.parsersByCategory.get(parser.category)!.push(parser);

      // Sort parsers by priority (higher first)
      this.parsersBySource
        .get(parser.logSource)!
        .sort((a, b) => b.priority - a.priority);
      this.parsersByCategory
        .get(parser.category)!
        .sort((a, b) => b.priority - a.priority);

      logger.info(
        `Registered parser: ${parser.name} v${parser.version} (${parser.id})`
      );

      // Log warnings if any
      if (validationResult.warnings.length > 0) {
        logger.warn(`Parser ${parser.id} warnings:`, validationResult.warnings);
      }
    } catch (error) {
      logger.error(`Failed to register parser ${parser.id}:`, error);
      throw error;
    }
  }

  // Parse raw log with automatic parser detection
  async parseLog(
    rawLog: string,
    sourceHint?: string,
    categoryHint?: string
  ): Promise<NormalizedEvent | null> {
    const startTime = Date.now();

    try {
      // Get candidate parsers based on hints
      const candidates = this.getCandidateParsers(sourceHint, categoryHint);

      if (candidates.length === 0) {
        logger.warn('No candidate parsers found for log parsing');
        this.metrics.recordParseFailure('no_candidates', 0);
        return null;
      }

      // Try parsers in priority order
      for (const parser of candidates) {
        if (!parser.enabled) {
          continue;
        }

        try {
          const parseStartTime = Date.now();

          // Validate log format
          if (!parser.validate(rawLog)) {
            continue;
          }

          // Parse the log
          const parsed = parser.parse(rawLog);
          if (!parsed) {
            continue;
          }

          // Normalize to ECS format
          const normalized = parser.normalize(parsed);

          // Add parser metadata
          normalized['securewatch.parser.id'] = parser.id;
          normalized['securewatch.parser.version'] = parser.version;
          normalized['securewatch.parser.name'] = parser.name;

          // Calculate confidence score
          normalized['securewatch.confidence'] = this.calculateConfidence(
            parsed,
            parser
          );

          // Perform enrichment
          const enriched = await this.enrichment.enrichEvent(normalized);

          // Record metrics
          const parseTime = Date.now() - parseStartTime;
          this.metrics.recordParseSuccess(parser.id, parseTime);

          logger.debug(
            `Successfully parsed log with ${parser.id} in ${parseTime}ms`
          );

          return enriched;
        } catch (error) {
          const parseTime = Date.now() - parseStartTime;
          this.metrics.recordParseError(parser.id, parseTime, error as Error);

          logger.warn(`Parser ${parser.id} failed:`, error);
          // Continue to next parser
        }
      }

      // No parser succeeded
      const totalTime = Date.now() - startTime;
      this.metrics.recordParseFailure('no_match', totalTime);

      logger.debug(
        `No parser matched log after trying ${candidates.length} candidates`
      );
      return null;
    } catch (error) {
      const totalTime = Date.now() - startTime;
      this.metrics.recordParseFailure('system_error', totalTime);

      logger.error('System error during log parsing:', error);
      throw new ParserError(
        'system',
        'parsing',
        `System error: ${error.message}`,
        error as Error
      );
    }
  }

  // Batch parse multiple logs
  async parseLogsAsync(
    logs: Array<{ rawLog: string; sourceHint?: string; categoryHint?: string }>,
    batchSize: number = 100
  ): Promise<
    Array<{ index: number; result: NormalizedEvent | null; error?: Error }>
  > {
    const results: Array<{
      index: number;
      result: NormalizedEvent | null;
      error?: Error;
    }> = [];

    // Process in batches to avoid memory issues
    for (let i = 0; i < logs.length; i += batchSize) {
      const batch = logs.slice(i, i + batchSize);

      const batchPromises = batch.map(async (logData, batchIndex) => {
        const actualIndex = i + batchIndex;

        try {
          const result = await this.parseLog(
            logData.rawLog,
            logData.sourceHint,
            logData.categoryHint
          );

          return { index: actualIndex, result };
        } catch (error) {
          logger.error(`Batch parse error at index ${actualIndex}:`, error);
          return { index: actualIndex, result: null, error: error as Error };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Log batch progress
      if (logs.length > batchSize) {
        logger.info(
          `Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(logs.length / batchSize)}`
        );
      }
    }

    return results;
  }

  // Get candidate parsers based on hints
  private getCandidateParsers(
    sourceHint?: string,
    categoryHint?: string
  ): LogParser[] {
    const candidates: Set<LogParser> = new Set();

    // Add parsers by source hint
    if (sourceHint && this.parsersBySource.has(sourceHint)) {
      this.parsersBySource.get(sourceHint)!.forEach((p) => candidates.add(p));
    }

    // Add parsers by category hint
    if (categoryHint && this.parsersByCategory.has(categoryHint)) {
      this.parsersByCategory
        .get(categoryHint)!
        .forEach((p) => candidates.add(p));
    }

    // If no hints provided or no matches, try all parsers
    if (candidates.size === 0) {
      Array.from(this.parsers.values()).forEach((p) => candidates.add(p));
    }

    // Convert to array and sort by priority
    return Array.from(candidates).sort((a, b) => b.priority - a.priority);
  }

  // Calculate parser confidence score
  private calculateConfidence(event: ParsedEvent, parser: LogParser): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on field completeness
    const requiredFields = ['timestamp', 'source', 'category', 'action'];
    const presentFields = requiredFields.filter((field) => {
      const value = event[field as keyof ParsedEvent];
      return value !== undefined && value !== null && value !== '';
    });
    confidence += (presentFields.length / requiredFields.length) * 0.2;

    // Increase confidence for structured data
    if (event.user || event.device || event.network || event.process) {
      confidence += 0.1;
    }

    // Increase confidence for security-relevant events
    if (event.threat || event.authentication || event.authorization) {
      confidence += 0.15;
    }

    // Parser-specific confidence adjustments
    if (parser.category === 'endpoint' || parser.category === 'network') {
      confidence += 0.05;
    }

    // Decrease confidence for generic parsers
    if (parser.id.includes('generic') || parser.id.includes('fallback')) {
      confidence -= 0.2;
    }

    // Increase confidence based on parser priority
    if (parser.priority > 80) {
      confidence += 0.1;
    } else if (parser.priority < 20) {
      confidence -= 0.1;
    }

    return Math.max(0, Math.min(1, confidence));
  }

  // Load built-in parsers
  private async loadBuiltInParsers(): Promise<void> {
    try {
      // Import and register built-in parsers
      const { WindowsSecurityEventParser } = await import(
        './builtin/WindowsSecurityEventParser'
      );
      const { SysmonEventParser } = await import('./builtin/SysmonEventParser');
      const { ApacheAccessLogParser } = await import(
        './builtin/ApacheAccessLogParser'
      );
      const { PaloAltoFirewallParser } = await import(
        './builtin/PaloAltoFirewallParser'
      );
      const { AWSCloudTrailParser } = await import(
        './builtin/AWSCloudTrailParser'
      );
      const { LinuxAuthLogParser } = await import(
        './builtin/LinuxAuthLogParser'
      );
      const { Office365AuditParser } = await import(
        './builtin/Office365AuditParser'
      );
      const { CiscoASAParser } = await import('./builtin/CiscoASAParser');
      const { NginxAccessLogParser } = await import(
        './builtin/NginxAccessLogParser'
      );

      // Task 25 - Open Source Tools Parsers
      const { WazuhOSSECParser } = await import('./builtin/WazuhOSSECParser');
      const { ModSecurityParser } = await import('./builtin/ModSecurityParser');
      const { OpenVPNParser } = await import('./builtin/OpenVPNParser');
      const { KubernetesAuditParser } = await import(
        './builtin/KubernetesAuditParser'
      );
      const { DockerParser } = await import('./builtin/DockerParser');
      const { MySQLMariaDBParser } = await import(
        './builtin/MySQLMariaDBParser'
      );

      const { GenericSyslogParser } = await import(
        './builtin/GenericSyslogParser'
      );

      // Register built-in parsers
      await this.registerParser(new WindowsSecurityEventParser());
      await this.registerParser(new SysmonEventParser());
      await this.registerParser(new ApacheAccessLogParser());
      await this.registerParser(new PaloAltoFirewallParser());
      await this.registerParser(new AWSCloudTrailParser());
      await this.registerParser(new LinuxAuthLogParser());
      await this.registerParser(new Office365AuditParser());
      await this.registerParser(new CiscoASAParser());
      await this.registerParser(new NginxAccessLogParser());

      // Register Task 25 parsers
      await this.registerParser(new WazuhOSSECParser());
      await this.registerParser(new ModSecurityParser());
      await this.registerParser(new OpenVPNParser());
      await this.registerParser(new KubernetesAuditParser());
      await this.registerParser(new DockerParser());
      await this.registerParser(new MySQLMariaDBParser());

      await this.registerParser(new GenericSyslogParser()); // Lowest priority fallback

      logger.info('Built-in parsers loaded successfully');
    } catch (error) {
      logger.error('Failed to load built-in parsers:', error);
      throw error;
    }
  }

  // Load community parsers
  private async loadCommunityParsers(): Promise<void> {
    try {
      logger.info('Loading community parsers...');

      // Load Sigma rules
      const sigmaRules = await this.communityLoader.loadSigmaRules();
      for (const rule of sigmaRules) {
        try {
          const { SigmaRuleParser } = await import(
            './community/SigmaRuleParser'
          );
          await this.registerParser(new SigmaRuleParser(rule));
        } catch (error) {
          logger.warn(`Failed to load Sigma rule ${rule.title}:`, error);
        }
      }

      // Load OSSEC rules
      const ossecRules = await this.communityLoader.loadOSSECRules();
      for (const rule of ossecRules) {
        try {
          const { OSSECRuleParser } = await import(
            './community/OSSECRuleParser'
          );
          await this.registerParser(new OSSECRuleParser(rule));
        } catch (error) {
          logger.warn(`Failed to load OSSEC rule ${rule.id}:`, error);
        }
      }

      // Load Elastic detection rules
      const elasticRules = await this.communityLoader.loadElasticRules();
      for (const rule of elasticRules) {
        try {
          const { ElasticRuleParser } = await import(
            './community/ElasticRuleParser'
          );
          await this.registerParser(new ElasticRuleParser(rule));
        } catch (error) {
          logger.warn(`Failed to load Elastic rule ${rule.name}:`, error);
        }
      }

      logger.info(
        `Community parsers loaded: ${sigmaRules.length} Sigma, ${ossecRules.length} OSSEC, ${elasticRules.length} Elastic`
      );
    } catch (error) {
      logger.error('Failed to load community parsers:', error);
      // Don't throw - continue with built-in parsers
    }
  }

  // Get parser by ID
  getParser(parserId: string): LogParser | undefined {
    return this.parsers.get(parserId);
  }

  // List all parsers
  listParsers(): LogParser[] {
    return Array.from(this.parsers.values());
  }

  // Get parsers by category
  getParsersByCategory(category: string): LogParser[] {
    return this.parsersByCategory.get(category) || [];
  }

  // Get parsers by source
  getParsersBySource(source: string): LogParser[] {
    return this.parsersBySource.get(source) || [];
  }

  // Enable/disable parser
  setParserEnabled(parserId: string, enabled: boolean): boolean {
    const parser = this.parsers.get(parserId);
    if (!parser) {
      return false;
    }

    parser.enabled = enabled;
    logger.info(`Parser ${parserId} ${enabled ? 'enabled' : 'disabled'}`);
    return true;
  }

  // Test parser with sample data
  async testParser(
    parserId: string,
    testData: string[]
  ): Promise<ParserTestResult> {
    const parser = this.parsers.get(parserId);
    if (!parser) {
      throw new Error(`Parser ${parserId} not found`);
    }

    const testCases = testData.map((data, index) => ({
      name: `Test case ${index + 1}`,
      input: data,
      expectedOutput: {},
      shouldPass: true,
    }));

    return this.validator.testParser(parser, testCases);
  }

  // Get parser statistics
  getParserStats(): ParserStats {
    const stats: ParserStats = {
      totalParsers: this.parsers.size,
      activeParsers: Array.from(this.parsers.values()).filter((p) => p.enabled)
        .length,
      byCategory: {},
      byVendor: {},
      byFormat: {},
      performance: this.metrics.getAggregatedMetrics(),
      topPerformers: this.metrics.getTopPerformers(5),
    };

    // Calculate distribution statistics
    this.parsers.forEach((parser) => {
      // Count by category
      stats.byCategory[parser.category] =
        (stats.byCategory[parser.category] || 0) + 1;

      // Count by vendor
      stats.byVendor[parser.vendor] = (stats.byVendor[parser.vendor] || 0) + 1;

      // Count by format
      stats.byFormat[parser.format] = (stats.byFormat[parser.format] || 0) + 1;
    });

    return stats;
  }

  // Get parser performance metrics
  getParserMetrics(parserId?: string) {
    return this.metrics.getMetrics(parserId);
  }

  // Reset parser metrics
  resetMetrics(parserId?: string): void {
    this.metrics.reset(parserId);
  }

  // Unregister parser
  unregisterParser(parserId: string): boolean {
    const parser = this.parsers.get(parserId);
    if (!parser) {
      return false;
    }

    // Remove from main registry
    this.parsers.delete(parserId);

    // Remove from source index
    const sourceParsers = this.parsersBySource.get(parser.logSource);
    if (sourceParsers) {
      const index = sourceParsers.findIndex((p) => p.id === parserId);
      if (index !== -1) {
        sourceParsers.splice(index, 1);
      }
    }

    // Remove from category index
    const categoryParsers = this.parsersByCategory.get(parser.category);
    if (categoryParsers) {
      const index = categoryParsers.findIndex((p) => p.id === parserId);
      if (index !== -1) {
        categoryParsers.splice(index, 1);
      }
    }

    logger.info(`Unregistered parser: ${parserId}`);
    return true;
  }

  // Log parser statistics
  private logParserStats(): void {
    const stats = this.getParserStats();

    logger.info('Parser Framework Statistics:');
    logger.info(`  Total parsers: ${stats.totalParsers}`);
    logger.info(`  Active parsers: ${stats.activeParsers}`);
    logger.info(`  By category: ${JSON.stringify(stats.byCategory)}`);
    logger.info(`  By vendor: ${JSON.stringify(stats.byVendor)}`);
    logger.info(`  By format: ${JSON.stringify(stats.byFormat)}`);
  }

  // Shutdown parser manager
  async shutdown(): Promise<void> {
    logger.info('Shutting down parser framework...');

    // Clear all parsers
    this.parsers.clear();
    this.parsersBySource.clear();
    this.parsersByCategory.clear();

    // Shutdown components
    await this.enrichment.shutdown();

    this.isInitialized = false;
    logger.info('Parser framework shutdown complete');
  }
}
