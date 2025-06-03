import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import knex, { Knex } from 'knex';
import { createHash } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import archiver from 'archiver';
import sharp from 'sharp';
import { logger } from '../utils/logger';
import {
  Evidence,
  EvidenceSchema,
  ForensicCollection,
  ForensicCollectionSchema,
  DatabaseConfig,
  EvidenceIntegrityError
} from '../types/incident-response.types';

interface EvidenceStorageConfig {
  basePath: string;
  encryptionEnabled: boolean;
  compressionEnabled: boolean;
  checksumAlgorithm: 'md5' | 'sha1' | 'sha256' | 'sha512';
  retentionPeriod: number; // days
  maxFileSize: number; // bytes
  allowedMimeTypes: string[];
}

interface ForensicCollectionConfig {
  toolsPath: string;
  outputPath: string;
  encryptionKey?: string;
  compressionLevel: number;
  verificationEnabled: boolean;
}

interface ChainOfCustodyEntry {
  timestamp: Date;
  action: 'collected' | 'transferred' | 'analyzed' | 'stored' | 'deleted';
  userId: string;
  location: string;
  notes?: string;
}

interface IntegrityVerification {
  verified: boolean;
  method: 'checksum' | 'digital-signature' | 'both';
  hash?: string;
  signature?: string;
  timestamp: Date;
  verifiedBy: string;
}

export class EvidencePreservationService extends EventEmitter {
  private db: Knex;
  private storageConfig: EvidenceStorageConfig;
  private forensicConfig: ForensicCollectionConfig;

  constructor(config: {
    database: DatabaseConfig;
    storage: EvidenceStorageConfig;
    forensics: ForensicCollectionConfig;
  }) {
    super();
    this.db = knex({
      client: config.database.type,
      connection: config.database.connection,
      useNullAsDefault: true
    });
    this.storageConfig = config.storage;
    this.forensicConfig = config.forensics;
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Evidence Preservation Service');
    await this.createTables();
    await this.createStorageDirectories();
    await this.setupRetentionPolicies();
    logger.info('Evidence Preservation Service initialized successfully');
  }

  private async createTables(): Promise<void> {
    // Evidence table
    if (!(await this.db.schema.hasTable('evidence'))) {
      await this.db.schema.createTable('evidence', (table) => {
        table.string('id').primary();
        table.string('case_id').notNullable().index();
        table.string('name').notNullable();
        table.text('description');
        table.string('type', 50).notNullable();
        table.bigInteger('size').notNullable();
        table.json('hash');
        table.string('source').notNullable();
        table.string('collected_by').notNullable();
        table.dateTime('collected_at').notNullable().index();
        table.json('chain_of_custody');
        table.string('file_path');
        table.string('original_filename');
        table.string('mime_type');
        table.boolean('is_deleted').defaultTo(false);
        table.json('tags');
        table.json('metadata');
        table.dateTime('created_at').notNullable();
        table.dateTime('updated_at').notNullable();
        
        table.foreign('case_id').references('cases.id').onDelete('CASCADE');
        table.index(['case_id', 'type']);
        table.index(['collected_by']);
        table.index(['is_deleted']);
      });
    }

    // Forensic collections table
    if (!(await this.db.schema.hasTable('forensic_collections'))) {
      await this.db.schema.createTable('forensic_collections', (table) => {
        table.string('id').primary();
        table.string('case_id').notNullable().index();
        table.string('name').notNullable();
        table.text('description');
        table.json('target');
        table.string('collection_type', 50).notNullable();
        table.string('status', 20).notNullable().index();
        table.dateTime('started_at');
        table.dateTime('completed_at');
        table.string('collected_by').notNullable();
        table.json('tools');
        table.json('artifacts');
        table.json('chain_of_custody');
        table.json('integrity');
        table.json('metadata');
        table.dateTime('created_at').notNullable();
        table.dateTime('updated_at').notNullable();
        
        table.foreign('case_id').references('cases.id').onDelete('CASCADE');
        table.index(['status']);
        table.index(['collection_type']);
      });
    }

    // Evidence access log
    if (!(await this.db.schema.hasTable('evidence_access_log'))) {
      await this.db.schema.createTable('evidence_access_log', (table) => {
        table.string('id').primary();
        table.string('evidence_id').notNullable().index();
        table.string('user_id').notNullable();
        table.string('action', 50).notNullable(); // 'view', 'download', 'modify', 'delete'
        table.dateTime('timestamp').notNullable().index();
        table.string('ip_address');
        table.string('user_agent');
        table.json('details');
        
        table.foreign('evidence_id').references('evidence.id').onDelete('CASCADE');
        table.index(['user_id', 'timestamp']);
        table.index(['action', 'timestamp']);
      });
    }

    // Evidence integrity checks
    if (!(await this.db.schema.hasTable('evidence_integrity_checks'))) {
      await this.db.schema.createTable('evidence_integrity_checks', (table) => {
        table.string('id').primary();
        table.string('evidence_id').notNullable().index();
        table.boolean('verified').notNullable();
        table.string('method', 50).notNullable();
        table.string('hash');
        table.string('signature');
        table.dateTime('timestamp').notNullable().index();
        table.string('verified_by').notNullable();
        table.text('notes');
        table.json('metadata');
        
        table.foreign('evidence_id').references('evidence.id').onDelete('CASCADE');
        table.index(['verified', 'timestamp']);
      });
    }
  }

  private async createStorageDirectories(): Promise<void> {
    const directories = [
      this.storageConfig.basePath,
      path.join(this.storageConfig.basePath, 'evidence'),
      path.join(this.storageConfig.basePath, 'forensics'),
      path.join(this.storageConfig.basePath, 'temp'),
      path.join(this.storageConfig.basePath, 'quarantine')
    ];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
        logger.debug(`Created storage directory: ${dir}`);
      } catch (error) {
        logger.error(`Failed to create directory ${dir}:`, error);
        throw error;
      }
    }
  }

  private async setupRetentionPolicies(): Promise<void> {
    // Set up automated cleanup of expired evidence
    setInterval(async () => {
      await this.cleanupExpiredEvidence();
    }, 24 * 60 * 60 * 1000); // Run daily
  }

  // Evidence Collection
  async collectEvidence(
    caseId: string,
    fileBuffer: Buffer,
    metadata: {
      name: string;
      description?: string;
      type: string;
      source: string;
      collectedBy: string;
      originalFilename?: string;
      mimeType?: string;
      tags?: string[];
    }
  ): Promise<Evidence> {
    logger.info(`Collecting evidence for case ${caseId}: ${metadata.name}`);

    // Validate file size
    if (fileBuffer.length > this.storageConfig.maxFileSize) {
      throw new Error(`File size ${fileBuffer.length} exceeds maximum allowed size ${this.storageConfig.maxFileSize}`);
    }

    // Validate MIME type if specified
    if (metadata.mimeType && !this.storageConfig.allowedMimeTypes.includes(metadata.mimeType)) {
      throw new Error(`MIME type ${metadata.mimeType} is not allowed`);
    }

    // Generate hashes
    const hashes = await this.generateHashes(fileBuffer);

    // Create evidence record
    const evidence: Evidence = {
      id: uuidv4(),
      caseId,
      name: metadata.name,
      description: metadata.description || '',
      type: metadata.type as any,
      size: fileBuffer.length,
      hash: hashes,
      source: metadata.source,
      collectedBy: metadata.collectedBy,
      collectedAt: new Date(),
      chainOfCustody: [{
        timestamp: new Date(),
        action: 'collected',
        userId: metadata.collectedBy,
        location: 'digital-evidence-system',
        notes: 'Initial collection and storage'
      }],
      originalFilename: metadata.originalFilename,
      mimeType: metadata.mimeType,
      isDeleted: false,
      tags: metadata.tags || [],
      metadata: {}
    };

    // Store file
    const filePath = await this.storeEvidenceFile(evidence.id, fileBuffer);
    evidence.filePath = filePath;

    // Validate evidence
    const validatedEvidence = EvidenceSchema.parse(evidence);

    // Save to database
    await this.db('evidence').insert({
      id: validatedEvidence.id,
      case_id: validatedEvidence.caseId,
      name: validatedEvidence.name,
      description: validatedEvidence.description,
      type: validatedEvidence.type,
      size: validatedEvidence.size,
      hash: JSON.stringify(validatedEvidence.hash),
      source: validatedEvidence.source,
      collected_by: validatedEvidence.collectedBy,
      collected_at: validatedEvidence.collectedAt,
      chain_of_custody: JSON.stringify(validatedEvidence.chainOfCustody),
      file_path: validatedEvidence.filePath,
      original_filename: validatedEvidence.originalFilename,
      mime_type: validatedEvidence.mimeType,
      is_deleted: validatedEvidence.isDeleted,
      tags: JSON.stringify(validatedEvidence.tags),
      metadata: JSON.stringify(validatedEvidence.metadata),
      created_at: new Date(),
      updated_at: new Date()
    });

    // Perform initial integrity verification
    await this.verifyEvidenceIntegrity(validatedEvidence.id, metadata.collectedBy);

    // Log access
    await this.logEvidenceAccess(validatedEvidence.id, metadata.collectedBy, 'collect', {
      action: 'initial_collection',
      fileSize: validatedEvidence.size
    });

    this.emit('evidence-collected', { evidenceId: validatedEvidence.id, caseId });

    logger.info(`Evidence collected successfully: ${validatedEvidence.id}`);
    return validatedEvidence;
  }

  private async generateHashes(buffer: Buffer): Promise<any> {
    const hashes: any = {};
    
    hashes.md5 = createHash('md5').update(buffer).digest('hex');
    hashes.sha1 = createHash('sha1').update(buffer).digest('hex');
    hashes.sha256 = createHash('sha256').update(buffer).digest('hex');
    hashes.sha512 = createHash('sha512').update(buffer).digest('hex');

    return hashes;
  }

  private async storeEvidenceFile(evidenceId: string, buffer: Buffer): Promise<string> {
    const evidenceDir = path.join(this.storageConfig.basePath, 'evidence');
    const fileName = `${evidenceId}.bin`;
    const filePath = path.join(evidenceDir, fileName);

    try {
      if (this.storageConfig.compressionEnabled) {
        // Implement compression if needed
        // For now, store as-is
      }

      await fs.writeFile(filePath, buffer);
      
      if (this.storageConfig.encryptionEnabled) {
        // Implement encryption if needed
        // This would typically use AES-256 or similar
      }

      logger.debug(`Evidence file stored: ${filePath}`);
      return filePath;
    } catch (error) {
      logger.error(`Failed to store evidence file ${evidenceId}:`, error);
      throw error;
    }
  }

  // Evidence Retrieval
  async getEvidence(evidenceId: string, userId: string): Promise<Evidence | null> {
    const row = await this.db('evidence').where('id', evidenceId).first();
    if (!row) return null;

    // Log access
    await this.logEvidenceAccess(evidenceId, userId, 'view');

    return this.mapRowToEvidence(row);
  }

  async getEvidenceFile(evidenceId: string, userId: string): Promise<Buffer | null> {
    const evidence = await this.getEvidence(evidenceId, userId);
    if (!evidence || !evidence.filePath) return null;

    try {
      const buffer = await fs.readFile(evidence.filePath);
      
      // Log download access
      await this.logEvidenceAccess(evidenceId, userId, 'download', {
        fileSize: buffer.length
      });

      return buffer;
    } catch (error) {
      logger.error(`Failed to read evidence file ${evidenceId}:`, error);
      return null;
    }
  }

  async getCaseEvidence(caseId: string): Promise<Evidence[]> {
    const rows = await this.db('evidence')
      .where('case_id', caseId)
      .where('is_deleted', false)
      .orderBy('collected_at', 'desc');

    return rows.map(row => this.mapRowToEvidence(row));
  }

  // Chain of Custody Management
  async updateChainOfCustody(
    evidenceId: string,
    action: 'transferred' | 'analyzed' | 'stored',
    userId: string,
    location: string,
    notes?: string
  ): Promise<void> {
    const evidence = await this.getEvidence(evidenceId, userId);
    if (!evidence) {
      throw new Error(`Evidence ${evidenceId} not found`);
    }

    const newEntry: ChainOfCustodyEntry = {
      timestamp: new Date(),
      action,
      userId,
      location,
      notes
    };

    evidence.chainOfCustody.push(newEntry);

    await this.db('evidence')
      .where('id', evidenceId)
      .update({
        chain_of_custody: JSON.stringify(evidence.chainOfCustody),
        updated_at: new Date()
      });

    // Log the chain of custody update
    await this.logEvidenceAccess(evidenceId, userId, 'modify', {
      action: 'chain_of_custody_update',
      custodyAction: action,
      location
    });

    this.emit('chain-of-custody-updated', { evidenceId, action, userId });
  }

  // Evidence Integrity Verification
  async verifyEvidenceIntegrity(evidenceId: string, verifiedBy: string): Promise<IntegrityVerification> {
    const evidence = await this.getEvidence(evidenceId, verifiedBy);
    if (!evidence) {
      throw new EvidenceIntegrityError('Evidence not found', evidenceId);
    }

    try {
      // Read the stored file
      const buffer = await fs.readFile(evidence.filePath!);
      
      // Generate current hashes
      const currentHashes = await this.generateHashes(buffer);
      
      // Compare with stored hashes
      const verified = evidence.hash.sha256 === currentHashes.sha256;
      
      const verification: IntegrityVerification = {
        verified,
        method: 'checksum',
        hash: currentHashes.sha256,
        timestamp: new Date(),
        verifiedBy
      };

      // Save verification result
      await this.db('evidence_integrity_checks').insert({
        id: uuidv4(),
        evidence_id: evidenceId,
        verified: verification.verified,
        method: verification.method,
        hash: verification.hash,
        signature: verification.signature,
        timestamp: verification.timestamp,
        verified_by: verification.verifiedBy,
        notes: verified ? 'Integrity verified successfully' : 'INTEGRITY VERIFICATION FAILED',
        metadata: JSON.stringify({})
      });

      if (!verified) {
        logger.error(`Evidence integrity verification failed for ${evidenceId}`);
        this.emit('integrity-failure', { evidenceId, verification });
        throw new EvidenceIntegrityError('Evidence integrity verification failed', evidenceId, {
          expectedHash: evidence.hash.sha256,
          actualHash: currentHashes.sha256
        });
      }

      logger.info(`Evidence integrity verified for ${evidenceId}`);
      this.emit('integrity-verified', { evidenceId, verification });

      return verification;
    } catch (error) {
      if (error instanceof EvidenceIntegrityError) {
        throw error;
      }
      
      logger.error(`Error verifying evidence integrity for ${evidenceId}:`, error);
      throw new EvidenceIntegrityError('Failed to verify evidence integrity', evidenceId, { error: error.message });
    }
  }

  async scheduleIntegrityCheck(evidenceId: string): Promise<void> {
    // Schedule periodic integrity checks
    // This would typically be handled by a job queue system
    setTimeout(async () => {
      try {
        await this.verifyEvidenceIntegrity(evidenceId, 'system');
      } catch (error) {
        logger.error(`Scheduled integrity check failed for ${evidenceId}:`, error);
      }
    }, 24 * 60 * 60 * 1000); // Check after 24 hours
  }

  // Forensic Collection
  async createForensicCollection(
    caseId: string,
    collectionData: {
      name: string;
      description: string;
      target: {
        type: 'host' | 'network' | 'cloud' | 'mobile';
        identifier: string;
        location?: string;
      };
      collectionType: 'live-response' | 'disk-image' | 'memory-dump' | 'network-capture' | 'log-collection';
      collectedBy: string;
      tools?: string[];
    }
  ): Promise<ForensicCollection> {
    const collection: ForensicCollection = {
      id: uuidv4(),
      caseId,
      name: collectionData.name,
      description: collectionData.description,
      target: collectionData.target,
      collectionType: collectionData.collectionType,
      status: 'planned',
      collectedBy: collectionData.collectedBy,
      tools: collectionData.tools || [],
      artifacts: [],
      chainOfCustody: [{
        timestamp: new Date(),
        action: 'Collection planned',
        userId: collectionData.collectedBy,
        location: 'forensic-system',
        notes: 'Forensic collection created and planned'
      }],
      metadata: {}
    };

    const validatedCollection = ForensicCollectionSchema.parse(collection);

    // Save to database
    await this.db('forensic_collections').insert({
      id: validatedCollection.id,
      case_id: validatedCollection.caseId,
      name: validatedCollection.name,
      description: validatedCollection.description,
      target: JSON.stringify(validatedCollection.target),
      collection_type: validatedCollection.collectionType,
      status: validatedCollection.status,
      started_at: validatedCollection.startedAt,
      completed_at: validatedCollection.completedAt,
      collected_by: validatedCollection.collectedBy,
      tools: JSON.stringify(validatedCollection.tools),
      artifacts: JSON.stringify(validatedCollection.artifacts),
      chain_of_custody: JSON.stringify(validatedCollection.chainOfCustody),
      integrity: JSON.stringify(validatedCollection.integrity),
      metadata: JSON.stringify(validatedCollection.metadata),
      created_at: new Date(),
      updated_at: new Date()
    });

    this.emit('forensic-collection-created', { collectionId: validatedCollection.id, caseId });

    logger.info(`Forensic collection created: ${validatedCollection.id}`);
    return validatedCollection;
  }

  async startForensicCollection(collectionId: string, userId: string): Promise<void> {
    const collection = await this.getForensicCollection(collectionId);
    if (!collection) {
      throw new Error(`Forensic collection ${collectionId} not found`);
    }

    if (collection.status !== 'planned') {
      throw new Error(`Collection ${collectionId} cannot be started from status ${collection.status}`);
    }

    const now = new Date();
    
    await this.db('forensic_collections')
      .where('id', collectionId)
      .update({
        status: 'in-progress',
        started_at: now,
        updated_at: now
      });

    // Add to chain of custody
    collection.chainOfCustody.push({
      timestamp: now,
      action: 'Collection started',
      userId,
      location: 'forensic-system',
      notes: 'Forensic collection process initiated'
    });

    await this.db('forensic_collections')
      .where('id', collectionId)
      .update({
        chain_of_custody: JSON.stringify(collection.chainOfCustody)
      });

    this.emit('forensic-collection-started', { collectionId, userId });

    // Start the actual collection process
    await this.executeForensicCollection(collection, userId);
  }

  private async executeForensicCollection(collection: ForensicCollection, userId: string): Promise<void> {
    try {
      logger.info(`Executing forensic collection ${collection.id}`);

      const outputDir = path.join(this.forensicConfig.outputPath, collection.id);
      await fs.mkdir(outputDir, { recursive: true });

      let artifacts: string[] = [];

      switch (collection.collectionType) {
        case 'live-response':
          artifacts = await this.performLiveResponse(collection, outputDir);
          break;
        case 'disk-image':
          artifacts = await this.createDiskImage(collection, outputDir);
          break;
        case 'memory-dump':
          artifacts = await this.createMemoryDump(collection, outputDir);
          break;
        case 'network-capture':
          artifacts = await this.captureNetworkTraffic(collection, outputDir);
          break;
        case 'log-collection':
          artifacts = await this.collectLogs(collection, outputDir);
          break;
      }

      // Update collection with artifacts
      await this.db('forensic_collections')
        .where('id', collection.id)
        .update({
          status: 'completed',
          completed_at: new Date(),
          artifacts: JSON.stringify(artifacts),
          updated_at: new Date()
        });

      // Verify integrity if enabled
      if (this.forensicConfig.verificationEnabled) {
        await this.verifyForensicCollectionIntegrity(collection.id, artifacts);
      }

      this.emit('forensic-collection-completed', { collectionId: collection.id, artifacts });

    } catch (error) {
      logger.error(`Forensic collection ${collection.id} failed:`, error);
      
      await this.db('forensic_collections')
        .where('id', collection.id)
        .update({
          status: 'failed',
          updated_at: new Date()
        });

      this.emit('forensic-collection-failed', { collectionId: collection.id, error: error.message });
      throw error;
    }
  }

  private async performLiveResponse(collection: ForensicCollection, outputDir: string): Promise<string[]> {
    // Simulate live response collection
    const artifacts = [
      'running_processes.txt',
      'network_connections.txt',
      'system_information.txt',
      'registry_hives.reg',
      'event_logs.evtx'
    ];

    // In a real implementation, this would:
    // 1. Connect to the target system
    // 2. Execute forensic tools (e.g., Velociraptor, KAPE)
    // 3. Collect volatile data
    // 4. Package results

    for (const artifact of artifacts) {
      const artifactPath = path.join(outputDir, artifact);
      await fs.writeFile(artifactPath, `Mock ${artifact} data for collection ${collection.id}`);
    }

    return artifacts;
  }

  private async createDiskImage(collection: ForensicCollection, outputDir: string): Promise<string[]> {
    // Simulate disk imaging
    const imageName = `${collection.target.identifier}_disk_image.dd`;
    const imagePath = path.join(outputDir, imageName);
    
    // In a real implementation, this would use tools like:
    // - dd, dc3dd, or ewfacquire
    // - FTK Imager
    // - X-Ways Forensics
    
    await fs.writeFile(imagePath, `Mock disk image for ${collection.target.identifier}`);
    
    return [imageName];
  }

  private async createMemoryDump(collection: ForensicCollection, outputDir: string): Promise<string[]> {
    // Simulate memory dump creation
    const dumpName = `${collection.target.identifier}_memory.dmp`;
    const dumpPath = path.join(outputDir, dumpName);
    
    // In a real implementation, this would use tools like:
    // - WinPmem, DumpIt
    // - Volatility
    // - Rekall
    
    await fs.writeFile(dumpPath, `Mock memory dump for ${collection.target.identifier}`);
    
    return [dumpName];
  }

  private async captureNetworkTraffic(collection: ForensicCollection, outputDir: string): Promise<string[]> {
    // Simulate network capture
    const captureName = `${collection.target.identifier}_network.pcap`;
    const capturePath = path.join(outputDir, captureName);
    
    // In a real implementation, this would use tools like:
    // - Wireshark/tshark
    // - tcpdump
    // - NetworkMiner
    
    await fs.writeFile(capturePath, `Mock network capture for ${collection.target.identifier}`);
    
    return [captureName];
  }

  private async collectLogs(collection: ForensicCollection, outputDir: string): Promise<string[]> {
    // Simulate log collection
    const artifacts = [
      'windows_security.evtx',
      'windows_system.evtx',
      'windows_application.evtx',
      'iis_logs.log',
      'syslog.log'
    ];

    for (const artifact of artifacts) {
      const artifactPath = path.join(outputDir, artifact);
      await fs.writeFile(artifactPath, `Mock ${artifact} data for collection ${collection.id}`);
    }

    return artifacts;
  }

  private async verifyForensicCollectionIntegrity(collectionId: string, artifacts: string[]): Promise<void> {
    const outputDir = path.join(this.forensicConfig.outputPath, collectionId);
    const integrityResults: any = {};

    for (const artifact of artifacts) {
      const artifactPath = path.join(outputDir, artifact);
      const buffer = await fs.readFile(artifactPath);
      const hashes = await this.generateHashes(buffer);
      integrityResults[artifact] = hashes;
    }

    await this.db('forensic_collections')
      .where('id', collectionId)
      .update({
        integrity: JSON.stringify({
          verified: true,
          method: 'checksum',
          artifactHashes: integrityResults,
          verifiedAt: new Date()
        })
      });
  }

  async getForensicCollection(collectionId: string): Promise<ForensicCollection | null> {
    const row = await this.db('forensic_collections').where('id', collectionId).first();
    if (!row) return null;

    return this.mapRowToForensicCollection(row);
  }

  async getCaseForensicCollections(caseId: string): Promise<ForensicCollection[]> {
    const rows = await this.db('forensic_collections')
      .where('case_id', caseId)
      .orderBy('created_at', 'desc');

    return rows.map(row => this.mapRowToForensicCollection(row));
  }

  // Evidence Search and Filtering
  async searchEvidence(criteria: {
    caseId?: string;
    type?: string;
    tags?: string[];
    collectedBy?: string;
    dateRange?: { start: Date; end: Date };
    sizeRange?: { min: number; max: number };
    textSearch?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ evidence: Evidence[]; total: number }> {
    let query = this.db('evidence').where('is_deleted', false);

    if (criteria.caseId) {
      query = query.where('case_id', criteria.caseId);
    }

    if (criteria.type) {
      query = query.where('type', criteria.type);
    }

    if (criteria.collectedBy) {
      query = query.where('collected_by', criteria.collectedBy);
    }

    if (criteria.dateRange) {
      query = query.whereBetween('collected_at', [criteria.dateRange.start, criteria.dateRange.end]);
    }

    if (criteria.sizeRange) {
      query = query.whereBetween('size', [criteria.sizeRange.min, criteria.sizeRange.max]);
    }

    if (criteria.textSearch) {
      query = query.where(function() {
        this.where('name', 'like', `%${criteria.textSearch}%`)
            .orWhere('description', 'like', `%${criteria.textSearch}%`)
            .orWhere('original_filename', 'like', `%${criteria.textSearch}%`);
      });
    }

    if (criteria.tags?.length) {
      for (const tag of criteria.tags) {
        query = query.whereRaw('JSON_SEARCH(tags, "one", ?) IS NOT NULL', [tag]);
      }
    }

    // Get total count
    const totalQuery = query.clone();
    const totalResult = await totalQuery.count('* as count').first();
    const total = totalResult?.count as number || 0;

    // Apply pagination
    if (criteria.limit) {
      query = query.limit(criteria.limit);
    }
    if (criteria.offset) {
      query = query.offset(criteria.offset);
    }

    const rows = await query.orderBy('collected_at', 'desc');
    const evidence = rows.map(row => this.mapRowToEvidence(row));

    return { evidence, total };
  }

  // Evidence Access Logging
  private async logEvidenceAccess(
    evidenceId: string,
    userId: string,
    action: string,
    details?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.db('evidence_access_log').insert({
      id: uuidv4(),
      evidence_id: evidenceId,
      user_id: userId,
      action,
      timestamp: new Date(),
      ip_address: ipAddress,
      user_agent: userAgent,
      details: JSON.stringify(details || {})
    });
  }

  async getEvidenceAccessLog(evidenceId: string): Promise<any[]> {
    return await this.db('evidence_access_log')
      .where('evidence_id', evidenceId)
      .orderBy('timestamp', 'desc');
  }

  // Evidence Deletion (with audit trail)
  async deleteEvidence(evidenceId: string, userId: string, reason: string): Promise<void> {
    const evidence = await this.getEvidence(evidenceId, userId);
    if (!evidence) {
      throw new Error(`Evidence ${evidenceId} not found`);
    }

    // Mark as deleted (soft delete)
    await this.db('evidence')
      .where('id', evidenceId)
      .update({
        is_deleted: true,
        updated_at: new Date()
      });

    // Update chain of custody
    await this.updateChainOfCustody(evidenceId, 'deleted' as any, userId, 'evidence-system', reason);

    // Log deletion
    await this.logEvidenceAccess(evidenceId, userId, 'delete', { reason });

    this.emit('evidence-deleted', { evidenceId, userId, reason });

    logger.info(`Evidence ${evidenceId} marked as deleted by ${userId}: ${reason}`);
  }

  // Cleanup and Maintenance
  private async cleanupExpiredEvidence(): Promise<void> {
    const cutoffDate = new Date(Date.now() - this.storageConfig.retentionPeriod * 24 * 60 * 60 * 1000);
    
    const expiredEvidence = await this.db('evidence')
      .where('is_deleted', true)
      .where('updated_at', '<', cutoffDate);

    for (const evidence of expiredEvidence) {
      try {
        // Delete physical file
        if (evidence.file_path) {
          await fs.unlink(evidence.file_path);
        }

        // Remove from database
        await this.db('evidence').where('id', evidence.id).del();

        logger.info(`Cleaned up expired evidence: ${evidence.id}`);
      } catch (error) {
        logger.error(`Failed to cleanup evidence ${evidence.id}:`, error);
      }
    }
  }

  // Helper Methods
  private mapRowToEvidence(row: any): Evidence {
    return {
      id: row.id,
      caseId: row.case_id,
      name: row.name,
      description: row.description,
      type: row.type,
      size: row.size,
      hash: JSON.parse(row.hash),
      source: row.source,
      collectedBy: row.collected_by,
      collectedAt: new Date(row.collected_at),
      chainOfCustody: JSON.parse(row.chain_of_custody || '[]'),
      filePath: row.file_path,
      originalFilename: row.original_filename,
      mimeType: row.mime_type,
      isDeleted: row.is_deleted,
      tags: JSON.parse(row.tags || '[]'),
      metadata: JSON.parse(row.metadata || '{}')
    };
  }

  private mapRowToForensicCollection(row: any): ForensicCollection {
    return {
      id: row.id,
      caseId: row.case_id,
      name: row.name,
      description: row.description,
      target: JSON.parse(row.target),
      collectionType: row.collection_type,
      status: row.status,
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      collectedBy: row.collected_by,
      tools: JSON.parse(row.tools || '[]'),
      artifacts: JSON.parse(row.artifacts || '[]'),
      chainOfCustody: JSON.parse(row.chain_of_custody || '[]'),
      integrity: JSON.parse(row.integrity || '{}'),
      metadata: JSON.parse(row.metadata || '{}')
    };
  }

  // Statistics
  async getEvidenceStatistics(): Promise<any> {
    const stats = await this.db('evidence')
      .select(
        this.db.raw('COUNT(*) as total'),
        this.db.raw('COUNT(CASE WHEN is_deleted = false THEN 1 END) as active'),
        this.db.raw('COUNT(CASE WHEN is_deleted = true THEN 1 END) as deleted'),
        this.db.raw('SUM(CASE WHEN is_deleted = false THEN size ELSE 0 END) as total_size'),
        this.db.raw('COUNT(DISTINCT case_id) as unique_cases')
      )
      .first();

    const typeBreakdown = await this.db('evidence')
      .select('type')
      .count('* as count')
      .where('is_deleted', false)
      .groupBy('type');

    return {
      total: stats.total,
      active: stats.active,
      deleted: stats.deleted,
      totalSize: stats.total_size,
      uniqueCases: stats.unique_cases,
      typeBreakdown: typeBreakdown.reduce((acc, item) => {
        acc[item.type] = item.count;
        return acc;
      }, {})
    };
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down Evidence Preservation Service');
    await this.db.destroy();
    logger.info('Evidence Preservation Service shutdown complete');
  }
}