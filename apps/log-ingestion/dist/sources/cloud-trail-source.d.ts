import { DataSource, DataSourceConfig } from '../types/data-source.types';
import { LogEvent } from '../types/log-event.types';
export interface CloudTrailConfig {
    provider: 'aws' | 'azure' | 'gcp';
    credentials: {
        accessKeyId?: string;
        secretAccessKey?: string;
        region?: string;
        subscriptionId?: string;
        tenantId?: string;
        clientId?: string;
        clientSecret?: string;
        projectId?: string;
        keyFile?: string;
    };
    collection: {
        method: 'api' | 's3' | 'eventbridge' | 'storage' | 'pubsub';
        config: Record<string, any>;
    };
    filtering?: {
        eventNames?: string[];
        userNames?: string[];
        sourceIpAddresses?: string[];
        resources?: string[];
        timeRange?: {
            start: Date;
            end: Date;
        };
    };
    polling: {
        intervalMs: number;
        maxEvents: number;
        lookbackMs: number;
    };
}
export interface CloudEvent {
    eventId: string;
    eventName: string;
    eventSource: string;
    eventTime: Date;
    userName?: string;
    userIdentity: Record<string, any>;
    sourceIPAddress?: string;
    userAgent?: string;
    requestParameters?: Record<string, any>;
    responseElements?: Record<string, any>;
    resources?: Array<{
        accountId?: string;
        type?: string;
        ARN?: string;
    }>;
    errorCode?: string;
    errorMessage?: string;
    rawEvent: Record<string, any>;
}
export declare class CloudTrailSource extends DataSource {
    private pollingInterval?;
    private isCollecting;
    private lastCollectionTime?;
    private cloudConfig;
    private awsCloudTrailClient?;
    private awsCloudWatchLogsClient?;
    private azureLogsClient?;
    private gcpLoggingClient?;
    constructor(config: DataSourceConfig);
    private initializeCloudClients;
    start(): Promise<void>;
    stop(): Promise<void>;
    restart(): Promise<void>;
    collect(): Promise<LogEvent[]>;
    validateConfig(): Promise<boolean>;
    private parseCloudConfig;
    private validateCredentials;
    private startPolling;
    private stopPolling;
    private collectCloudEvents;
    private collectAwsCloudTrail;
    private collectAzureActivityLogs;
    private collectGcpAuditLogs;
    private extractGcpResourceType;
    private generateRandomIP;
    private generateAwsRequestParameters;
    private generateAwsResponseElements;
    private generateAzureRequestParameters;
    private generateGcpRequestParameters;
    private getAwsResourceType;
    private getAzureResourceType;
    private getGcpResourceType;
    private generateAwsArn;
    private generateAzureResourceId;
    private generateGcpResourceName;
    private testCloudConnection;
    private convertToLogEvent;
    private mapCloudEventCategory;
    private generateCloudEventMessage;
    private updateCollectionMetrics;
}
export default CloudTrailSource;
//# sourceMappingURL=cloud-trail-source.d.ts.map