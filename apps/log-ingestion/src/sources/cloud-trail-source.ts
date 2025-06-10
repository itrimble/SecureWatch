import { DataSource, DataSourceConfig } from '../types/data-source.types';
import { LogEvent } from '../types/log-event.types';
import { CloudTrailClient, LookupEventsCommand, LookupEventsCommandInput } from '@aws-sdk/client-cloudtrail';
import { CloudWatchLogsClient, StartQueryCommand, GetQueryResultsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { DefaultAzureCredential } from '@azure/identity';
import { LogsQueryClient } from '@azure/monitor-query';
import { Logging } from '@google-cloud/logging';

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
  
  // Cloud SDK clients
  private awsCloudTrailClient?: CloudTrailClient;
  private awsCloudWatchLogsClient?: CloudWatchLogsClient;
  private azureLogsClient?: LogsQueryClient;
  private gcpLoggingClient?: Logging;

  constructor(config: DataSourceConfig) {
    super(config);
    this.cloudConfig = this.parseCloudConfig(config.collection.config);
    this.initializeCloudClients();
  }

  private initializeCloudClients(): void {
    const { provider, credentials } = this.cloudConfig;

    switch (provider) {
      case 'aws':
        this.awsCloudTrailClient = new CloudTrailClient({
          region: credentials.region,
          credentials: {
            accessKeyId: credentials.accessKeyId!,
            secretAccessKey: credentials.secretAccessKey!
          }
        });
        this.awsCloudWatchLogsClient = new CloudWatchLogsClient({
          region: credentials.region,
          credentials: {
            accessKeyId: credentials.accessKeyId!,
            secretAccessKey: credentials.secretAccessKey!
          }
        });
        break;

      case 'azure':
        const azureCredential = new DefaultAzureCredential();
        this.azureLogsClient = new LogsQueryClient(azureCredential);
        break;

      case 'gcp':
        this.gcpLoggingClient = new Logging({
          projectId: credentials.projectId,
          keyFilename: credentials.keyFile
        });
        break;
    }
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
    if (!this.awsCloudTrailClient) {
      throw new Error('AWS CloudTrail client not initialized');
    }

    const events: CloudEvent[] = [];
    const startTime = new Date(Date.now() - this.cloudConfig.polling.lookbackMs);
    const endTime = new Date();

    try {
      const input: LookupEventsCommandInput = {
        StartTime: startTime,
        EndTime: endTime,
        MaxItems: this.cloudConfig.polling.maxEvents
      };

      // Apply filtering if configured
      if (this.cloudConfig.filtering) {
        if (this.cloudConfig.filtering.eventNames?.length) {
          input.LookupAttributes = [{
            AttributeKey: 'EventName',
            AttributeValue: this.cloudConfig.filtering.eventNames[0] // AWS API limitation: one filter at a time
          }];
        }
        if (this.cloudConfig.filtering.userNames?.length) {
          input.LookupAttributes = [{
            AttributeKey: 'Username',
            AttributeValue: this.cloudConfig.filtering.userNames[0]
          }];
        }
      }

      const command = new LookupEventsCommand(input);
      const response = await this.awsCloudTrailClient.send(command);

      if (response.Events) {
        for (const awsEvent of response.Events) {
          const cloudEvent: CloudEvent = {
            eventId: awsEvent.EventId || `aws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            eventName: awsEvent.EventName || 'UnknownEvent',
            eventSource: awsEvent.EventSource || 'unknown.amazonaws.com',
            eventTime: awsEvent.EventTime || new Date(),
            userName: awsEvent.Username,
            userIdentity: awsEvent.CloudTrailEvent ? 
              JSON.parse(awsEvent.CloudTrailEvent).userIdentity || {} : {},
            sourceIPAddress: awsEvent.CloudTrailEvent ? 
              JSON.parse(awsEvent.CloudTrailEvent).sourceIPAddress : undefined,
            userAgent: awsEvent.CloudTrailEvent ? 
              JSON.parse(awsEvent.CloudTrailEvent).userAgent : undefined,
            requestParameters: awsEvent.CloudTrailEvent ? 
              JSON.parse(awsEvent.CloudTrailEvent).requestParameters || {} : {},
            responseElements: awsEvent.CloudTrailEvent ? 
              JSON.parse(awsEvent.CloudTrailEvent).responseElements || {} : {},
            resources: awsEvent.Resources?.map(resource => ({
              accountId: resource.ResourceName?.split(':')[4],
              type: resource.ResourceType,
              ARN: resource.ResourceName
            })) || [],
            errorCode: awsEvent.CloudTrailEvent ? 
              JSON.parse(awsEvent.CloudTrailEvent).errorCode : undefined,
            errorMessage: awsEvent.CloudTrailEvent ? 
              JSON.parse(awsEvent.CloudTrailEvent).errorMessage : undefined,
            rawEvent: awsEvent.CloudTrailEvent ? JSON.parse(awsEvent.CloudTrailEvent) : {}
          };

          events.push(cloudEvent);
        }
      }
    } catch (error) {
      console.error('Error collecting AWS CloudTrail events:', error);
      throw new Error(`AWS CloudTrail collection failed: ${error.message}`);
    }

    return events;
  }

  private async collectAzureActivityLogs(): Promise<CloudEvent[]> {
    if (!this.azureLogsClient) {
      throw new Error('Azure Logs client not initialized');
    }

    const events: CloudEvent[] = [];
    const startTime = new Date(Date.now() - this.cloudConfig.polling.lookbackMs);
    const endTime = new Date();

    try {
      // KQL query for Azure Activity Logs
      let kqlQuery = `AzureActivity
        | where TimeGenerated between(datetime('${startTime.toISOString()}') .. datetime('${endTime.toISOString()}'))
        | limit ${this.cloudConfig.polling.maxEvents}`;

      // Apply filtering if configured
      if (this.cloudConfig.filtering) {
        if (this.cloudConfig.filtering.eventNames?.length) {
          const eventNames = this.cloudConfig.filtering.eventNames.map(name => `"${name}"`).join(', ');
          kqlQuery += `\n| where OperationName in (${eventNames})`;
        }
        if (this.cloudConfig.filtering.userNames?.length) {
          const userNames = this.cloudConfig.filtering.userNames.map(name => `"${name}"`).join(', ');
          kqlQuery += `\n| where Caller in (${userNames})`;
        }
        if (this.cloudConfig.filtering.sourceIpAddresses?.length) {
          const ips = this.cloudConfig.filtering.sourceIpAddresses.map(ip => `"${ip}"`).join(', ');
          kqlQuery += `\n| where CallerIpAddress in (${ips})`;
        }
      }

      kqlQuery += `\n| order by TimeGenerated desc`;

      const response = await this.azureLogsClient.queryWorkspace(
        this.cloudConfig.credentials.subscriptionId!,
        kqlQuery,
        { duration: 'PT1H' } // 1 hour timespan
      );

      if (response.tables && response.tables.length > 0) {
        const table = response.tables[0];
        const rows = table.rows;

        for (const row of rows) {
          // Map Azure Activity Log columns to CloudEvent
          const rowData: any = {};
          table.columns.forEach((column, index) => {
            rowData[column.name] = row[index];
          });

          const cloudEvent: CloudEvent = {
            eventId: rowData.CorrelationId || `azure-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            eventName: rowData.OperationName || 'UnknownOperation',
            eventSource: 'azure-activity',
            eventTime: new Date(rowData.TimeGenerated || new Date()),
            userName: rowData.Caller,
            userIdentity: {
              claims: {
                name: rowData.Caller,
                oid: rowData.CallerId
              },
              authorization: rowData.Authorization
            },
            sourceIPAddress: rowData.CallerIpAddress,
            requestParameters: {
              resourceProvider: rowData.ResourceProvider,
              resourceType: rowData.ResourceType,
              operationVersion: rowData.OperationVersion,
              subscriptionId: rowData.SubscriptionId,
              resourceGroup: rowData.ResourceGroup
            },
            responseElements: {
              status: rowData.ActivityStatus,
              subStatus: rowData.ActivitySubstatus,
              httpStatusCode: rowData.HTTPRequest
            },
            resources: [{
              type: rowData.ResourceType,
              ARN: rowData.ResourceId
            }],
            errorCode: rowData.ActivityStatus === 'Failed' ? 'ActivityFailed' : undefined,
            errorMessage: rowData.ActivitySubstatus,
            rawEvent: rowData
          };

          events.push(cloudEvent);
        }
      }
    } catch (error) {
      console.error('Error collecting Azure Activity Logs:', error);
      throw new Error(`Azure Activity Logs collection failed: ${error.message}`);
    }

    return events;
  }

  private async collectGcpAuditLogs(): Promise<CloudEvent[]> {
    if (!this.gcpLoggingClient) {
      throw new Error('GCP Logging client not initialized');
    }

    const events: CloudEvent[] = [];
    const startTime = new Date(Date.now() - this.cloudConfig.polling.lookbackMs);
    const endTime = new Date();

    try {
      // Build filter for Cloud Audit Logs
      let filter = `protoPayload.@type="type.googleapis.com/google.cloud.audit.AuditLog"
        timestamp >= "${startTime.toISOString()}"
        timestamp <= "${endTime.toISOString()}"`;

      // Apply filtering if configured
      if (this.cloudConfig.filtering) {
        if (this.cloudConfig.filtering.eventNames?.length) {
          const methodNames = this.cloudConfig.filtering.eventNames.map(name => `"${name}"`).join(' OR protoPayload.methodName=');
          filter += `\n(protoPayload.methodName=${methodNames})`;
        }
        if (this.cloudConfig.filtering.userNames?.length) {
          const userNames = this.cloudConfig.filtering.userNames.map(name => `"${name}"`).join(' OR protoPayload.authenticationInfo.principalEmail=');
          filter += `\n(protoPayload.authenticationInfo.principalEmail=${userNames})`;
        }
        if (this.cloudConfig.filtering.sourceIpAddresses?.length) {
          const ips = this.cloudConfig.filtering.sourceIpAddresses.map(ip => `"${ip}"`).join(' OR protoPayload.requestMetadata.callerIp=');
          filter += `\n(protoPayload.requestMetadata.callerIp=${ips})`;
        }
      }

      // Query logs using the Logging client
      const [entries] = await this.gcpLoggingClient.getEntries({
        filter,
        pageSize: this.cloudConfig.polling.maxEvents,
        orderBy: 'timestamp desc'
      });

      for (const entry of entries) {
        const auditLog = entry.data as any;
        const metadata = entry.metadata as any;

        const cloudEvent: CloudEvent = {
          eventId: metadata.insertId || `gcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          eventName: auditLog.methodName || 'UnknownMethod',
          eventSource: 'gcp-audit',
          eventTime: new Date(metadata.timestamp || new Date()),
          userName: auditLog.authenticationInfo?.principalEmail,
          userIdentity: {
            principalEmail: auditLog.authenticationInfo?.principalEmail,
            principalSubject: auditLog.authenticationInfo?.principalSubject,
            serviceAccount: auditLog.authenticationInfo?.serviceAccountKeyName
          },
          sourceIPAddress: auditLog.requestMetadata?.callerIp,
          userAgent: auditLog.requestMetadata?.callerSuppliedUserAgent,
          requestParameters: {
            serviceName: auditLog.serviceName,
            methodName: auditLog.methodName,
            resourceName: auditLog.resourceName,
            numResponseItems: auditLog.numResponseItems,
            request: auditLog.request
          },
          responseElements: {
            response: auditLog.response,
            status: auditLog.status
          },
          resources: [{
            type: this.extractGcpResourceType(auditLog.resourceName),
            ARN: auditLog.resourceName
          }],
          errorCode: auditLog.status?.code ? `ERROR_${auditLog.status.code}` : undefined,
          errorMessage: auditLog.status?.message,
          rawEvent: {
            auditLog,
            metadata,
            resource: entry.resource
          }
        };

        events.push(cloudEvent);
      }
    } catch (error) {
      console.error('Error collecting GCP Audit Logs:', error);
      throw new Error(`GCP Audit Logs collection failed: ${error.message}`);
    }

    return events;
  }

  private extractGcpResourceType(resourceName?: string): string {
    if (!resourceName) return 'gcp_resource';
    
    if (resourceName.includes('/instances/')) return 'gce_instance';
    if (resourceName.includes('/buckets/')) return 'gcs_bucket';
    if (resourceName.includes('/serviceAccounts/')) return 'service_account';
    if (resourceName.includes('/functions/')) return 'cloud_function';
    if (resourceName.includes('/clusters/')) return 'gke_cluster';
    
    return 'gcp_resource';
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
    try {
      switch (this.cloudConfig.provider) {
        case 'aws':
          if (!this.awsCloudTrailClient) return false;
          // Test AWS connection with a simple describe call
          const testCommand = new LookupEventsCommand({
            MaxItems: 1,
            StartTime: new Date(Date.now() - 60000), // Last minute
            EndTime: new Date()
          });
          await this.awsCloudTrailClient.send(testCommand);
          return true;

        case 'azure':
          if (!this.azureLogsClient) return false;
          // Test Azure connection with a simple KQL query
          const testQuery = 'AzureActivity | limit 1';
          await this.azureLogsClient.queryWorkspace(
            this.cloudConfig.credentials.subscriptionId!,
            testQuery,
            { duration: 'PT1M' }
          );
          return true;

        case 'gcp':
          if (!this.gcpLoggingClient) return false;
          // Test GCP connection by listing entries
          const testFilter = 'timestamp >= "' + new Date(Date.now() - 60000).toISOString() + '"';
          await this.gcpLoggingClient.getEntries({
            filter: testFilter,
            pageSize: 1
          });
          return true;

        default:
          return false;
      }
    } catch (error) {
      console.error(`Cloud connection test failed for ${this.cloudConfig.provider}:`, error.message);
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