export interface OpenSearchConfig {
    node: string | string[];
    auth?: {
        username: string;
        password: string;
    };
    ssl?: {
        rejectUnauthorized: boolean;
    };
    requestTimeout?: number;
    maxRetries?: number;
}
export interface LogDocument {
    timestamp: Date;
    raw_message: string;
    source_type: string;
    source_host: string;
    event_id?: string;
    severity?: string;
    event_type?: string;
    category?: string;
    subcategory?: string;
    user?: {
        name?: string;
        id?: string;
        domain?: string;
        email?: string;
    };
    process?: {
        name?: string;
        pid?: number;
        command_line?: string;
        executable?: string;
        parent?: {
            name?: string;
            pid?: number;
        };
    };
    network?: {
        source_ip?: string;
        source_port?: number;
        destination_ip?: string;
        destination_port?: number;
        protocol?: string;
        bytes_sent?: number;
        bytes_received?: number;
    };
    security?: {
        action?: string;
        outcome?: string;
        risk_score?: number;
        mitre_technique?: string[];
        threat_indicators?: string[];
    };
    metadata?: Record<string, any>;
    tags?: string[];
    _search_text?: string;
    _normalized_timestamp?: number;
}
export declare class OpenSearchService {
    private client;
    private logger;
    private indexName;
    private bulkSize;
    private bulkBuffer;
    private flushInterval;
    constructor(config: OpenSearchConfig, indexName?: string);
    initialize(): Promise<void>;
    private createIndexIfNotExists;
    indexDocument(document: LogDocument): Promise<void>;
    bulkIndex(documents: LogDocument[]): Promise<void>;
    private enrichDocument;
    private flushBulkBuffer;
    private startFlushInterval;
    search(query: any, size?: number): Promise<any>;
    close(): Promise<void>;
}
//# sourceMappingURL=opensearch.service.d.ts.map