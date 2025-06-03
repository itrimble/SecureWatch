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

export class CloudTrailSource extends DataSource {
  private pollingInterval?: NodeJS.Timeout;
  private isCollecting = false;
  private lastCollectionTime?: Date;
  private cloudConfig: CloudTrailConfig;

  constructor(config: DataSourceConfig) {
    super(config);
    this.cloudConfig = this.parseCloudConfig(config.collection.config);
  }

  async start(): Promise<void> {
    if (this.status === 'active') {
      return;
    }

    try {
      await this.validateConfig();
      this.setStatus('active');
      this.startPolling();
    } catch (error) {
      this.setStatus('error');
      this.addHealthIssue('error', `Failed to start Cloud Trail source: ${error.message}`);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.status === 'inactive') {
      return;
    }

    this.stopPolling();
    this.setStatus('inactive');
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  async collect(): Promise<LogEvent[]> {
    if (this.isCollecting) {
      return [];
    }

    this.isCollecting = true;
    const events: LogEvent[] = [];

    try {
      const cloudEvents = await this.collectCloudEvents();
      events.push(...cloudEvents.map(event => this.convertToLogEvent(event)));
      
      this.updateCollectionMetrics(events.length);
      this.lastCollectionTime = new Date();
      
    } catch (error) {
      this.addHealthIssue('error', `Collection failed: ${error.message}`);
      throw error;
    } finally {
      this.isCollecting = false;
    }

    return events;
  }

  async validateConfig(): Promise<boolean> {
    const config = this.cloudConfig;

    // Validate provider
    if (!['aws', 'azure', 'gcp'].includes(config.provider)) {
      throw new Error('Provider must be aws, azure, or gcp');
    }

    // Validate credentials based on provider
    await this.validateCredentials(config);

    // Validate polling configuration
    if (!config.polling.intervalMs || config.polling.intervalMs < 60000) {
      throw new Error('Polling interval must be at least 60 seconds for cloud APIs');
    }

    if (!config.polling.maxEvents || config.polling.maxEvents < 1) {
      throw new Error('Max events must be at least 1');
    }

    // Test API connectivity
    const canConnect = await this.testCloudConnection();
    if (!canConnect) {
      throw new Error(`Cannot connect to ${config.provider} API`);
    }

    return true;
  }

  private parseCloudConfig(config: Record<string, any>): CloudTrailConfig {
    return {
      provider: config.provider || 'aws',
      credentials: config.credentials || {},
      collection: {
        method: config.collection?.method || 'api',
        config: config.collection?.config || {}
      },
      filtering: config.filtering,
      polling: {
        intervalMs: config.polling?.intervalMs || 300000, // 5 minutes
        maxEvents: config.polling?.maxEvents || 1000,
        lookbackMs: config.polling?.lookbackMs || 3600000 // 1 hour
      }
    };
  }

  private async validateCredentials(config: CloudTrailConfig): Promise<void> {
    switch (config.provider) {
      case 'aws':
        if (!config.credentials.accessKeyId || !config.credentials.secretAccessKey) {
          throw new Error('AWS credentials (accessKeyId, secretAccessKey) are required');
        }
        if (!config.credentials.region) {
          throw new Error('AWS region is required');
        }
        break;
        
      case 'azure':
        if (!config.credentials.subscriptionId || !config.credentials.tenantId || 
            !config.credentials.clientId || !config.credentials.clientSecret) {
          throw new Error('Azure credentials (subscriptionId, tenantId, clientId, clientSecret) are required');
        }
        break;
        
      case 'gcp':
        if (!config.credentials.projectId) {
          throw new Error('GCP projectId is required');
        }
        if (!config.credentials.keyFile) {
          throw new Error('GCP service account key file is required');
        }
        break;
    }
  }

  private startPolling(): void {
    this.pollingInterval = setInterval(async () => {
      try {
        const events = await this.collect();
        if (events.length > 0) {
          this.emit('events', events);
        }
      } catch (error) {
        this.addHealthIssue('error', `Polling error: ${error.message}`);
      }
    }, this.cloudConfig.polling.intervalMs);
  }

  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }
  }

  private async collectCloudEvents(): Promise<CloudEvent[]> {
    switch (this.cloudConfig.provider) {
      case 'aws':
        return this.collectAwsCloudTrail();
      case 'azure':
        return this.collectAzureActivityLogs();
      case 'gcp':
        return this.collectGcpAuditLogs();
      default:
        throw new Error(`Unsupported provider: ${this.cloudConfig.provider}`);
    }
  }

  private async collectAwsCloudTrail(): Promise<CloudEvent[]> {
    // Mock AWS CloudTrail API implementation
    const events: CloudEvent[] = [];
    
    // Generate mock CloudTrail events
    const eventNames = [
      'ConsoleLogin', 'AssumeRole', 'CreateUser', 'DeleteUser', 'PutBucketPolicy',
      'CreateInstance', 'TerminateInstances', 'CreateRole', 'AttachUserPolicy'
    ];
    
    const eventSources = [
      'signin.amazonaws.com', 'sts.amazonaws.com', 'iam.amazonaws.com', 
      's3.amazonaws.com', 'ec2.amazonaws.com'
    ];
    
    const numEvents = Math.floor(Math.random() * 20) + 1;
    
    for (let i = 0; i < numEvents; i++) {
      const eventName = eventNames[Math.floor(Math.random() * eventNames.length)];
      const eventSource = eventSources[Math.floor(Math.random() * eventSources.length)];
      
      const event: CloudEvent = {
        eventId: `aws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        eventName,
        eventSource,
        eventTime: new Date(Date.now() - Math.random() * this.cloudConfig.polling.lookbackMs),
        userName: `user-${Math.floor(Math.random() * 100)}`,
        userIdentity: {
          type: 'IAMUser',
          principalId: `AIDACKCEVSQ6C2EXAMPLE`,
          arn: `arn:aws:iam::123456789012:user/user-${Math.floor(Math.random() * 100)}`,
          accountId: '123456789012',
          userName: `user-${Math.floor(Math.random() * 100)}`
        },
        sourceIPAddress: this.generateRandomIP(),
        userAgent: 'AWS Internal',
        requestParameters: this.generateAwsRequestParameters(eventName),
        responseElements: this.generateAwsResponseElements(eventName),
        resources: [{
          accountId: '123456789012',
          type: this.getAwsResourceType(eventSource),
          ARN: this.generateAwsArn(eventSource)
        }],
        rawEvent: {}
      };
      
      // Add error information for some events
      if (Math.random() < 0.1) {
        event.errorCode = 'AccessDenied';
        event.errorMessage = 'User is not authorized to perform this operation';
      }
      
      event.rawEvent = { ...event };
      events.push(event);
    }
    
    return events;
  }

  private async collectAzureActivityLogs(): Promise<CloudEvent[]> {
    // Mock Azure Activity Logs implementation
    const events: CloudEvent[] = [];
    
    const operationNames = [
      'Microsoft.Authorization/roleAssignments/write',
      'Microsoft.Compute/virtualMachines/write',
      'Microsoft.Storage/storageAccounts/write',
      'Microsoft.Resources/deployments/write',
      'Microsoft.KeyVault/vaults/secrets/write'
    ];
    
    const numEvents = Math.floor(Math.random() * 15) + 1;
    
    for (let i = 0; i < numEvents; i++) {
      const operationName = operationNames[Math.floor(Math.random() * operationNames.length)];
      
      const event: CloudEvent = {
        eventId: `azure-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        eventName: operationName,
        eventSource: 'azure-activity',
        eventTime: new Date(Date.now() - Math.random() * this.cloudConfig.polling.lookbackMs),
        userName: `user${Math.floor(Math.random() * 100)}@contoso.com`,
        userIdentity: {
          claims: {
            name: `user${Math.floor(Math.random() * 100)}@contoso.com`,
            oid: `12345678-1234-1234-1234-123456789012`
          }
        },
        sourceIPAddress: this.generateRandomIP(),
        requestParameters: this.generateAzureRequestParameters(operationName),
        resources: [{
          type: this.getAzureResourceType(operationName),
          ARN: this.generateAzureResourceId(operationName)
        }],
        rawEvent: {}
      };
      
      if (Math.random() < 0.15) {
        event.errorCode = 'Forbidden';
        event.errorMessage = 'The client does not have authorization to perform action';
      }
      
      event.rawEvent = { ...event };
      events.push(event);
    }
    
    return events;
  }

  private async collectGcpAuditLogs(): Promise<CloudEvent[]> {
    // Mock GCP Audit Logs implementation
    const events: CloudEvent[] = [];
    
    const methodNames = [
      'compute.instances.insert',
      'compute.instances.delete',
      'storage.buckets.create',
      'iam.serviceAccounts.create',
      'logging.logEntries.list'
    ];
    
    const numEvents = Math.floor(Math.random() * 12) + 1;
    
    for (let i = 0; i < numEvents; i++) {
      const methodName = methodNames[Math.floor(Math.random() * methodNames.length)];
      
      const event: CloudEvent = {
        eventId: `gcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        eventName: methodName,
        eventSource: 'gcp-audit',
        eventTime: new Date(Date.now() - Math.random() * this.cloudConfig.polling.lookbackMs),
        userName: `user${Math.floor(Math.random() * 100)}@example.com`,
        userIdentity: {
          principalEmail: `user${Math.floor(Math.random() * 100)}@example.com`,
          principalSubject: `${Math.floor(Math.random() * 1000000000000000000)}`
        },
        sourceIPAddress: this.generateRandomIP(),
        requestParameters: this.generateGcpRequestParameters(methodName),
        resources: [{
          type: this.getGcpResourceType(methodName),
          ARN: this.generateGcpResourceName(methodName)
        }],
        rawEvent: {}
      };
      
      if (Math.random() < 0.12) {
        event.errorCode = 'PERMISSION_DENIED';
        event.errorMessage = 'The caller does not have permission';
      }
      
      event.rawEvent = { ...event };
      events.push(event);
    }
    
    return events;
  }

  private generateRandomIP(): string {
    return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  }

  private generateAwsRequestParameters(eventName: string): Record<string, any> {
    const paramMap: Record<string, Record<string, any>> = {
      'ConsoleLogin': { mfaUsed: 'No' },
      'CreateUser': { userName: `new-user-${Math.floor(Math.random() * 1000)}` },
      'CreateInstance': { 
        instanceType: 't3.micro',
        imageId: 'ami-12345678',
        keyName: 'my-key-pair'
      },
      'PutBucketPolicy': { bucketName: `my-bucket-${Math.floor(Math.random() * 1000)}` }
    };
    return paramMap[eventName] || {};
  }

  private generateAwsResponseElements(eventName: string): Record<string, any> {
    const responseMap: Record<string, Record<string, any>> = {
      'CreateUser': { user: { userId: `AIDACKCEVSQ6C2EXAMPLE` } },
      'CreateInstance': { 
        instancesSet: { 
          items: [{ instanceId: `i-${Math.random().toString(36).substr(2, 17)}` }] 
        }
      }
    };
    return responseMap[eventName] || {};
  }

  private generateAzureRequestParameters(operationName: string): Record<string, any> {
    const service = operationName.split('/')[0];
    return {
      serviceRequestId: `${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 4)}-${Math.random().toString(36).substr(2, 4)}`,
      statusCode: Math.random() < 0.9 ? 'Created' : 'BadRequest',
      serviceType: service
    };
  }

  private generateGcpRequestParameters(methodName: string): Record<string, any> {
    return {
      '@type': 'type.googleapis.com/google.cloud.audit.AuditLog',
      methodName,
      resourceName: this.generateGcpResourceName(methodName)
    };
  }

  private getAwsResourceType(eventSource: string): string {
    const typeMap: Record<string, string> = {
      'iam.amazonaws.com': 'AWS::IAM::User',
      's3.amazonaws.com': 'AWS::S3::Bucket',
      'ec2.amazonaws.com': 'AWS::EC2::Instance',
      'sts.amazonaws.com': 'AWS::STS::Role'
    };
    return typeMap[eventSource] || 'AWS::Unknown::Resource';
  }

  private getAzureResourceType(operationName: string): string {
    if (operationName.includes('virtualMachines')) return 'Microsoft.Compute/virtualMachines';
    if (operationName.includes('storageAccounts')) return 'Microsoft.Storage/storageAccounts';
    if (operationName.includes('roleAssignments')) return 'Microsoft.Authorization/roleAssignments';
    return 'Microsoft.Unknown/resources';
  }

  private getGcpResourceType(methodName: string): string {
    if (methodName.includes('instances')) return 'gce_instance';
    if (methodName.includes('buckets')) return 'gcs_bucket';
    if (methodName.includes('serviceAccounts')) return 'service_account';
    return 'gcp_resource';
  }

  private generateAwsArn(eventSource: string): string {
    const arnMap: Record<string, string> = {
      'iam.amazonaws.com': `arn:aws:iam::123456789012:user/user-${Math.floor(Math.random() * 100)}`,
      's3.amazonaws.com': `arn:aws:s3:::bucket-${Math.floor(Math.random() * 1000)}`,
      'ec2.amazonaws.com': `arn:aws:ec2:us-east-1:123456789012:instance/i-${Math.random().toString(36).substr(2, 17)}`
    };
    return arnMap[eventSource] || `arn:aws:unknown:::resource-${Math.floor(Math.random() * 1000)}`;
  }

  private generateAzureResourceId(operationName: string): string {
    const subscriptionId = '12345678-1234-1234-1234-123456789012';
    const resourceGroup = 'rg-example';
    
    if (operationName.includes('virtualMachines')) {
      return `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Compute/virtualMachines/vm-${Math.floor(Math.random() * 100)}`;
    }
    if (operationName.includes('storageAccounts')) {
      return `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Storage/storageAccounts/storage${Math.floor(Math.random() * 1000)}`;
    }
    return `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Unknown/resources/resource${Math.floor(Math.random() * 100)}`;
  }

  private generateGcpResourceName(methodName: string): string {
    const projectId = this.cloudConfig.credentials.projectId || 'example-project';
    
    if (methodName.includes('instances')) {
      return `projects/${projectId}/zones/us-central1-a/instances/instance-${Math.floor(Math.random() * 100)}`;
    }
    if (methodName.includes('buckets')) {
      return `projects/_/buckets/bucket-${Math.floor(Math.random() * 1000)}`;
    }
    return `projects/${projectId}/serviceAccounts/service-account-${Math.floor(Math.random() * 100)}@${projectId}.iam.gserviceaccount.com`;
  }

  private async testCloudConnection(): Promise<boolean> {
    // Mock connection test
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      return Math.random() > 0.05; // 95% success rate
    } catch {
      return false;
    }
  }

  private convertToLogEvent(cloudEvent: CloudEvent): LogEvent {
    return {
      id: cloudEvent.eventId,
      timestamp: cloudEvent.eventTime,
      source: {
        type: 'cloud_trail',
        name: `${this.cloudConfig.provider}-audit`,
        version: '1.0'
      },
      event: {
        id: cloudEvent.eventName,
        category: this.mapCloudEventCategory(cloudEvent.eventName),
        type: cloudEvent.errorCode ? 'error' : 'info',
        severity: cloudEvent.errorCode ? 2 : 4,
        action: cloudEvent.eventName,
        outcome: cloudEvent.errorCode ? 'failure' : 'success'
      },
      host: {
        name: this.cloudConfig.provider,
        hostname: cloudEvent.eventSource
      },
      user: cloudEvent.userName ? {
        name: cloudEvent.userName,
        id: cloudEvent.userIdentity?.principalId || cloudEvent.userIdentity?.oid
      } : undefined,
      source_ip: cloudEvent.sourceIPAddress,
      user_agent: cloudEvent.userAgent,
      message: this.generateCloudEventMessage(cloudEvent),
      labels: {
        provider: this.cloudConfig.provider,
        event_source: cloudEvent.eventSource,
        error_code: cloudEvent.errorCode,
        collection_method: this.cloudConfig.collection.method
      },
      metadata: {
        raw: cloudEvent.rawEvent,
        parsed: {
          requestParameters: cloudEvent.requestParameters,
          responseElements: cloudEvent.responseElements,
          resources: cloudEvent.resources,
          userIdentity: cloudEvent.userIdentity
        },
        enriched: {}
      }
    };
  }

  private mapCloudEventCategory(eventName: string): string {
    if (eventName.toLowerCase().includes('login') || eventName.toLowerCase().includes('assume')) {
      return 'authentication';
    }
    if (eventName.toLowerCase().includes('user') || eventName.toLowerCase().includes('role') || 
        eventName.toLowerCase().includes('policy')) {
      return 'iam';
    }
    if (eventName.toLowerCase().includes('instance') || eventName.toLowerCase().includes('vm')) {
      return 'host';
    }
    if (eventName.toLowerCase().includes('bucket') || eventName.toLowerCase().includes('storage')) {
      return 'file';
    }
    return 'cloud';
  }

  private generateCloudEventMessage(event: CloudEvent): string {
    const provider = this.cloudConfig.provider.toUpperCase();
    const outcome = event.errorCode ? 'failed' : 'succeeded';
    const user = event.userName || 'unknown user';
    
    return `${provider} API call ${event.eventName} ${outcome} for ${user} from ${event.sourceIPAddress}`;
  }

  private updateCollectionMetrics(eventCount: number): void {
    const metrics = this.getMetrics();
    const health = this.getHealth();
    
    metrics.statistics.totalEvents += eventCount;
    metrics.statistics.eventsToday += eventCount;
    metrics.statistics.lastEventTime = eventCount > 0 ? new Date() : metrics.statistics.lastEventTime;
    
    health.metrics.eventsPerSecond = eventCount / (this.cloudConfig.polling.intervalMs / 1000);
    health.lastCheck = new Date();
  }
}

export default CloudTrailSource;