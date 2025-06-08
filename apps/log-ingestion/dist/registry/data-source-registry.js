import { DataSource } from '../types/data-source.types';
import WindowsEventSource from '../sources/windows-event-source';
import SyslogSource from '../sources/syslog-source';
import CloudTrailSource from '../sources/cloud-trail-source';
import NetworkSecuritySource from '../sources/network-security-source';
import CSVSource from '../sources/csv-source';
import XMLSource from '../sources/xml-source';
export class DefaultDataSourceRegistry {
    factories = new Map();
    constructor() {
        this.registerDefaultFactories();
    }
    register(type, factory) {
        this.factories.set(type, factory);
    }
    create(config) {
        const factory = this.factories.get(config.type);
        if (!factory) {
            throw new Error(`No factory registered for data source type: ${config.type}`);
        }
        return factory(config);
    }
    getSupportedTypes() {
        return Array.from(this.factories.keys());
    }
    registerDefaultFactories() {
        // Windows Event Log sources
        this.register('windows_event', (config) => new WindowsEventSource(config));
        // Syslog sources
        this.register('syslog', (config) => new SyslogSource(config));
        // File-based sources
        this.register('csv', (config) => new CSVSource(config));
        this.register('xml', (config) => new XMLSource(config));
        this.register('json', (config) => new CustomDataSource(config)); // JSON can use CSV adapter with custom parsing
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
    async start() {
        super.setStatus('active');
    }
    async stop() {
        super.setStatus('inactive');
    }
    async restart() {
        await this.stop();
        await this.start();
    }
    async collect() {
        return [];
    }
    async validateConfig() {
        return true;
    }
}
export default DefaultDataSourceRegistry;
//# sourceMappingURL=data-source-registry.js.map