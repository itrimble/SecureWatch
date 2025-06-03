import { DataSource, DataSourceConfig, DataSourceType, DataSourceRegistry } from '../types/data-source.types';
import WindowsEventSource from '../sources/windows-event-source';
import SyslogSource from '../sources/syslog-source';
import CloudTrailSource from '../sources/cloud-trail-source';
import NetworkSecuritySource from '../sources/network-security-source';

export class DefaultDataSourceRegistry implements DataSourceRegistry {
  private factories: Map<DataSourceType, (config: DataSourceConfig) => DataSource> = new Map();

  constructor() {
    this.registerDefaultFactories();
  }

  register(type: DataSourceType, factory: (config: DataSourceConfig) => DataSource): void {
    this.factories.set(type, factory);
  }

  create(config: DataSourceConfig): DataSource {
    const factory = this.factories.get(config.type);
    if (!factory) {
      throw new Error(`No factory registered for data source type: ${config.type}`);
    }

    return factory(config);
  }

  getSupportedTypes(): DataSourceType[] {
    return Array.from(this.factories.keys());
  }

  private registerDefaultFactories(): void {
    // Windows Event Log sources
    this.register('windows_event', (config) => new WindowsEventSource(config));

    // Syslog sources
    this.register('syslog', (config) => new SyslogSource(config));

    // Cloud platform sources
    this.register('cloud_trail', (config) => new CloudTrailSource(config));
    this.register('azure_activity', (config) => new CloudTrailSource(config));
    this.register('gcp_audit', (config) => new CloudTrailSource(config));

    // Network security sources
    this.register('network_firewall', (config) => new NetworkSecuritySource(config));
    this.register('network_ids', (config) => new NetworkSecuritySource(config));
    this.register('network_flow', (config) => new NetworkSecuritySource(config));

    // Endpoint security sources - will be implemented next
    this.register('endpoint_edr', (config) => new CustomDataSource(config));
    this.register('endpoint_antivirus', (config) => new CustomDataSource(config));

    // Application sources - will be implemented next
    this.register('application_web', (config) => new CustomDataSource(config));
    this.register('application_database', (config) => new CustomDataSource(config));
    this.register('application_custom', (config) => new CustomDataSource(config));

    // Generic custom source
    this.register('custom', (config) => new CustomDataSource(config));
  }
}

// Placeholder implementation for custom data source
export class CustomDataSource extends DataSource {
  async start(): Promise<void> {
    super.setStatus('active');
  }

  async stop(): Promise<void> {
    super.setStatus('inactive');
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  async collect(): Promise<any[]> {
    return [];
  }

  async validateConfig(): Promise<boolean> {
    return true;
  }
}

export default DefaultDataSourceRegistry;