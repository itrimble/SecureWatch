import { EventEmitter } from 'events';
import { ThreatHunt, DetectionAlert, SigmaRule } from '../types/threat-intel.types';
import { SigmaRuleEngine } from '../engines/sigma-rule-engine';
import { UEBAEngine } from '../engines/ueba-engine';
import { IOCDatabase } from './ioc-database';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import knex, { Knex } from 'knex';

interface HuntQuery {
  name: string;
  query: string;
  type: 'kql' | 'sql' | 'custom';
  description?: string;
  expectedResults?: string;
}

interface HuntTemplate {
  id: string;
  name: string;
  description: string;
  category: 'persistence' | 'lateral-movement' | 'exfiltration' | 'command-control' | 'defense-evasion' | 'custom';
  techniques: string[]; // MITRE ATT&CK IDs
  queries: HuntQuery[];
  dataSource: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // minutes
  references: string[];
}

interface HuntFinding {
  timestamp: Date;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  evidence: string[];
  iocs: string[];
  affectedEntities: Array<{
    type: 'user' | 'host' | 'process' | 'file';
    identifier: string;
  }>;
  recommendations: string[];
}

interface HuntPlaybook {
  id: string;
  name: string;
  description: string;
  steps: Array<{
    order: number;
    name: string;
    description: string;
    queries: HuntQuery[];
    successCriteria: string;
    failureActions: string[];
  }>;
  requiredDataSources: string[];
  estimatedDuration: number;
}

export class ThreatHuntingService extends EventEmitter {
  private db: Knex;
  private sigmaEngine: SigmaRuleEngine;
  private uebaEngine: UEBAEngine;
  private iocDatabase: IOCDatabase;
  private huntTemplates: Map<string, HuntTemplate> = new Map();
  private activeHunts: Map<string, ThreatHunt> = new Map();
  private huntPlaybooks: Map<string, HuntPlaybook> = new Map();

  constructor(config: {
    db: Knex;
    sigmaEngine: SigmaRuleEngine;
    uebaEngine: UEBAEngine;
    iocDatabase: IOCDatabase;
  }) {
    super();
    this.db = config.db;
    this.sigmaEngine = config.sigmaEngine;
    this.uebaEngine = config.uebaEngine;
    this.iocDatabase = config.iocDatabase;
    
    this.initializeTemplates();
    this.initializePlaybooks();
  }

  async initialize(): Promise<void> {
    await this.createTables();
    await this.loadSavedHunts();
  }

  private async createTables(): Promise<void> {
    // Threat hunts table
    if (!(await this.db.schema.hasTable('threat_hunts'))) {
      await this.db.schema.createTable('threat_hunts', (table) => {
        table.string('id').primary();
        table.string('name').notNullable();
        table.text('description');
        table.text('hypothesis');
        table.string('status', 20).notNullable();
        table.string('assignee');
        table.dateTime('created_at').notNullable();
        table.dateTime('started_at');
        table.dateTime('completed_at');
        table.json('techniques');
        table.json('data_sources');
        table.json('queries');
        table.json('findings');
        table.json('metrics');
        table.json('metadata');
        table.dateTime('updated_at').defaultTo(this.db.fn.now());
        
        table.index(['status']);
        table.index(['assignee']);
        table.index(['created_at']);
      });
    }

    // Hunt findings table
    if (!(await this.db.schema.hasTable('hunt_findings'))) {
      await this.db.schema.createTable('hunt_findings', (table) => {
        table.string('id').primary();
        table.string('hunt_id').notNullable();
        table.dateTime('timestamp').notNullable();
        table.text('description');
        table.string('severity', 20).notNullable();
        table.json('evidence');
        table.json('iocs');
        table.json('affected_entities');
        table.json('recommendations');
        table.dateTime('created_at').defaultTo(this.db.fn.now());
        
        table.foreign('hunt_id').references('threat_hunts.id').onDelete('CASCADE');
        table.index(['hunt_id']);
        table.index(['severity']);
        table.index(['timestamp']);
      });
    }
  }

  private initializeTemplates(): void {
    // PowerShell Empire Detection
    this.huntTemplates.set('powershell-empire', {
      id: 'powershell-empire',
      name: 'PowerShell Empire Detection',
      description: 'Hunt for indicators of PowerShell Empire C2 framework',
      category: 'command-control',
      techniques: ['T1059.001', 'T1086', 'T1071.001'],
      queries: [
        {
          name: 'Encoded PowerShell Commands',
          query: 'EventID == 4688 and ProcessCommandLine contains "-enc" and ProcessName endswith "powershell.exe"',
          type: 'kql',
          description: 'Look for encoded PowerShell commands commonly used by Empire'
        },
        {
          name: 'Empire Default User Agent',
          query: 'EventID == 5156 and UserAgent contains "Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0)"',
          type: 'kql',
          description: 'Detect default Empire user agent string'
        },
        {
          name: 'Suspicious PowerShell Network Connections',
          query: 'ProcessName endswith "powershell.exe" and (DestinationPort == 443 or DestinationPort == 8443)',
          type: 'kql',
          description: 'PowerShell making HTTPS connections'
        }
      ],
      dataSource: ['Windows Security', 'Sysmon', 'Network'],
      difficulty: 'intermediate',
      estimatedTime: 60,
      references: [
        'https://github.com/BC-SECURITY/Empire',
        'https://attack.mitre.org/software/S0363/'
      ]
    });

    // Lateral Movement Detection
    this.huntTemplates.set('lateral-movement', {
      id: 'lateral-movement',
      name: 'Lateral Movement Detection',
      description: 'Hunt for signs of lateral movement within the network',
      category: 'lateral-movement',
      techniques: ['T1021.001', 'T1021.002', 'T1047', 'T1053.005'],
      queries: [
        {
          name: 'RDP Connections',
          query: 'EventID == 4624 and LogonType == 10',
          type: 'kql',
          description: 'Remote Desktop connections'
        },
        {
          name: 'PsExec Usage',
          query: 'EventID == 7045 and ServiceName contains "PSEXESVC"',
          type: 'kql',
          description: 'PsExec service installation'
        },
        {
          name: 'WMI Remote Execution',
          query: 'EventID == 4688 and ParentProcessName endswith "wmiprvse.exe" and ProcessName != "wmiprvse.exe"',
          type: 'kql',
          description: 'Processes spawned by WMI'
        },
        {
          name: 'Scheduled Task Creation',
          query: 'EventID == 4698 and TaskName not in ("\\Microsoft\\Windows\\*")',
          type: 'kql',
          description: 'Non-Microsoft scheduled tasks'
        }
      ],
      dataSource: ['Windows Security', 'Sysmon'],
      difficulty: 'intermediate',
      estimatedTime: 90,
      references: [
        'https://attack.mitre.org/tactics/TA0008/'
      ]
    });

    // Data Exfiltration
    this.huntTemplates.set('data-exfiltration', {
      id: 'data-exfiltration',
      name: 'Data Exfiltration Detection',
      description: 'Hunt for potential data exfiltration activities',
      category: 'exfiltration',
      techniques: ['T1048', 'T1567', 'T1537'],
      queries: [
        {
          name: 'Large Outbound Data Transfers',
          query: 'BytesSent > 100000000 and DestinationPort in (443, 22, 21)',
          type: 'kql',
          description: 'Large data transfers over encrypted channels'
        },
        {
          name: 'Uncommon Cloud Storage Access',
          query: 'DestinationHostname in ("*.dropbox.com", "*.box.com", "*.mega.nz")',
          type: 'kql',
          description: 'Access to cloud storage services'
        },
        {
          name: 'DNS Tunneling Detection',
          query: 'QueryType == "TXT" and QueryResponseSize > 200',
          type: 'kql',
          description: 'Large DNS TXT responses indicating possible tunneling'
        }
      ],
      dataSource: ['Network', 'DNS', 'Proxy'],
      difficulty: 'advanced',
      estimatedTime: 120,
      references: [
        'https://attack.mitre.org/tactics/TA0010/'
      ]
    });
  }

  private initializePlaybooks(): void {
    // Incident Response Playbook
    this.huntPlaybooks.set('incident-response', {
      id: 'incident-response',
      name: 'Security Incident Response',
      description: 'Structured approach to investigating security incidents',
      steps: [
        {
          order: 1,
          name: 'Initial Triage',
          description: 'Assess the scope and severity of the incident',
          queries: [
            {
              name: 'Recent High Severity Alerts',
              query: 'Severity in ("high", "critical") and Timestamp > ago(1h)',
              type: 'kql'
            }
          ],
          successCriteria: 'Identified primary affected systems and attack vectors',
          failureActions: ['Escalate to senior analyst', 'Expand search timeframe']
        },
        {
          order: 2,
          name: 'IOC Identification',
          description: 'Extract and validate indicators of compromise',
          queries: [
            {
              name: 'Extract Unique IPs',
              query: 'summarize by SourceIP, DestinationIP | where SourceIP != "10.0.0.0/8"',
              type: 'kql'
            }
          ],
          successCriteria: 'Compiled list of malicious indicators',
          failureActions: ['Check threat intelligence feeds', 'Review similar past incidents']
        },
        {
          order: 3,
          name: 'Lateral Movement Analysis',
          description: 'Track attacker movement through the network',
          queries: [
            {
              name: 'Authentication Patterns',
              query: 'EventID == 4624 | summarize by Account, SourceIP, Computer',
              type: 'kql'
            }
          ],
          successCriteria: 'Mapped attacker path through network',
          failureActions: ['Expand to network flow data', 'Check endpoint logs']
        }
      ],
      requiredDataSources: ['Windows Security', 'Network', 'Endpoint'],
      estimatedDuration: 240
    });
  }

  // Hunt Management
  async createHunt(params: {
    name: string;
    description: string;
    hypothesis: string;
    assignee: string;
    techniques?: string[];
    templateId?: string;
  }): Promise<ThreatHunt> {
    const hunt: ThreatHunt = {
      id: uuidv4(),
      name: params.name,
      description: params.description,
      hypothesis: params.hypothesis,
      status: 'planned',
      assignee: params.assignee,
      createdAt: new Date(),
      techniques: params.techniques || [],
      dataSource: [],
      queries: [],
      findings: [],
      metrics: {
        eventsAnalyzed: 0,
        alertsGenerated: 0,
        falsePositives: 0,
        truePositives: 0
      }
    };

    // Apply template if specified
    if (params.templateId) {
      const template = this.huntTemplates.get(params.templateId);
      if (template) {
        hunt.techniques = template.techniques;
        hunt.dataSource = template.dataSource;
        hunt.queries = template.queries;
      }
    }

    // Save to database
    await this.db('threat_hunts').insert({
      id: hunt.id,
      name: hunt.name,
      description: hunt.description,
      hypothesis: hunt.hypothesis,
      status: hunt.status,
      assignee: hunt.assignee,
      created_at: hunt.createdAt,
      techniques: JSON.stringify(hunt.techniques),
      data_sources: JSON.stringify(hunt.dataSource),
      queries: JSON.stringify(hunt.queries),
      findings: JSON.stringify(hunt.findings),
      metrics: JSON.stringify(hunt.metrics)
    });

    this.activeHunts.set(hunt.id, hunt);
    this.emit('hunt-created', hunt);
    logger.info(`Created threat hunt: ${hunt.name} (${hunt.id})`);

    return hunt;
  }

  async startHunt(huntId: string): Promise<void> {
    const hunt = await this.getHunt(huntId);
    if (!hunt) {
      throw new Error(`Hunt ${huntId} not found`);
    }

    if (hunt.status !== 'planned') {
      throw new Error(`Hunt ${huntId} is not in planned status`);
    }

    hunt.status = 'active';
    hunt.startedAt = new Date();

    await this.updateHunt(hunt);
    this.emit('hunt-started', hunt);
    logger.info(`Started threat hunt: ${hunt.name} (${hunt.id})`);
  }

  async pauseHunt(huntId: string): Promise<void> {
    const hunt = await this.getHunt(huntId);
    if (!hunt) {
      throw new Error(`Hunt ${huntId} not found`);
    }

    if (hunt.status !== 'active') {
      throw new Error(`Hunt ${huntId} is not active`);
    }

    hunt.status = 'paused';
    await this.updateHunt(hunt);
    this.emit('hunt-paused', hunt);
  }

  async completeHunt(huntId: string, summary?: string): Promise<void> {
    const hunt = await this.getHunt(huntId);
    if (!hunt) {
      throw new Error(`Hunt ${huntId} not found`);
    }

    hunt.status = 'completed';
    hunt.completedAt = new Date();

    if (summary) {
      hunt.description += `\n\nSummary: ${summary}`;
    }

    await this.updateHunt(hunt);
    this.emit('hunt-completed', hunt);
    logger.info(`Completed threat hunt: ${hunt.name} (${hunt.id})`);

    // Generate report
    const report = await this.generateHuntReport(hunt);
    this.emit('hunt-report', { hunt, report });
  }

  // Query Execution
  async executeHuntQuery(
    huntId: string,
    query: HuntQuery,
    options?: {
      timeRange?: { start: Date; end: Date };
      limit?: number;
    }
  ): Promise<any[]> {
    const hunt = await this.getHunt(huntId);
    if (!hunt) {
      throw new Error(`Hunt ${huntId} not found`);
    }

    logger.info(`Executing hunt query: ${query.name} for hunt ${huntId}`);

    let results: any[] = [];

    switch (query.type) {
      case 'kql':
        // Execute KQL query through KQL engine
        // This would integrate with the KQL parser from Task 4
        results = await this.executeKQLQuery(query.query, options);
        break;

      case 'sql':
        // Execute SQL query
        results = await this.executeSQLQuery(query.query, options);
        break;

      case 'custom':
        // Execute custom query logic
        results = await this.executeCustomQuery(query, options);
        break;
    }

    // Update hunt metrics
    hunt.metrics.eventsAnalyzed += results.length;
    await this.updateHunt(hunt);

    this.emit('query-executed', { huntId, query, resultCount: results.length });
    return results;
  }

  private async executeKQLQuery(query: string, options?: any): Promise<any[]> {
    // Mock implementation - would integrate with KQL engine
    logger.debug(`Executing KQL query: ${query}`);
    return [];
  }

  private async executeSQLQuery(query: string, options?: any): Promise<any[]> {
    // Execute SQL against the database
    try {
      const results = await this.db.raw(query);
      return results.rows || results;
    } catch (error) {
      logger.error('SQL query execution failed', error);
      throw error;
    }
  }

  private async executeCustomQuery(query: HuntQuery, options?: any): Promise<any[]> {
    // Handle custom query types
    logger.debug(`Executing custom query: ${query.name}`);
    return [];
  }

  // Finding Management
  async addFinding(huntId: string, finding: Omit<HuntFinding, 'timestamp'>): Promise<void> {
    const hunt = await this.getHunt(huntId);
    if (!hunt) {
      throw new Error(`Hunt ${huntId} not found`);
    }

    const fullFinding: HuntFinding = {
      ...finding,
      timestamp: new Date()
    };

    // Save to database
    await this.db('hunt_findings').insert({
      id: uuidv4(),
      hunt_id: huntId,
      timestamp: fullFinding.timestamp,
      description: fullFinding.description,
      severity: fullFinding.severity,
      evidence: JSON.stringify(fullFinding.evidence),
      iocs: JSON.stringify(fullFinding.iocs),
      affected_entities: JSON.stringify(fullFinding.affectedEntities),
      recommendations: JSON.stringify(fullFinding.recommendations)
    });

    hunt.findings.push(fullFinding);

    // Update metrics based on finding
    if (fullFinding.severity === 'high' || fullFinding.severity === 'critical') {
      hunt.metrics.truePositives++;
    }

    // Add IOCs to database
    if (fullFinding.iocs.length > 0) {
      await this.addIOCsFromFinding(fullFinding);
    }

    await this.updateHunt(hunt);
    this.emit('finding-added', { huntId, finding: fullFinding });
  }

  private async addIOCsFromFinding(finding: HuntFinding): Promise<void> {
    // Add discovered IOCs to the IOC database
    for (const iocValue of finding.iocs) {
      // Attempt to determine IOC type
      let iocType: string;
      if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(iocValue)) {
        iocType = 'ip';
      } else if (/^[a-fA-F0-9]{32}$/.test(iocValue)) {
        iocType = 'hash-md5';
      } else if (/^[a-fA-F0-9]{64}$/.test(iocValue)) {
        iocType = 'hash-sha256';
      } else {
        iocType = 'domain'; // Default assumption
      }

      await this.iocDatabase.addIOC({
        id: uuidv4(),
        type: iocType as any,
        value: iocValue,
        source: 'threat-hunt',
        confidence: 80,
        severity: finding.severity as any,
        tags: ['threat-hunt', `severity:${finding.severity}`],
        firstSeen: finding.timestamp,
        lastSeen: finding.timestamp,
        metadata: {
          huntFinding: finding.description,
          discoveredBy: 'threat-hunting'
        },
        relatedIOCs: [],
        tlp: 'amber',
        active: true
      });
    }
  }

  // Analytics and Anomaly Detection
  async analyzeWithUEBA(huntId: string, entities: Array<{
    type: 'user' | 'host';
    identifier: string;
  }>): Promise<any[]> {
    const anomalies = [];

    for (const entity of entities) {
      if (entity.type === 'user') {
        const userAnomalies = await this.uebaEngine.getRecentAnomalies(
          entity.identifier,
          'user',
          50
        );
        anomalies.push(...userAnomalies);

        // Check peer group deviations
        const peerAnomalies = await this.uebaEngine.detectPeerGroupAnomalies(
          entity.identifier
        );
        anomalies.push(...peerAnomalies);
      }
    }

    return anomalies;
  }

  async analyzeWithSigma(huntId: string, events: any[]): Promise<DetectionAlert[]> {
    const alerts: DetectionAlert[] = [];

    for (const event of events) {
      const eventAlerts = await this.sigmaEngine.evaluateEvent(event);
      alerts.push(...eventAlerts);
    }

    // Update hunt metrics
    const hunt = await this.getHunt(huntId);
    if (hunt) {
      hunt.metrics.alertsGenerated += alerts.length;
      await this.updateHunt(hunt);
    }

    return alerts;
  }

  // Automated Hunting
  async runAutomatedHunt(templateId: string, options?: {
    timeRange?: { start: Date; end: Date };
    assignee?: string;
  }): Promise<ThreatHunt> {
    const template = this.huntTemplates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Create hunt from template
    const hunt = await this.createHunt({
      name: `Automated: ${template.name}`,
      description: template.description,
      hypothesis: `Automated hunt based on template: ${template.name}`,
      assignee: options?.assignee || 'system',
      techniques: template.techniques,
      templateId
    });

    // Start the hunt
    await this.startHunt(hunt.id);

    // Execute all queries
    const allFindings: HuntFinding[] = [];
    
    for (const query of template.queries) {
      try {
        const results = await this.executeHuntQuery(hunt.id, query, options);
        
        if (results.length > 0) {
          // Analyze results for anomalies
          const anomalies = await this.analyzeResults(results, template);
          
          if (anomalies.length > 0) {
            const finding: Omit<HuntFinding, 'timestamp'> = {
              description: `Automated detection: ${query.description}`,
              severity: this.calculateFindingSeverity(anomalies),
              evidence: anomalies.map(a => JSON.stringify(a)),
              iocs: this.extractIOCsFromResults(results),
              affectedEntities: this.extractEntitiesFromResults(results),
              recommendations: this.generateRecommendations(template, anomalies)
            };
            
            await this.addFinding(hunt.id, finding);
            allFindings.push({ ...finding, timestamp: new Date() });
          }
        }
      } catch (error) {
        logger.error(`Failed to execute query ${query.name}`, error);
      }
    }

    // Complete the hunt
    await this.completeHunt(hunt.id, 
      `Automated hunt completed. Found ${allFindings.length} findings.`
    );

    return hunt;
  }

  private async analyzeResults(results: any[], template: HuntTemplate): Promise<any[]> {
    // Perform automated analysis based on template category
    const anomalies = [];

    switch (template.category) {
      case 'lateral-movement':
        // Look for unusual authentication patterns
        anomalies.push(...this.detectLateralMovement(results));
        break;

      case 'persistence':
        // Look for persistence mechanisms
        anomalies.push(...this.detectPersistence(results));
        break;

      case 'exfiltration':
        // Look for data exfiltration patterns
        anomalies.push(...this.detectExfiltration(results));
        break;
    }

    return anomalies;
  }

  private detectLateralMovement(results: any[]): any[] {
    const anomalies = [];
    
    // Group by source and look for multiple targets
    const sourceMap = new Map<string, Set<string>>();
    
    for (const event of results) {
      const source = event.SourceComputer || event.SourceIP;
      const target = event.TargetComputer || event.DestinationIP;
      
      if (source && target) {
        if (!sourceMap.has(source)) {
          sourceMap.set(source, new Set());
        }
        sourceMap.get(source)!.add(target);
      }
    }

    // Flag sources connecting to many targets
    for (const [source, targets] of sourceMap) {
      if (targets.size > 5) {
        anomalies.push({
          type: 'lateral-movement',
          source,
          targetCount: targets.size,
          targets: Array.from(targets)
        });
      }
    }

    return anomalies;
  }

  private detectPersistence(results: any[]): any[] {
    const anomalies = [];
    
    for (const event of results) {
      // Check for suspicious scheduled tasks
      if (event.EventID === 4698 && event.TaskName && 
          !event.TaskName.includes('Microsoft\\Windows')) {
        anomalies.push({
          type: 'persistence-scheduled-task',
          taskName: event.TaskName,
          creator: event.SubjectUserName
        });
      }
      
      // Check for suspicious services
      if (event.EventID === 7045 && event.ServiceName) {
        anomalies.push({
          type: 'persistence-service',
          serviceName: event.ServiceName,
          imagePath: event.ImagePath
        });
      }
    }

    return anomalies;
  }

  private detectExfiltration(results: any[]): any[] {
    const anomalies = [];
    
    // Look for large data transfers
    for (const event of results) {
      if (event.BytesSent && event.BytesSent > 100000000) { // 100MB
        anomalies.push({
          type: 'large-data-transfer',
          bytes: event.BytesSent,
          destination: event.DestinationIP || event.DestinationHostname,
          source: event.SourceIP || event.SourceComputer
        });
      }
    }

    return anomalies;
  }

  private calculateFindingSeverity(anomalies: any[]): 'low' | 'medium' | 'high' | 'critical' {
    if (anomalies.length === 0) return 'low';
    if (anomalies.length === 1) return 'medium';
    if (anomalies.length < 5) return 'high';
    return 'critical';
  }

  private extractIOCsFromResults(results: any[]): string[] {
    const iocs = new Set<string>();
    
    for (const result of results) {
      // Extract IPs
      if (result.SourceIP && !this.isInternalIP(result.SourceIP)) {
        iocs.add(result.SourceIP);
      }
      if (result.DestinationIP && !this.isInternalIP(result.DestinationIP)) {
        iocs.add(result.DestinationIP);
      }
      
      // Extract domains
      if (result.DestinationHostname) {
        iocs.add(result.DestinationHostname);
      }
      
      // Extract hashes
      if (result.SHA256) {
        iocs.add(result.SHA256);
      }
    }

    return Array.from(iocs);
  }

  private extractEntitiesFromResults(results: any[]): Array<{
    type: 'user' | 'host' | 'process' | 'file';
    identifier: string;
  }> {
    const entities = new Map<string, { type: any; identifier: string }>();
    
    for (const result of results) {
      if (result.SubjectUserName) {
        entities.set(`user:${result.SubjectUserName}`, {
          type: 'user',
          identifier: result.SubjectUserName
        });
      }
      
      if (result.ComputerName) {
        entities.set(`host:${result.ComputerName}`, {
          type: 'host',
          identifier: result.ComputerName
        });
      }
      
      if (result.ProcessName) {
        entities.set(`process:${result.ProcessName}`, {
          type: 'process',
          identifier: result.ProcessName
        });
      }
    }

    return Array.from(entities.values());
  }

  private generateRecommendations(template: HuntTemplate, anomalies: any[]): string[] {
    const recommendations: string[] = [];

    // Template-specific recommendations
    switch (template.category) {
      case 'lateral-movement':
        recommendations.push('Review authentication logs for affected systems');
        recommendations.push('Check for privilege escalation attempts');
        recommendations.push('Verify legitimacy of remote access');
        break;

      case 'persistence':
        recommendations.push('Review all scheduled tasks and services');
        recommendations.push('Check registry run keys');
        recommendations.push('Scan for malware on affected systems');
        break;

      case 'exfiltration':
        recommendations.push('Review network traffic to identified destinations');
        recommendations.push('Check for staging directories');
        recommendations.push('Implement DLP controls');
        break;
    }

    // Anomaly count-based recommendations
    if (anomalies.length > 10) {
      recommendations.push('Consider this a high-priority incident');
      recommendations.push('Engage incident response team immediately');
    }

    return recommendations;
  }

  private isInternalIP(ip: string): boolean {
    return ip.startsWith('10.') || 
           ip.startsWith('172.16.') || 
           ip.startsWith('192.168.') ||
           ip.startsWith('127.');
  }

  // Query Methods
  async getHunt(huntId: string): Promise<ThreatHunt | null> {
    // Check cache first
    if (this.activeHunts.has(huntId)) {
      return this.activeHunts.get(huntId)!;
    }

    // Load from database
    const row = await this.db('threat_hunts').where('id', huntId).first();
    if (!row) return null;

    const hunt: ThreatHunt = {
      id: row.id,
      name: row.name,
      description: row.description,
      hypothesis: row.hypothesis,
      status: row.status,
      assignee: row.assignee,
      createdAt: row.created_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      techniques: JSON.parse(row.techniques),
      dataSource: JSON.parse(row.data_sources),
      queries: JSON.parse(row.queries),
      findings: JSON.parse(row.findings),
      metrics: JSON.parse(row.metrics)
    };

    this.activeHunts.set(huntId, hunt);
    return hunt;
  }

  async getHuntsByStatus(status: string): Promise<ThreatHunt[]> {
    const rows = await this.db('threat_hunts').where('status', status);
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      hypothesis: row.hypothesis,
      status: row.status,
      assignee: row.assignee,
      createdAt: row.created_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      techniques: JSON.parse(row.techniques),
      dataSource: JSON.parse(row.data_sources),
      queries: JSON.parse(row.queries),
      findings: JSON.parse(row.findings),
      metrics: JSON.parse(row.metrics)
    }));
  }

  async getHuntsByAssignee(assignee: string): Promise<ThreatHunt[]> {
    const rows = await this.db('threat_hunts').where('assignee', assignee);
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      hypothesis: row.hypothesis,
      status: row.status,
      assignee: row.assignee,
      createdAt: row.created_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      techniques: JSON.parse(row.techniques),
      dataSource: JSON.parse(row.data_sources),
      queries: JSON.parse(row.queries),
      findings: JSON.parse(row.findings),
      metrics: JSON.parse(row.metrics)
    }));
  }

  // Update Methods
  private async updateHunt(hunt: ThreatHunt): Promise<void> {
    await this.db('threat_hunts')
      .where('id', hunt.id)
      .update({
        name: hunt.name,
        description: hunt.description,
        hypothesis: hunt.hypothesis,
        status: hunt.status,
        assignee: hunt.assignee,
        started_at: hunt.startedAt,
        completed_at: hunt.completedAt,
        techniques: JSON.stringify(hunt.techniques),
        data_sources: JSON.stringify(hunt.dataSource),
        queries: JSON.stringify(hunt.queries),
        findings: JSON.stringify(hunt.findings),
        metrics: JSON.stringify(hunt.metrics),
        updated_at: new Date()
      });

    this.activeHunts.set(hunt.id, hunt);
  }

  private async loadSavedHunts(): Promise<void> {
    const activeHunts = await this.getHuntsByStatus('active');
    for (const hunt of activeHunts) {
      this.activeHunts.set(hunt.id, hunt);
    }
    logger.info(`Loaded ${activeHunts.length} active hunts`);
  }

  // Reporting
  async generateHuntReport(hunt: ThreatHunt): Promise<any> {
    const findings = await this.db('hunt_findings')
      .where('hunt_id', hunt.id)
      .orderBy('timestamp', 'desc');

    const report = {
      hunt: {
        id: hunt.id,
        name: hunt.name,
        description: hunt.description,
        hypothesis: hunt.hypothesis,
        status: hunt.status,
        duration: hunt.completedAt && hunt.startedAt ? 
          hunt.completedAt.getTime() - hunt.startedAt.getTime() : null,
        assignee: hunt.assignee
      },
      summary: {
        totalFindings: findings.length,
        criticalFindings: findings.filter(f => f.severity === 'critical').length,
        highFindings: findings.filter(f => f.severity === 'high').length,
        mediumFindings: findings.filter(f => f.severity === 'medium').length,
        lowFindings: findings.filter(f => f.severity === 'low').length,
        uniqueIOCs: new Set(findings.flatMap(f => JSON.parse(f.iocs))).size,
        affectedEntities: new Set(findings.flatMap(f => 
          JSON.parse(f.affected_entities).map((e: any) => e.identifier)
        )).size
      },
      metrics: hunt.metrics,
      techniques: hunt.techniques,
      findings: findings.map(f => ({
        timestamp: f.timestamp,
        description: f.description,
        severity: f.severity,
        evidence: JSON.parse(f.evidence),
        iocs: JSON.parse(f.iocs),
        affectedEntities: JSON.parse(f.affected_entities),
        recommendations: JSON.parse(f.recommendations)
      })),
      recommendations: this.generateOverallRecommendations(hunt, findings),
      nextSteps: this.suggestNextSteps(hunt, findings)
    };

    return report;
  }

  private generateOverallRecommendations(hunt: ThreatHunt, findings: any[]): string[] {
    const recommendations = new Set<string>();

    // Aggregate all recommendations from findings
    for (const finding of findings) {
      const recs = JSON.parse(finding.recommendations);
      recs.forEach((r: string) => recommendations.add(r));
    }

    // Add hunt-level recommendations
    if (findings.some(f => f.severity === 'critical')) {
      recommendations.add('Initiate full incident response procedures');
      recommendations.add('Isolate critically affected systems');
    }

    if (hunt.metrics.truePositives > 10) {
      recommendations.add('Consider this a confirmed security incident');
      recommendations.add('Preserve evidence for forensic analysis');
    }

    return Array.from(recommendations);
  }

  private suggestNextSteps(hunt: ThreatHunt, findings: any[]): string[] {
    const nextSteps: string[] = [];

    // Based on findings
    if (findings.length > 0) {
      nextSteps.push('Create detection rules based on discovered patterns');
      nextSteps.push('Add discovered IOCs to threat intelligence platform');
      nextSteps.push('Schedule follow-up hunts for similar activity');
    }

    // Based on techniques
    if (hunt.techniques.includes('T1053')) { // Scheduled Task
      nextSteps.push('Review all scheduled tasks across the environment');
    }

    if (hunt.techniques.includes('T1021')) { // Remote Services
      nextSteps.push('Audit remote access permissions and usage');
    }

    return nextSteps;
  }

  // Template Management
  getTemplates(): HuntTemplate[] {
    return Array.from(this.huntTemplates.values());
  }

  getTemplate(templateId: string): HuntTemplate | undefined {
    return this.huntTemplates.get(templateId);
  }

  getPlaybooks(): HuntPlaybook[] {
    return Array.from(this.huntPlaybooks.values());
  }

  getPlaybook(playbookId: string): HuntPlaybook | undefined {
    return this.huntPlaybooks.get(playbookId);
  }
}