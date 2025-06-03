import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import knex, { Knex } from 'knex';
import { logger } from '../utils/logger';
import {
  TrainingScenario,
  TrainingScenarioSchema,
  LabEnvironment,
  LabHint,
  DatabaseConfig,
  SearchFilters,
  Pagination,
  Difficulty,
  SkillLevel
} from '../types/educational.types';

interface ScenarioInstance {
  id: string;
  scenarioId: string;
  studentId: string;
  status: 'provisioning' | 'running' | 'paused' | 'completed' | 'failed' | 'expired';
  startedAt: Date;
  completedAt?: Date;
  expiresAt: Date;
  timeRemaining: number; // seconds
  progress: {
    objectivesCompleted: number;
    totalObjectives: number;
    score: number;
    hintsUsed: number;
    flags: string[];
    artifacts: string[];
    timeline: {
      timestamp: Date;
      action: string;
      details: any;
    }[];
  };
  environment: {
    containersInfo: any[];
    accessInfo: any;
    networkTopology: any;
  };
  metadata: Record<string, any>;
}

interface ScenarioSearchResult {
  scenarios: TrainingScenario[];
  total: number;
  page: number;
  totalPages: number;
}

interface ObjectiveSubmission {
  objectiveId: string;
  studentId: string;
  instanceId: string;
  answer: string;
  evidence: string[];
  submittedAt: Date;
  validationResult?: {
    correct: boolean;
    score: number;
    feedback: string;
    partialCredit: number;
  };
}

interface AttackSimulation {
  id: string;
  name: string;
  description: string;
  category: 'malware' | 'phishing' | 'network-intrusion' | 'data-breach' | 'insider-threat' | 'ddos';
  attackVector: string[];
  targetSystems: string[];
  timeline: {
    phase: string;
    timestamp: string;
    actions: string[];
    indicators: string[];
    evidence: string[];
  }[];
  artifacts: {
    id: string;
    name: string;
    type: 'log' | 'network-capture' | 'memory-dump' | 'file' | 'email' | 'alert';
    content: any;
    timestamp: string;
    source: string;
  }[];
  iocs: { // Indicators of Compromise
    type: 'ip' | 'domain' | 'hash' | 'email' | 'url' | 'filename';
    value: string;
    description: string;
    confidence: 'low' | 'medium' | 'high';
  }[];
  mitreTactics: string[]; // MITRE ATT&CK tactics
  mitreTooling: string[]; // MITRE ATT&CK techniques
  createdBy: string;
  createdAt: Date;
  metadata: Record<string, any>;
}

export class TrainingScenarioService extends EventEmitter {
  private db: Knex;
  private activeInstances: Map<string, ScenarioInstance> = new Map();

  constructor(config: { database: DatabaseConfig }) {
    super();
    this.db = knex({
      client: config.database.type,
      connection: config.database.connection,
      useNullAsDefault: true
    });
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Training Scenario Service');
    await this.createTables();
    await this.seedDefaultScenarios();
    await this.loadActiveInstances();
    this.startCleanupWorker();
    logger.info('Training Scenario Service initialized successfully');
  }

  private async createTables(): Promise<void> {
    // Training scenarios table
    if (!(await this.db.schema.hasTable('training_scenarios'))) {
      await this.db.schema.createTable('training_scenarios', (table) => {
        table.string('id').primary();
        table.string('title').notNullable();
        table.text('description');
        table.string('category').notNullable();
        table.string('difficulty').notNullable();
        table.string('skill_level').notNullable();
        table.json('scenario'); // background, timeline, environment, objectives, artifacts
        table.integer('estimated_time').notNullable(); // minutes
        table.integer('max_score').notNullable();
        table.integer('passing_score').notNullable();
        table.json('hints');
        table.json('solution');
        table.json('prerequisites');
        table.json('tags');
        table.string('created_by').notNullable();
        table.dateTime('created_at').notNullable();
        table.dateTime('updated_at').notNullable();
        table.json('metadata');
        
        table.index(['category', 'difficulty']);
        table.index(['skill_level']);
        table.index(['created_at']);
      });
    }

    // Scenario instances table
    if (!(await this.db.schema.hasTable('scenario_instances'))) {
      await this.db.schema.createTable('scenario_instances', (table) => {
        table.string('id').primary();
        table.string('scenario_id').notNullable();
        table.string('student_id').notNullable();
        table.string('status').notNullable();
        table.dateTime('started_at').notNullable();
        table.dateTime('completed_at');
        table.dateTime('expires_at').notNullable();
        table.integer('time_remaining'); // seconds
        table.json('progress');
        table.json('environment');
        table.json('metadata');
        
        table.foreign('scenario_id').references('training_scenarios.id').onDelete('CASCADE');
        table.index(['student_id']);
        table.index(['status']);
        table.index(['expires_at']);
      });
    }

    // Objective submissions table
    if (!(await this.db.schema.hasTable('objective_submissions'))) {
      await this.db.schema.createTable('objective_submissions', (table) => {
        table.string('id').primary();
        table.string('objective_id').notNullable();
        table.string('student_id').notNullable();
        table.string('instance_id').notNullable();
        table.text('answer');
        table.json('evidence'); // files, screenshots, logs
        table.dateTime('submitted_at').notNullable();
        table.json('validation_result');
        table.boolean('is_correct').defaultTo(false);
        table.integer('score').defaultTo(0);
        table.integer('attempt_number').defaultTo(1);
        
        table.foreign('instance_id').references('scenario_instances.id').onDelete('CASCADE');
        table.index(['student_id', 'objective_id']);
        table.index(['instance_id']);
      });
    }

    // Attack simulations table
    if (!(await this.db.schema.hasTable('attack_simulations'))) {
      await this.db.schema.createTable('attack_simulations', (table) => {
        table.string('id').primary();
        table.string('name').notNullable();
        table.text('description');
        table.string('category').notNullable();
        table.json('attack_vector');
        table.json('target_systems');
        table.json('timeline');
        table.json('artifacts');
        table.json('iocs'); // Indicators of Compromise
        table.json('mitre_tactics');
        table.json('mitre_tooling');
        table.string('created_by').notNullable();
        table.dateTime('created_at').notNullable();
        table.json('metadata');
        
        table.index(['category']);
        table.index(['created_at']);
      });
    }

    // Scenario analytics table
    if (!(await this.db.schema.hasTable('scenario_analytics'))) {
      await this.db.schema.createTable('scenario_analytics', (table) => {
        table.string('id').primary();
        table.string('scenario_id').notNullable();
        table.string('student_id').notNullable();
        table.string('instance_id').notNullable();
        table.string('event_type').notNullable(); // 'start', 'objective_attempt', 'hint_used', 'complete'
        table.json('event_data');
        table.dateTime('timestamp').notNullable();
        
        table.foreign('scenario_id').references('training_scenarios.id').onDelete('CASCADE');
        table.foreign('instance_id').references('scenario_instances.id').onDelete('CASCADE');
        table.index(['scenario_id', 'timestamp']);
        table.index(['student_id', 'timestamp']);
      });
    }

    // Scenario templates table (for creating new scenarios)
    if (!(await this.db.schema.hasTable('scenario_templates'))) {
      await this.db.schema.createTable('scenario_templates', (table) => {
        table.string('id').primary();
        table.string('name').notNullable();
        table.text('description');
        table.string('category').notNullable();
        table.json('template_config');
        table.json('default_objectives');
        table.json('default_artifacts');
        table.json('environment_template');
        table.boolean('active').defaultTo(true);
        table.string('created_by').notNullable();
        table.dateTime('created_at').notNullable();
        table.json('metadata');
        
        table.index(['category']);
        table.index(['active']);
      });
    }
  }

  private async seedDefaultScenarios(): Promise<void> {
    const count = await this.db('training_scenarios').count('* as count').first();
    if (count?.count > 0) return;

    const defaultScenarios = [
      {
        id: uuidv4(),
        title: 'Advanced Persistent Threat (APT) Investigation',
        description: 'Investigate a sophisticated APT attack on a corporate network',
        category: 'incident-response',
        difficulty: 'hard',
        skill_level: 'advanced',
        scenario: JSON.stringify({
          background: 'CyberCorp has detected unusual network activity indicating a possible advanced persistent threat. As the lead incident responder, you must investigate the breach, identify the attack vector, and assess the damage.',
          timeline: [
            {
              timestamp: '2024-01-15T08:30:00Z',
              event: 'Unusual outbound network traffic detected',
              source: 'Network monitoring system',
              evidence: ['network-logs-001.log', 'firewall-alerts-001.json']
            },
            {
              timestamp: '2024-01-15T09:15:00Z',
              event: 'Suspicious PowerShell execution on workstation',
              source: 'EDR system',
              evidence: ['powershell-logs-001.log', 'process-tree-001.json']
            },
            {
              timestamp: '2024-01-15T10:45:00Z',
              event: 'Lateral movement detected',
              source: 'Domain controller logs',
              evidence: ['dc-security-logs-001.log', 'kerberos-logs-001.log']
            }
          ],
          environment: {
            type: 'simulated',
            config: {
              containers: [
                {
                  name: 'victim-workstation',
                  image: 'cybercorp/workstation:latest',
                  ports: [3389, 445],
                  environment: { INFECTED: 'true' }
                },
                {
                  name: 'domain-controller',
                  image: 'cybercorp/dc:latest',
                  ports: [389, 88],
                  environment: { COMPROMISED: 'partial' }
                },
                {
                  name: 'file-server',
                  image: 'cybercorp/fileserver:latest',
                  ports: [445],
                  environment: { STATUS: 'clean' }
                }
              ],
              network: {
                isolated: true,
                allowInternet: false
              },
              timeout: 10800 // 3 hours
            }
          },
          objectives: [
            {
              id: 'identify-initial-vector',
              description: 'Identify the initial attack vector used by the threat actor',
              points: 25,
              required: true
            },
            {
              id: 'map-lateral-movement',
              description: 'Map the lateral movement path through the network',
              points: 30,
              required: true
            },
            {
              id: 'identify-persistence',
              description: 'Identify persistence mechanisms established by the attacker',
              points: 25,
              required: true
            },
            {
              id: 'assess-data-exfiltration',
              description: 'Determine what data was accessed or exfiltrated',
              points: 20,
              required: false
            }
          ],
          artifacts: [
            {
              id: 'network-logs',
              name: 'Network Traffic Logs',
              type: 'network-capture',
              path: '/evidence/network-logs.pcap',
              description: 'Network packet capture from the incident timeframe'
            },
            {
              id: 'system-logs',
              name: 'Windows Event Logs',
              type: 'log',
              path: '/evidence/windows-events.evtx',
              description: 'Windows security and system event logs'
            },
            {
              id: 'memory-dump',
              name: 'Memory Dump',
              type: 'memory-dump',
              path: '/evidence/memory.dmp',
              description: 'Memory dump from compromised workstation'
            }
          ]
        }),
        estimated_time: 180, // 3 hours
        max_score: 100,
        passing_score: 70,
        hints: JSON.stringify([
          {
            id: 'hint-1',
            order: 1,
            title: 'Start with Network Analysis',
            content: 'Begin by analyzing the network traffic logs to identify suspicious connections and data flows.',
            pointDeduction: 5
          },
          {
            id: 'hint-2',
            order: 2,
            title: 'Check for Encoded Commands',
            content: 'Look for base64 encoded PowerShell commands that might indicate malicious activity.',
            pointDeduction: 5
          },
          {
            id: 'hint-3',
            order: 3,
            title: 'Timeline Analysis',
            content: 'Create a timeline of events to understand the attack progression and identify key decision points.',
            pointDeduction: 10
          }
        ]),
        solution: JSON.stringify({
          summary: 'The APT used a spear-phishing email to gain initial access, leveraged PowerShell for persistence, and moved laterally using stolen credentials.',
          steps: [
            'Analyze spear-phishing email with malicious attachment',
            'Identify PowerShell-based persistence mechanism',
            'Track lateral movement using Kerberos ticket analysis',
            'Assess data exfiltration through network analysis'
          ],
          explanation: 'This scenario demonstrates a typical APT attack pattern with multiple stages and sophisticated techniques.',
          references: [
            'MITRE ATT&CK Framework',
            'SANS Incident Response Methodology',
            'NIST Cybersecurity Framework'
          ]
        }),
        prerequisites: JSON.stringify(['incident-response-basics', 'network-analysis', 'windows-forensics']),
        tags: JSON.stringify(['APT', 'incident-response', 'forensics', 'lateral-movement']),
        created_by: 'system',
        created_at: new Date(),
        updated_at: new Date(),
        metadata: JSON.stringify({})
      },
      {
        id: uuidv4(),
        title: 'Ransomware Attack Response',
        description: 'Respond to and analyze a ransomware attack affecting critical business systems',
        category: 'incident-response',
        difficulty: 'medium',
        skill_level: 'intermediate',
        scenario: JSON.stringify({
          background: 'TechCorp has been hit by ransomware. Multiple systems are encrypted, and the attackers are demanding payment. You need to assess the damage, identify the attack vector, and develop a recovery plan.',
          timeline: [
            {
              timestamp: '2024-01-16T14:30:00Z',
              event: 'First reports of encrypted files',
              source: 'Help desk tickets',
              evidence: ['helpdesk-tickets-001.csv', 'encrypted-files-001.list']
            },
            {
              timestamp: '2024-01-16T14:45:00Z',
              event: 'Ransom note discovered',
              source: 'User workstation',
              evidence: ['ransom-note.txt', 'desktop-screenshot.png']
            },
            {
              timestamp: '2024-01-16T15:00:00Z',
              event: 'File server encryption detected',
              source: 'Server monitoring',
              evidence: ['server-logs-001.log', 'file-activity-001.csv']
            }
          ],
          environment: {
            type: 'simulated',
            config: {
              containers: [
                {
                  name: 'infected-workstation',
                  image: 'techcorp/workstation-infected:latest',
                  ports: [3389],
                  environment: { RANSOMWARE_ACTIVE: 'true' }
                },
                {
                  name: 'file-server',
                  image: 'techcorp/fileserver-encrypted:latest',
                  ports: [445, 139],
                  environment: { ENCRYPTION_STATUS: 'partial' }
                }
              ],
              timeout: 7200 // 2 hours
            }
          },
          objectives: [
            {
              id: 'identify-ransomware',
              description: 'Identify the specific ransomware family',
              points: 20,
              required: true
            },
            {
              id: 'find-patient-zero',
              description: 'Identify the initial infection vector and patient zero',
              points: 25,
              required: true
            },
            {
              id: 'assess-spread',
              description: 'Determine the scope and spread of the infection',
              points: 25,
              required: true
            },
            {
              id: 'recovery-plan',
              description: 'Develop a comprehensive recovery plan',
              points: 30,
              required: true
            }
          ],
          artifacts: [
            {
              id: 'ransom-note',
              name: 'Ransom Note',
              type: 'file',
              path: '/evidence/ransom-note.txt',
              description: 'The ransom note left by the attackers'
            },
            {
              id: 'encrypted-samples',
              name: 'Encrypted File Samples',
              type: 'file',
              path: '/evidence/encrypted-samples/',
              description: 'Sample encrypted files for analysis'
            },
            {
              id: 'network-traffic',
              name: 'Network Traffic',
              type: 'network-capture',
              path: '/evidence/network-traffic.pcap',
              description: 'Network traffic during the incident'
            }
          ]
        }),
        estimated_time: 120, // 2 hours
        max_score: 100,
        passing_score: 75,
        hints: JSON.stringify([
          {
            id: 'hint-1',
            order: 1,
            title: 'Analyze the Ransom Note',
            content: 'Start by carefully analyzing the ransom note for clues about the ransomware family.',
            pointDeduction: 5
          },
          {
            id: 'hint-2',
            order: 2,
            title: 'Check Email Logs',
            content: 'Look at email logs around the time of infection to identify potential phishing vectors.',
            pointDeduction: 5
          }
        ]),
        solution: JSON.stringify({
          summary: 'The ransomware was delivered via phishing email and spread through network shares.',
          steps: [
            'Identify ransomware family through note analysis',
            'Trace infection back to phishing email',
            'Map network spread through file share analysis',
            'Create prioritized recovery plan'
          ],
          explanation: 'This scenario teaches systematic ransomware response and recovery planning.',
          references: ['CISA Ransomware Guide', 'NIST Incident Response Guide']
        }),
        prerequisites: JSON.stringify(['malware-analysis-basics', 'incident-response-fundamentals']),
        tags: JSON.stringify(['ransomware', 'incident-response', 'malware', 'recovery']),
        created_by: 'system',
        created_at: new Date(),
        updated_at: new Date(),
        metadata: JSON.stringify({})
      },
      {
        id: uuidv4(),
        title: 'Insider Threat Investigation',
        description: 'Investigate suspicious activity by a privileged user with access to sensitive data',
        category: 'forensics',
        difficulty: 'medium',
        skill_level: 'intermediate',
        scenario: JSON.stringify({
          background: 'DataCorp suspects that a database administrator has been accessing and potentially exfiltrating sensitive customer data. You must investigate the user\'s activities and determine if any data breach has occurred.',
          timeline: [
            {
              timestamp: '2024-01-17T18:30:00Z',
              event: 'Unusual after-hours database access',
              source: 'Database audit logs',
              evidence: ['db-audit-logs-001.log', 'after-hours-access.csv']
            },
            {
              timestamp: '2024-01-17T19:15:00Z',
              event: 'Large data export operation',
              source: 'Database monitoring',
              evidence: ['export-logs-001.log', 'query-history-001.sql']
            },
            {
              timestamp: '2024-01-17T20:00:00Z',
              event: 'USB device activity detected',
              source: 'Endpoint monitoring',
              evidence: ['usb-logs-001.log', 'file-transfer-001.csv']
            }
          ],
          environment: {
            type: 'simulated',
            config: {
              containers: [
                {
                  name: 'database-server',
                  image: 'datacorp/database:latest',
                  ports: [1433, 5432],
                  environment: { AUDIT_ENABLED: 'true' }
                },
                {
                  name: 'admin-workstation',
                  image: 'datacorp/admin-ws:latest',
                  ports: [3389],
                  environment: { USER_ACTIVITY: 'suspicious' }
                }
              ],
              timeout: 5400 // 1.5 hours
            }
          },
          objectives: [
            {
              id: 'verify-unauthorized-access',
              description: 'Verify if unauthorized data access occurred',
              points: 25,
              required: true
            },
            {
              id: 'quantify-data-exposure',
              description: 'Determine the volume and type of data accessed',
              points: 30,
              required: true
            },
            {
              id: 'trace-exfiltration',
              description: 'Trace potential data exfiltration methods',
              points: 25,
              required: true
            },
            {
              id: 'assess-impact',
              description: 'Assess the business and regulatory impact',
              points: 20,
              required: false
            }
          ],
          artifacts: [
            {
              id: 'database-logs',
              name: 'Database Audit Logs',
              type: 'log',
              path: '/evidence/db-audit.log',
              description: 'Comprehensive database access and query logs'
            },
            {
              id: 'user-activity',
              name: 'User Activity Logs',
              type: 'log',
              path: '/evidence/user-activity.log',
              description: 'Detailed user session and activity logs'
            },
            {
              id: 'network-flows',
              name: 'Network Flow Data',
              type: 'network-capture',
              path: '/evidence/network-flows.pcap',
              description: 'Network traffic analysis data'
            }
          ]
        }),
        estimated_time: 90, // 1.5 hours
        max_score: 100,
        passing_score: 70,
        hints: JSON.stringify([
          {
            id: 'hint-1',
            order: 1,
            title: 'Start with Timeline Analysis',
            content: 'Create a timeline of the user\'s activities to identify patterns and anomalies.',
            pointDeduction: 5
          },
          {
            id: 'hint-2',
            order: 2,
            title: 'Check Data Access Patterns',
            content: 'Compare recent data access patterns with historical baselines.',
            pointDeduction: 10
          }
        ]),
        solution: JSON.stringify({
          summary: 'The investigation reveals unauthorized access to customer data with evidence of exfiltration.',
          steps: [
            'Analyze database audit logs for unusual queries',
            'Correlate access times with normal business hours',
            'Identify exfiltration through USB and network analysis',
            'Quantify data exposure and assess regulatory impact'
          ],
          explanation: 'This scenario demonstrates insider threat detection and investigation techniques.',
          references: ['CERT Insider Threat Guide', 'Data Breach Response Playbook']
        }),
        prerequisites: JSON.stringify(['database-forensics', 'user-behavior-analysis']),
        tags: JSON.stringify(['insider-threat', 'data-breach', 'forensics', 'investigation']),
        created_by: 'system',
        created_at: new Date(),
        updated_at: new Date(),
        metadata: JSON.stringify({})
      }
    ];

    await this.db('training_scenarios').insert(defaultScenarios);
    logger.info(`Seeded ${defaultScenarios.length} default training scenarios`);
  }

  private async loadActiveInstances(): Promise<void> {
    const instances = await this.db('scenario_instances')
      .whereIn('status', ['provisioning', 'running', 'paused']);

    for (const row of instances) {
      const instance: ScenarioInstance = {
        id: row.id,
        scenarioId: row.scenario_id,
        studentId: row.student_id,
        status: row.status,
        startedAt: new Date(row.started_at),
        completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
        expiresAt: new Date(row.expires_at),
        timeRemaining: row.time_remaining || 0,
        progress: JSON.parse(row.progress || '{}'),
        environment: JSON.parse(row.environment || '{}'),
        metadata: JSON.parse(row.metadata || '{}')
      };

      this.activeInstances.set(instance.id, instance);
    }

    logger.info(`Loaded ${this.activeInstances.size} active scenario instances`);
  }

  private startCleanupWorker(): void {
    // Check for expired instances every 10 minutes
    setInterval(async () => {
      await this.cleanupExpiredInstances();
    }, 10 * 60 * 1000);

    logger.info('Training scenario cleanup worker started');
  }

  // Scenario Management
  async createTrainingScenario(scenarioData: Omit<TrainingScenario, 'id' | 'createdAt' | 'updatedAt'>): Promise<TrainingScenario> {
    const now = new Date();
    const newScenario: TrainingScenario = {
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
      ...scenarioData
    };

    const validatedScenario = TrainingScenarioSchema.parse(newScenario);

    await this.db('training_scenarios').insert({
      id: validatedScenario.id,
      title: validatedScenario.title,
      description: validatedScenario.description,
      category: validatedScenario.category,
      difficulty: validatedScenario.difficulty,
      skill_level: validatedScenario.skillLevel,
      scenario: JSON.stringify(validatedScenario.scenario),
      estimated_time: validatedScenario.estimatedTime,
      max_score: validatedScenario.maxScore,
      passing_score: validatedScenario.passingScore,
      hints: JSON.stringify(validatedScenario.hints),
      solution: JSON.stringify(validatedScenario.solution),
      prerequisites: JSON.stringify(validatedScenario.prerequisites),
      tags: JSON.stringify(validatedScenario.tags),
      created_by: validatedScenario.createdBy,
      created_at: validatedScenario.createdAt,
      updated_at: validatedScenario.updatedAt,
      metadata: JSON.stringify(validatedScenario.metadata)
    });

    this.emit('training-scenario-created', { scenarioId: validatedScenario.id, scenario: validatedScenario });
    logger.info(`Created training scenario: ${validatedScenario.title}`);

    return validatedScenario;
  }

  async getTrainingScenario(scenarioId: string): Promise<TrainingScenario | null> {
    const row = await this.db('training_scenarios').where('id', scenarioId).first();
    if (!row) return null;

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      difficulty: row.difficulty,
      skillLevel: row.skill_level,
      scenario: JSON.parse(row.scenario),
      estimatedTime: row.estimated_time,
      maxScore: row.max_score,
      passingScore: row.passing_score,
      hints: JSON.parse(row.hints || '[]'),
      solution: JSON.parse(row.solution),
      prerequisites: JSON.parse(row.prerequisites || '[]'),
      tags: JSON.parse(row.tags || '[]'),
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      metadata: JSON.parse(row.metadata || '{}')
    };
  }

  async searchTrainingScenarios(filters: SearchFilters, pagination: Pagination): Promise<ScenarioSearchResult> {
    let query = this.db('training_scenarios');

    if (filters.query) {
      query = query.where((builder) => {
        builder
          .where('title', 'like', `%${filters.query}%`)
          .orWhere('description', 'like', `%${filters.query}%`);
      });
    }

    if (filters.category) {
      query = query.where('category', filters.category);
    }

    if (filters.skillLevel) {
      query = query.where('skill_level', filters.skillLevel);
    }

    if (filters.difficulty) {
      query = query.where('difficulty', filters.difficulty);
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.whereRaw('JSON_EXTRACT(tags, "$") LIKE ?', [`%${filters.tags.join('%')}%`]);
    }

    // Count total results
    const totalResult = await query.clone().count('* as total').first();
    const total = totalResult?.total || 0;

    // Apply pagination
    const offset = (pagination.page - 1) * pagination.limit;
    const rows = await query
      .orderBy(pagination.sortBy, pagination.sortOrder)
      .limit(pagination.limit)
      .offset(offset);

    const scenarios: TrainingScenario[] = rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      difficulty: row.difficulty,
      skillLevel: row.skill_level,
      scenario: JSON.parse(row.scenario),
      estimatedTime: row.estimated_time,
      maxScore: row.max_score,
      passingScore: row.passing_score,
      hints: JSON.parse(row.hints || '[]'),
      solution: JSON.parse(row.solution),
      prerequisites: JSON.parse(row.prerequisites || '[]'),
      tags: JSON.parse(row.tags || '[]'),
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      metadata: JSON.parse(row.metadata || '{}')
    }));

    const totalPages = Math.ceil(total / pagination.limit);

    return {
      scenarios,
      total,
      page: pagination.page,
      totalPages
    };
  }

  // Scenario Instance Management
  async startScenarioInstance(scenarioId: string, studentId: string): Promise<ScenarioInstance> {
    const scenario = await this.getTrainingScenario(scenarioId);
    if (!scenario) {
      throw new Error(`Training scenario ${scenarioId} not found`);
    }

    // Check if student already has an active instance
    const existingInstance = await this.getActiveInstanceForStudent(scenarioId, studentId);
    if (existingInstance) {
      return existingInstance;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + scenario.estimatedTime * 60 * 1000 * 1.5); // 150% of estimated time

    const instance: ScenarioInstance = {
      id: uuidv4(),
      scenarioId,
      studentId,
      status: 'provisioning',
      startedAt: now,
      expiresAt,
      timeRemaining: scenario.estimatedTime * 60 * 1.5, // seconds
      progress: {
        objectivesCompleted: 0,
        totalObjectives: scenario.scenario.objectives.length,
        score: 0,
        hintsUsed: 0,
        flags: [],
        artifacts: [],
        timeline: []
      },
      environment: {
        containersInfo: [],
        accessInfo: {},
        networkTopology: {}
      },
      metadata: {}
    };

    // Save to database
    await this.db('scenario_instances').insert({
      id: instance.id,
      scenario_id: instance.scenarioId,
      student_id: instance.studentId,
      status: instance.status,
      started_at: instance.startedAt,
      expires_at: instance.expiresAt,
      time_remaining: instance.timeRemaining,
      progress: JSON.stringify(instance.progress),
      environment: JSON.stringify(instance.environment),
      metadata: JSON.stringify(instance.metadata)
    });

    this.activeInstances.set(instance.id, instance);

    // Start environment provisioning
    this.provisionScenarioEnvironment(instance, scenario);

    // Record analytics
    await this.recordAnalyticsEvent(scenarioId, studentId, instance.id, 'start', {
      estimatedTime: scenario.estimatedTime,
      objectives: scenario.scenario.objectives.length
    });

    this.emit('scenario-instance-started', { instanceId: instance.id, scenarioId, studentId });
    logger.info(`Started scenario instance ${instance.id} for student ${studentId}`);

    return instance;
  }

  private async provisionScenarioEnvironment(instance: ScenarioInstance, scenario: TrainingScenario): Promise<void> {
    try {
      // Simulate environment provisioning
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay

      instance.environment = {
        containersInfo: scenario.scenario.environment.config.containers.map((container, index) => ({
          containerId: `${instance.id}-${container.name}-${index}`,
          name: container.name,
          status: 'running',
          ports: container.ports || [],
          ipAddress: `172.30.0.${10 + index}`
        })),
        accessInfo: {
          endpoint: `https://scenario-${instance.id}.securewatch.edu`,
          credentials: {
            username: 'analyst',
            password: 'SecurePass123!'
          }
        },
        networkTopology: {
          subnets: ['172.30.0.0/24'],
          vlans: ['VLAN100']
        }
      };

      instance.status = 'running';

      // Update database
      await this.updateInstance(instance);

      this.emit('scenario-instance-ready', { instanceId: instance.id, accessInfo: instance.environment.accessInfo });
      logger.info(`Scenario instance ${instance.id} provisioned and ready`);
    } catch (error) {
      instance.status = 'failed';
      await this.updateInstance(instance);
      
      this.emit('scenario-instance-failed', { instanceId: instance.id, error: error.message });
      logger.error(`Failed to provision scenario instance ${instance.id}:`, error);
    }
  }

  async getScenarioInstance(instanceId: string): Promise<ScenarioInstance | null> {
    return this.activeInstances.get(instanceId) || null;
  }

  async getActiveInstanceForStudent(scenarioId: string, studentId: string): Promise<ScenarioInstance | null> {
    for (const instance of this.activeInstances.values()) {
      if (instance.scenarioId === scenarioId && instance.studentId === studentId && 
          ['provisioning', 'running', 'paused'].includes(instance.status)) {
        return instance;
      }
    }
    return null;
  }

  // Objective Submission Management
  async submitObjective(
    instanceId: string,
    objectiveId: string,
    submission: {
      answer: string;
      evidence: string[];
    }
  ): Promise<ObjectiveSubmission> {
    const instance = this.activeInstances.get(instanceId);
    if (!instance) {
      throw new Error(`Scenario instance ${instanceId} not found`);
    }

    const scenario = await this.getTrainingScenario(instance.scenarioId);
    if (!scenario) {
      throw new Error(`Scenario ${instance.scenarioId} not found`);
    }

    const objective = scenario.scenario.objectives.find(obj => obj.id === objectiveId);
    if (!objective) {
      throw new Error(`Objective ${objectiveId} not found`);
    }

    // Validate submission
    const validationResult = await this.validateObjectiveSubmission(objective, submission);

    const objectiveSubmission: ObjectiveSubmission = {
      objectiveId,
      studentId: instance.studentId,
      instanceId,
      answer: submission.answer,
      evidence: submission.evidence,
      submittedAt: new Date(),
      validationResult
    };

    // Save submission
    const submissionId = uuidv4();
    await this.db('objective_submissions').insert({
      id: submissionId,
      objective_id: objectiveId,
      student_id: instance.studentId,
      instance_id: instanceId,
      answer: submission.answer,
      evidence: JSON.stringify(submission.evidence),
      submitted_at: objectiveSubmission.submittedAt,
      validation_result: JSON.stringify(validationResult),
      is_correct: validationResult.correct,
      score: validationResult.score,
      attempt_number: 1 // TODO: Calculate attempt number
    });

    // Update instance progress
    if (validationResult.correct) {
      instance.progress.objectivesCompleted++;
      instance.progress.score += validationResult.score;
    }

    // Add to timeline
    instance.progress.timeline.push({
      timestamp: new Date(),
      action: 'objective_submission',
      details: {
        objectiveId,
        correct: validationResult.correct,
        score: validationResult.score
      }
    });

    await this.updateInstance(instance);

    // Record analytics
    await this.recordAnalyticsEvent(instance.scenarioId, instance.studentId, instanceId, 'objective_attempt', {
      objectiveId,
      correct: validationResult.correct,
      score: validationResult.score
    });

    this.emit('objective-submitted', { instanceId, objectiveId, submission: objectiveSubmission });

    return objectiveSubmission;
  }

  private async validateObjectiveSubmission(objective: any, submission: any): Promise<any> {
    // Basic validation logic - in production, this would be more sophisticated
    let correct = false;
    let score = 0;
    let feedback = '';
    let partialCredit = 0;

    try {
      // Simulate validation based on objective type and expected answers
      const answerLower = submission.answer.toLowerCase().trim();
      
      // Mock validation logic
      switch (objective.id) {
        case 'identify-initial-vector':
          correct = answerLower.includes('phishing') || answerLower.includes('email');
          score = correct ? objective.points : 0;
          feedback = correct ? 'Correct! Phishing email was the initial vector.' : 'Incorrect. Review the email logs.';
          break;
        case 'identify-ransomware':
          correct = answerLower.includes('ryuk') || answerLower.includes('conti');
          score = correct ? objective.points : 0;
          feedback = correct ? 'Correct ransomware family identified!' : 'Try analyzing the encryption patterns.';
          break;
        default:
          // Generic validation
          correct = Math.random() > 0.3; // 70% success rate for demo
          score = correct ? objective.points : Math.floor(objective.points * 0.3); // Partial credit
          partialCredit = score;
          feedback = correct ? 'Good analysis!' : 'Partially correct. Consider additional evidence.';
      }

    } catch (error) {
      feedback = `Validation error: ${error.message}`;
    }

    return {
      correct,
      score,
      feedback,
      partialCredit
    };
  }

  // Attack Simulation Management
  async createAttackSimulation(simulationData: Omit<AttackSimulation, 'id' | 'createdAt'>): Promise<AttackSimulation> {
    const newSimulation: AttackSimulation = {
      id: uuidv4(),
      createdAt: new Date(),
      ...simulationData
    };

    await this.db('attack_simulations').insert({
      id: newSimulation.id,
      name: newSimulation.name,
      description: newSimulation.description,
      category: newSimulation.category,
      attack_vector: JSON.stringify(newSimulation.attackVector),
      target_systems: JSON.stringify(newSimulation.targetSystems),
      timeline: JSON.stringify(newSimulation.timeline),
      artifacts: JSON.stringify(newSimulation.artifacts),
      iocs: JSON.stringify(newSimulation.iocs),
      mitre_tactics: JSON.stringify(newSimulation.mitreTactics),
      mitre_tooling: JSON.stringify(newSimulation.mitreTooling),
      created_by: newSimulation.createdBy,
      created_at: newSimulation.createdAt,
      metadata: JSON.stringify(newSimulation.metadata)
    });

    this.emit('attack-simulation-created', { simulationId: newSimulation.id, simulation: newSimulation });
    logger.info(`Created attack simulation: ${newSimulation.name}`);

    return newSimulation;
  }

  async getAttackSimulations(category?: string): Promise<AttackSimulation[]> {
    let query = this.db('attack_simulations');
    
    if (category) {
      query = query.where('category', category);
    }

    const rows = await query.orderBy('created_at', 'desc');

    return rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      attackVector: JSON.parse(row.attack_vector || '[]'),
      targetSystems: JSON.parse(row.target_systems || '[]'),
      timeline: JSON.parse(row.timeline || '[]'),
      artifacts: JSON.parse(row.artifacts || '[]'),
      iocs: JSON.parse(row.iocs || '[]'),
      mitreTactics: JSON.parse(row.mitre_tactics || '[]'),
      mitreTooling: JSON.parse(row.mitre_tooling || '[]'),
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }

  // Helper Methods
  private async updateInstance(instance: ScenarioInstance): Promise<void> {
    await this.db('scenario_instances')
      .where('id', instance.id)
      .update({
        status: instance.status,
        completed_at: instance.completedAt,
        time_remaining: instance.timeRemaining,
        progress: JSON.stringify(instance.progress),
        environment: JSON.stringify(instance.environment),
        metadata: JSON.stringify(instance.metadata)
      });
  }

  private async recordAnalyticsEvent(
    scenarioId: string,
    studentId: string,
    instanceId: string,
    eventType: string,
    eventData: any
  ): Promise<void> {
    await this.db('scenario_analytics').insert({
      id: uuidv4(),
      scenario_id: scenarioId,
      student_id: studentId,
      instance_id: instanceId,
      event_type: eventType,
      event_data: JSON.stringify(eventData),
      timestamp: new Date()
    });
  }

  private async cleanupExpiredInstances(): Promise<void> {
    const now = new Date();
    const expiredInstances = Array.from(this.activeInstances.values())
      .filter(instance => instance.expiresAt < now);

    for (const instance of expiredInstances) {
      try {
        instance.status = 'expired';
        await this.updateInstance(instance);
        this.activeInstances.delete(instance.id);
        
        this.emit('scenario-instance-expired', { instanceId: instance.id });
        logger.info(`Cleaned up expired scenario instance: ${instance.id}`);
      } catch (error) {
        logger.error(`Failed to cleanup expired instance ${instance.id}:`, error);
      }
    }
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down Training Scenario Service');
    
    // Update all active instances
    for (const instance of this.activeInstances.values()) {
      await this.updateInstance(instance);
    }

    await this.db.destroy();
    logger.info('Training Scenario Service shutdown complete');
  }
}