// Threat Intelligence Package Exports

// Types
export * from './types/threat-intel.types';

// Connectors
export { BaseThreatIntelConnector } from './connectors/base-connector';
export { MISPConnector } from './connectors/misp-connector';
export { VirusTotalConnector } from './connectors/virustotal-connector';
export { OTXConnector } from './connectors/otx-connector';

// Services
export { IOCDatabase } from './services/ioc-database';
export { AlertEnrichmentService } from './services/alert-enrichment-service';
export { ThreatHuntingService } from './services/threat-hunting-service';

// Engines
export { SigmaRuleEngine } from './engines/sigma-rule-engine';
export { UEBAEngine } from './engines/ueba-engine';
export { CorrelationEngine } from './engines/correlation-engine';

// Utilities
export { logger } from './utils/logger';

// Main Threat Intelligence Manager
import { EventEmitter } from 'events';
import { ThreatFeedConfig, IOC, ThreatActor, DetectionAlert } from './types/threat-intel.types';
import { BaseThreatIntelConnector } from './connectors/base-connector';
import { MISPConnector } from './connectors/misp-connector';
import { VirusTotalConnector } from './connectors/virustotal-connector';
import { OTXConnector } from './connectors/otx-connector';
import { IOCDatabase } from './services/ioc-database';
import { AlertEnrichmentService } from './services/alert-enrichment-service';
import { ThreatHuntingService } from './services/threat-hunting-service';
import { SigmaRuleEngine } from './engines/sigma-rule-engine';
import { UEBAEngine } from './engines/ueba-engine';
import { CorrelationEngine } from './engines/correlation-engine';
import knex, { Knex } from 'knex';

export interface ThreatIntelConfig {
  database: {
    type: 'sqlite' | 'postgres' | 'mysql';
    connection: any;
  };
  feeds: ThreatFeedConfig[];
  enabledEngines: {
    sigma: boolean;
    ueba: boolean;
    correlation: boolean;
    hunting: boolean;
  };
}

export class ThreatIntelligenceManager extends EventEmitter {
  private config: ThreatIntelConfig;
  private db: Knex;
  private connectors: Map<string, BaseThreatIntelConnector> = new Map();
  private iocDatabase: IOCDatabase;
  private sigmaEngine?: SigmaRuleEngine;
  private uebaEngine?: UEBAEngine;
  private correlationEngine?: CorrelationEngine;
  private enrichmentService: AlertEnrichmentService;
  private huntingService?: ThreatHuntingService;

  constructor(config: ThreatIntelConfig) {
    super();
    this.config = config;
    
    // Initialize database
    this.db = knex({
      client: config.database.type,
      connection: config.database.connection,
      useNullAsDefault: true
    });

    // Initialize IOC database
    this.iocDatabase = new IOCDatabase(config.database);
    
    // Initialize enrichment service
    this.enrichmentService = new AlertEnrichmentService(this.iocDatabase);
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Threat Intelligence Manager');

    // Initialize IOC database
    await this.iocDatabase.initialize();

    // Initialize threat intel connectors
    for (const feedConfig of this.config.feeds) {
      await this.initializeConnector(feedConfig);
    }

    // Initialize engines based on configuration
    if (this.config.enabledEngines.sigma) {
      this.sigmaEngine = new SigmaRuleEngine();
      logger.info('SIGMA engine initialized');
    }

    if (this.config.enabledEngines.ueba) {
      this.uebaEngine = new UEBAEngine(this.config.database);
      await this.uebaEngine.initialize();
      logger.info('UEBA engine initialized');
    }

    if (this.config.enabledEngines.correlation) {
      this.correlationEngine = new CorrelationEngine();
      logger.info('Correlation engine initialized');
    }

    if (this.config.enabledEngines.hunting && this.sigmaEngine && this.uebaEngine) {
      this.huntingService = new ThreatHuntingService({
        db: this.db,
        sigmaEngine: this.sigmaEngine,
        uebaEngine: this.uebaEngine,
        iocDatabase: this.iocDatabase
      });
      await this.huntingService.initialize();
      logger.info('Hunting service initialized');
    }

    // Set up event handlers
    this.setupEventHandlers();

    logger.info('Threat Intelligence Manager initialized successfully');
  }

  private async initializeConnector(feedConfig: ThreatFeedConfig): Promise<void> {
    let connector: BaseThreatIntelConnector;

    switch (feedConfig.type) {
      case 'misp':
        connector = new MISPConnector({ config: feedConfig });
        break;
      case 'virustotal':
        connector = new VirusTotalConnector({ config: feedConfig });
        break;
      case 'otx':
        connector = new OTXConnector({ config: feedConfig });
        break;
      default:
        logger.warn(`Unknown connector type: ${feedConfig.type}`);
        return;
    }

    // Set up connector event handlers
    connector.on('iocs', async (iocs: IOC[]) => {
      await this.handleNewIOCs(feedConfig.name, iocs);
    });

    connector.on('error', (error: any) => {
      logger.error(`Connector error from ${feedConfig.name}`, error);
      this.emit('connector-error', { connector: feedConfig.name, error });
    });

    this.connectors.set(feedConfig.id, connector);
    
    // Start the connector
    await connector.start();
    logger.info(`Initialized connector: ${feedConfig.name}`);
  }

  private setupEventHandlers(): void {
    // IOC database events
    this.iocDatabase.on('ioc-added', (data) => {
      this.emit('ioc-added', data);
    });

    this.iocDatabase.on('ioc-updated', (data) => {
      this.emit('ioc-updated', data);
    });

    // SIGMA engine events
    if (this.sigmaEngine) {
      this.sigmaEngine.on('rule-loaded', (data) => {
        this.emit('sigma-rule-loaded', data);
      });
    }

    // UEBA engine events
    if (this.uebaEngine) {
      this.uebaEngine.on('anomaly-detected', (anomaly) => {
        this.emit('behavior-anomaly', anomaly);
      });
    }

    // Correlation engine events
    if (this.correlationEngine) {
      this.correlationEngine.on('correlation-match', (match) => {
        this.emit('correlation-detected', match);
      });

      this.correlationEngine.on('alert', async (alert) => {
        await this.handleAlert(alert);
      });
    }

    // Hunting service events
    if (this.huntingService) {
      this.huntingService.on('hunt-created', (hunt) => {
        this.emit('hunt-created', hunt);
      });

      this.huntingService.on('finding-added', (data) => {
        this.emit('hunt-finding', data);
      });
    }
  }

  private async handleNewIOCs(source: string, iocs: IOC[]): Promise<void> {
    logger.info(`Received ${iocs.length} IOCs from ${source}`);
    
    // Bulk add to database
    const result = await this.iocDatabase.bulkAddIOCs(iocs);
    
    logger.info(`Added ${result.added} new IOCs, updated ${result.updated} existing IOCs`);
    
    this.emit('iocs-processed', {
      source,
      total: iocs.length,
      added: result.added,
      updated: result.updated
    });
  }

  private async handleAlert(alert: DetectionAlert): Promise<void> {
    // Enrich the alert
    const enrichment = await this.enrichmentService.enrichAlert(alert);
    
    // Emit enriched alert
    this.emit('enriched-alert', {
      alert,
      enrichment
    });

    // Record user behavior if UEBA is enabled
    if (this.uebaEngine && alert.source.user) {
      await this.uebaEngine.recordUserActivity(alert.source.user, {
        action: 'security-alert',
        severity: alert.severity,
        metadata: {
          alertId: alert.id,
          ruleName: alert.ruleName
        }
      });
    }
  }

  // Public API Methods
  async searchIOCs(criteria: any): Promise<{ iocs: IOC[]; total: number }> {
    return this.iocDatabase.searchIOCs(criteria);
  }

  async enrichAlert(alert: DetectionAlert): Promise<any> {
    return this.enrichmentService.enrichAlert(alert);
  }

  async loadSigmaRule(content: string, format: 'yaml' | 'json' = 'yaml'): Promise<string> {
    if (!this.sigmaEngine) {
      throw new Error('SIGMA engine is not enabled');
    }
    return this.sigmaEngine.loadRule(content, format);
  }

  async processEvent(event: any): Promise<{
    alerts: DetectionAlert[];
    correlations: any[];
    anomalies: any[];
  }> {
    const results = {
      alerts: [] as DetectionAlert[],
      correlations: [] as any[],
      anomalies: [] as any[]
    };

    // SIGMA detection
    if (this.sigmaEngine) {
      const sigmaAlerts = await this.sigmaEngine.evaluateEvent(event);
      results.alerts.push(...sigmaAlerts);
    }

    // Correlation detection
    if (this.correlationEngine) {
      const correlations = await this.correlationEngine.processEvent(event);
      results.correlations.push(...correlations);
    }

    // UEBA analysis
    if (this.uebaEngine && event.data?.User) {
      await this.uebaEngine.recordUserActivity(event.data.User, {
        action: event.type || 'unknown',
        metadata: event.data
      });
    }

    return results;
  }

  async createThreatHunt(params: any): Promise<any> {
    if (!this.huntingService) {
      throw new Error('Hunting service is not enabled');
    }
    return this.huntingService.createHunt(params);
  }

  async runAutomatedHunt(templateId: string, options?: any): Promise<any> {
    if (!this.huntingService) {
      throw new Error('Hunting service is not enabled');
    }
    return this.huntingService.runAutomatedHunt(templateId, options);
  }

  // Statistics
  async getStatistics(): Promise<any> {
    const stats: any = {
      ioc: await this.iocDatabase.getStatistics(),
      connectors: {}
    };

    // Connector stats
    for (const [id, connector] of this.connectors) {
      stats.connectors[id] = connector.getInfo();
    }

    // Engine stats
    if (this.sigmaEngine) {
      stats.sigma = this.sigmaEngine.getStatistics();
    }

    if (this.uebaEngine) {
      stats.ueba = await this.uebaEngine.getStatistics();
    }

    if (this.correlationEngine) {
      stats.correlation = this.correlationEngine.getStatistics();
    }

    return stats;
  }

  // Shutdown
  async shutdown(): Promise<void> {
    logger.info('Shutting down Threat Intelligence Manager');

    // Stop all connectors
    for (const connector of this.connectors.values()) {
      await connector.stop();
    }

    // Shutdown engines
    if (this.uebaEngine) {
      await this.uebaEngine.shutdown();
    }

    if (this.correlationEngine) {
      this.correlationEngine.shutdown();
    }

    // Shutdown IOC database
    await this.iocDatabase.shutdown();

    // Close database connection
    await this.db.destroy();

    logger.info('Threat Intelligence Manager shutdown complete');
  }
}