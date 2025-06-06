// Rule Ingestor Service - Main orchestration service for rule ingestion
// Coordinates repository management, rule conversion, and database storage

import { DatabaseService } from './DatabaseService';
import { GitRepositoryManager } from './GitRepositoryManager';
import { RuleConverterService } from './RuleConverterService';
import { logger } from '../utils/logger';
import { RuleImportResult } from '@securewatch/rule-management';
import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';

export interface SourceConfig {
  name: string;
  type: 'sigma' | 'elastic' | 'ossec' | 'suricata' | 'splunk' | 'chronicle';
  url: string;
  branch: string;
  rulePaths: string[];
  description: string;
  enabled: boolean;
  updateInterval?: string;
}

export interface ImportSourceResult {
  source: string;
  success: boolean;
  importResult?: RuleImportResult;
  error?: string;
  duration: number;
}

export interface ServiceMetrics {
  totalRulesImported: number;
  activeRules: number;
  lastImportTime?: string;
  importHistory: {
    total: number;
    successful: number;
    failed: number;
  };
  rulesBySource: Record<string, number>;
  averageImportDuration: number;
}

export class RuleIngestorService {
  private dbService: DatabaseService;
  private gitManager: GitRepositoryManager;
  private converterService: RuleConverterService;
  private metrics: ServiceMetrics;

  constructor(
    dbService: DatabaseService,
    gitManager: GitRepositoryManager,
    converterService: RuleConverterService
  ) {
    this.dbService = dbService;
    this.gitManager = gitManager;
    this.converterService = converterService;
    this.metrics = this.initializeMetrics();
  }

  // Import rules from a specific source
  async importFromSource(sourceConfig: SourceConfig, forceUpdate: boolean = false): Promise<RuleImportResult> {
    const startTime = Date.now();
    logger.info(`Starting import from source: ${sourceConfig.name}`);

    try {
      // Clone or update repository
      const repoPath = await this.gitManager.cloneOrUpdate(
        sourceConfig.url,
        sourceConfig.name,
        sourceConfig.branch,
        forceUpdate
      );

      // Find rule files
      const ruleFiles = await this.findRuleFiles(repoPath, sourceConfig.rulePaths, sourceConfig.type);
      logger.info(`Found ${ruleFiles.length} rule files in ${sourceConfig.name}`);

      if (ruleFiles.length === 0) {
        return {
          total_rules: 0,
          successful_imports: 0,
          failed_imports: 0,
          skipped_rules: 0,
          errors: [],
          import_duration: Date.now() - startTime
        };
      }

      // Convert and import rules
      const importResult = await this.processRuleFiles(ruleFiles, sourceConfig);

      // Record import batch
      await this.dbService.recordImportBatch({
        source_type: sourceConfig.type,
        source_url: sourceConfig.url,
        source_version: await this.gitManager.getCurrentCommit(repoPath),
        total_rules: importResult.total_rules,
        successful_imports: importResult.successful_imports,
        failed_imports: importResult.failed_imports,
        skipped_rules: importResult.skipped_rules,
        import_duration: importResult.import_duration,
        error_summary: importResult.errors.length > 0 ? { errors: importResult.errors } : null
      });

      // Update metrics
      this.updateMetrics(importResult);

      logger.info(`Import from ${sourceConfig.name} completed:`, {
        total: importResult.total_rules,
        successful: importResult.successful_imports,
        failed: importResult.failed_imports,
        duration: importResult.import_duration
      });

      return importResult;

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Import from ${sourceConfig.name} failed:`, error);

      return {
        total_rules: 0,
        successful_imports: 0,
        failed_imports: 0,
        skipped_rules: 0,
        errors: [{
          error: error instanceof Error ? error.message : 'Unknown error'
        }],
        import_duration: duration
      };
    }
  }

  // Import from all enabled sources
  async importFromAllSources(forceUpdate: boolean = false): Promise<ImportSourceResult[]> {
    const { config } = await import('../config/config');
    const enabledSources = config.repositories.sources.filter(source => source.enabled);
    
    logger.info(`Starting import from ${enabledSources.length} enabled sources`);

    const results: ImportSourceResult[] = [];

    for (const sourceConfig of enabledSources) {
      const startTime = Date.now();

      try {
        const importResult = await this.importFromSource(sourceConfig, forceUpdate);
        
        results.push({
          source: sourceConfig.name,
          success: true,
          importResult,
          duration: Date.now() - startTime
        });

      } catch (error) {
        logger.error(`Failed to import from ${sourceConfig.name}:`, error);
        
        results.push({
          source: sourceConfig.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: Date.now() - startTime
        });
      }
    }

    logger.info('All source imports completed:', {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });

    return results;
  }

  // Find rule files in repository
  private async findRuleFiles(repoPath: string, rulePaths: string[], sourceType: string): Promise<string[]> {
    const allFiles: string[] = [];

    for (const rulePath of rulePaths) {
      const searchPath = path.join(repoPath, rulePath);
      
      try {
        // Determine file pattern based on source type
        let pattern: string;
        switch (sourceType) {
          case 'sigma':
            pattern = '**/*.yml';
            break;
          case 'elastic':
            pattern = '**/*.toml';
            break;
          case 'ossec':
            pattern = '**/*.xml';
            break;
          case 'suricata':
            pattern = '**/*.rules';
            break;
          case 'splunk':
            pattern = '**/*.yml';
            break;
          case 'chronicle':
            pattern = '**/*.yaral';
            break;
          default:
            pattern = '**/*';
        }

        const files = await glob(pattern, {
          cwd: searchPath,
          absolute: true,
          nodir: true
        });

        allFiles.push(...files);
        
      } catch (error) {
        logger.warn(`Failed to search path ${searchPath}:`, error);
      }
    }

    return [...new Set(allFiles)]; // Remove duplicates
  }

  // Process rule files and convert them
  private async processRuleFiles(ruleFiles: string[], sourceConfig: SourceConfig): Promise<RuleImportResult> {
    const startTime = Date.now();
    const results: RuleImportResult = {
      total_rules: ruleFiles.length,
      successful_imports: 0,
      failed_imports: 0,
      skipped_rules: 0,
      errors: [],
      import_duration: 0
    };

    // Process files in batches to avoid memory issues
    const batchSize = 100;
    
    for (let i = 0; i < ruleFiles.length; i += batchSize) {
      const batch = ruleFiles.slice(i, i + batchSize);
      logger.debug(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(ruleFiles.length / batchSize)}`);

      const batchPromises = batch.map(async (filePath) => {
        try {
          // Read file content
          const content = await fs.readFile(filePath, 'utf-8');
          
          // Skip empty files
          if (!content.trim()) {
            results.skipped_rules++;
            return;
          }

          // Convert rule based on source type
          const conversionResult = await this.converterService.convertRule(sourceConfig.type, content, {
            source_url: sourceConfig.url,
            file_path: filePath
          });

          if (conversionResult.success && conversionResult.rule) {
            // Check if rule already exists
            const existingRule = await this.dbService.getRuleByRuleId(conversionResult.rule.rule_id);
            
            if (existingRule && !existingRule.custom_modified) {
              // Update existing rule
              await this.dbService.updateRule(conversionResult.rule);
              results.successful_imports++;
            } else if (!existingRule) {
              // Insert new rule
              await this.dbService.insertRule(conversionResult.rule);
              results.successful_imports++;
            } else {
              // Skip custom modified rules
              results.skipped_rules++;
            }
          } else {
            results.failed_imports++;
            results.errors.push({
              rule_id: path.basename(filePath),
              error: conversionResult.errors.join('; '),
              original_rule: content.substring(0, 500) // First 500 chars for context
            });
          }

        } catch (error) {
          results.failed_imports++;
          results.errors.push({
            rule_id: path.basename(filePath),
            error: error instanceof Error ? error.message : 'Unknown processing error',
            original_rule: null
          });
        }
      });

      await Promise.all(batchPromises);

      // Log progress
      if (ruleFiles.length > batchSize) {
        const processed = Math.min(i + batchSize, ruleFiles.length);
        logger.info(`Processed ${processed}/${ruleFiles.length} rules`);
      }
    }

    results.import_duration = Date.now() - startTime;
    return results;
  }

  // Get service metrics
  async getMetrics(): Promise<ServiceMetrics> {
    try {
      // Get current stats from database
      const stats = await this.dbService.getRuleStatistics();
      const importHistory = await this.dbService.getImportHistory({ limit: 100 });

      const totalImports = importHistory.length;
      const successfulImports = importHistory.filter(h => h.failed_imports === 0).length;
      const avgDuration = importHistory.length > 0 
        ? importHistory.reduce((sum, h) => sum + (h.import_duration || 0), 0) / importHistory.length
        : 0;

      return {
        totalRulesImported: stats.total_rules,
        activeRules: stats.enabled_rules,
        lastImportTime: importHistory[0]?.created_at,
        importHistory: {
          total: totalImports,
          successful: successfulImports,
          failed: totalImports - successfulImports
        },
        rulesBySource: stats.rules_by_source || {},
        averageImportDuration: avgDuration
      };

    } catch (error) {
      logger.error('Failed to get metrics:', error);
      return this.metrics;
    }
  }

  // Initialize metrics
  private initializeMetrics(): ServiceMetrics {
    return {
      totalRulesImported: 0,
      activeRules: 0,
      importHistory: {
        total: 0,
        successful: 0,
        failed: 0
      },
      rulesBySource: {},
      averageImportDuration: 0
    };
  }

  // Update metrics after import
  private updateMetrics(importResult: RuleImportResult): void {
    this.metrics.totalRulesImported += importResult.successful_imports;
    this.metrics.lastImportTime = new Date().toISOString();
    this.metrics.importHistory.total++;
    
    if (importResult.failed_imports === 0) {
      this.metrics.importHistory.successful++;
    } else {
      this.metrics.importHistory.failed++;
    }

    // Update average duration
    const totalDuration = this.metrics.averageImportDuration * (this.metrics.importHistory.total - 1) + importResult.import_duration;
    this.metrics.averageImportDuration = totalDuration / this.metrics.importHistory.total;
  }
}