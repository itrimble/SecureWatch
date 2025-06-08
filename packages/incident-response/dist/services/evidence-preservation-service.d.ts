import { EventEmitter } from 'events';
import { Evidence, ForensicCollection, DatabaseConfig } from '../types/incident-response.types';
interface EvidenceStorageConfig {
    basePath: string;
    encryptionEnabled: boolean;
    compressionEnabled: boolean;
    checksumAlgorithm: 'md5' | 'sha1' | 'sha256' | 'sha512';
    retentionPeriod: number;
    maxFileSize: number;
    allowedMimeTypes: string[];
}
interface ForensicCollectionConfig {
    toolsPath: string;
    outputPath: string;
    encryptionKey?: string;
    compressionLevel: number;
    verificationEnabled: boolean;
}
interface IntegrityVerification {
    verified: boolean;
    method: 'checksum' | 'digital-signature' | 'both';
    hash?: string;
    signature?: string;
    timestamp: Date;
    verifiedBy: string;
}
export declare class EvidencePreservationService extends EventEmitter {
    private db;
    private storageConfig;
    private forensicConfig;
    constructor(config: {
        database: DatabaseConfig;
        storage: EvidenceStorageConfig;
        forensics: ForensicCollectionConfig;
    });
    initialize(): Promise<void>;
    private createTables;
    private createStorageDirectories;
    private setupRetentionPolicies;
    collectEvidence(caseId: string, fileBuffer: Buffer, metadata: {
        name: string;
        description?: string;
        type: string;
        source: string;
        collectedBy: string;
        originalFilename?: string;
        mimeType?: string;
        tags?: string[];
    }): Promise<Evidence>;
    private generateHashes;
    private storeEvidenceFile;
    getEvidence(evidenceId: string, userId: string): Promise<Evidence | null>;
    getEvidenceFile(evidenceId: string, userId: string): Promise<Buffer | null>;
    getCaseEvidence(caseId: string): Promise<Evidence[]>;
    updateChainOfCustody(evidenceId: string, action: 'transferred' | 'analyzed' | 'stored', userId: string, location: string, notes?: string): Promise<void>;
    verifyEvidenceIntegrity(evidenceId: string, verifiedBy: string): Promise<IntegrityVerification>;
    scheduleIntegrityCheck(evidenceId: string): Promise<void>;
    createForensicCollection(caseId: string, collectionData: {
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
    }): Promise<ForensicCollection>;
    startForensicCollection(collectionId: string, userId: string): Promise<void>;
    private executeForensicCollection;
    private performLiveResponse;
    private createDiskImage;
    private createMemoryDump;
    private captureNetworkTraffic;
    private collectLogs;
    private verifyForensicCollectionIntegrity;
    getForensicCollection(collectionId: string): Promise<ForensicCollection | null>;
    getCaseForensicCollections(caseId: string): Promise<ForensicCollection[]>;
    searchEvidence(criteria: {
        caseId?: string;
        type?: string;
        tags?: string[];
        collectedBy?: string;
        dateRange?: {
            start: Date;
            end: Date;
        };
        sizeRange?: {
            min: number;
            max: number;
        };
        textSearch?: string;
        limit?: number;
        offset?: number;
    }): Promise<{
        evidence: Evidence[];
        total: number;
    }>;
    private logEvidenceAccess;
    getEvidenceAccessLog(evidenceId: string): Promise<any[]>;
    deleteEvidence(evidenceId: string, userId: string, reason: string): Promise<void>;
    private cleanupExpiredEvidence;
    private mapRowToEvidence;
    private mapRowToForensicCollection;
    getEvidenceStatistics(): Promise<any>;
    shutdown(): Promise<void>;
}
export {};
