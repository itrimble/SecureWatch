import IntegrationService from '../integration-service';
/**
 * Example demonstrating multi-source data integration capabilities
 */
async function demonstrateMultiSourceIntegration() {
    console.log('🚀 Starting Multi-Source Data Integration Demo\n');
    // Initialize the integration service
    const integrationService = new IntegrationService({
        enablePredefinedProfiles: true,
        outputDestinations: [
            {
                id: 'kafka-main',
                name: 'Main Kafka Topic',
                type: 'kafka',
                config: { topic: 'security-events', brokers: ['localhost:9092'] },
                enabled: true
            },
            {
                id: 'elasticsearch-main',
                name: 'Main Elasticsearch Index',
                type: 'elasticsearch',
                config: { index: 'security-logs', host: 'localhost:9200' },
                enabled: true
            }
        ]
    });
    // Set up event listeners
    setupEventListeners(integrationService);
    try {
        // Start the service
        await integrationService.start();
        console.log('✅ Integration service started successfully\n');
        // Demonstrate different data source configurations
        await demonstrateWindowsEventLogs(integrationService);
        await demonstrateSyslogSources(integrationService);
        await demonstrateCloudPlatforms(integrationService);
        await demonstrateNetworkSecurity(integrationService);
        // Show statistics
        await showServiceStatistics(integrationService);
        // Test health monitoring
        await demonstrateHealthMonitoring(integrationService);
    }
    catch (error) {
        console.error('❌ Demo failed:', error.message);
    }
    finally {
        // Cleanup
        await integrationService.stop();
        console.log('\n🔴 Integration service stopped');
    }
}
async function demonstrateWindowsEventLogs(service) {
    console.log('📊 Configuring Windows Event Log Sources...');
    const windowsConfigs = [
        {
            id: 'windows-dc01',
            name: 'Domain Controller 01',
            type: 'windows_event',
            enabled: true,
            collection: {
                method: 'api',
                config: {
                    servers: [
                        { hostname: 'dc01.company.local', username: 'admin', domain: 'COMPANY' }
                    ],
                    channels: ['Security', 'System', 'Application'],
                    eventIds: [4624, 4625, 4648, 4672],
                    polling: { intervalMs: 30000, maxEvents: 1000 }
                }
            },
            parsing: {
                format: 'json',
                fieldMappings: [],
                timestampField: 'timeCreated'
            },
            enrichment: { enabled: true, sources: [] },
            validation: { rules: [] },
            performance: { batchSize: 100, maxConcurrency: 5, bufferSize: 10000 }
        },
        {
            id: 'windows-workstations',
            name: 'Workstation Collection',
            type: 'windows_event',
            enabled: true,
            collection: {
                method: 'agent',
                config: {
                    servers: [
                        { hostname: 'ws01.company.local' },
                        { hostname: 'ws02.company.local' }
                    ],
                    channels: ['Security', 'System'],
                    polling: { intervalMs: 60000, maxEvents: 500 }
                }
            },
            parsing: {
                format: 'evtx',
                fieldMappings: [],
                timestampField: 'timeCreated'
            },
            enrichment: { enabled: false, sources: [] },
            validation: { rules: [] },
            performance: { batchSize: 50, maxConcurrency: 3, bufferSize: 5000 }
        }
    ];
    for (const config of windowsConfigs) {
        try {
            await service.registerDataSource(config);
            console.log(`  ✅ Registered: ${config.name}`);
        }
        catch (error) {
            console.log(`  ❌ Failed to register ${config.name}: ${error.message}`);
        }
    }
    console.log();
}
async function demonstrateSyslogSources(service) {
    console.log('📡 Configuring Syslog Sources...');
    const syslogConfigs = [
        {
            id: 'syslog-udp-514',
            name: 'Syslog UDP Receiver',
            type: 'syslog',
            enabled: true,
            collection: {
                method: 'stream',
                config: {
                    protocol: 'udp',
                    port: 514,
                    bindAddress: '0.0.0.0',
                    parsing: {
                        rfc: 'auto',
                        encoding: 'utf8',
                        maxMessageSize: 8192
                    }
                }
            },
            parsing: {
                format: 'syslog',
                fieldMappings: []
            },
            enrichment: { enabled: true, sources: [] },
            validation: { rules: [] },
            performance: { batchSize: 1000, maxConcurrency: 10, bufferSize: 50000 }
        },
        {
            id: 'syslog-tls-6514',
            name: 'Syslog TLS Receiver',
            type: 'syslog',
            enabled: true,
            collection: {
                method: 'stream',
                config: {
                    protocol: 'tls',
                    port: 6514,
                    bindAddress: '0.0.0.0',
                    tls: {
                        cert: '/path/to/cert.pem',
                        key: '/path/to/key.pem'
                    },
                    parsing: {
                        rfc: '5424',
                        encoding: 'utf8',
                        maxMessageSize: 16384
                    }
                }
            },
            parsing: {
                format: 'syslog',
                fieldMappings: []
            },
            enrichment: { enabled: true, sources: [] },
            validation: { rules: [] },
            performance: { batchSize: 500, maxConcurrency: 5, bufferSize: 25000 }
        }
    ];
    for (const config of syslogConfigs) {
        try {
            await service.registerDataSource(config);
            console.log(`  ✅ Registered: ${config.name}`);
        }
        catch (error) {
            console.log(`  ❌ Failed to register ${config.name}: ${error.message}`);
        }
    }
    console.log();
}
async function demonstrateCloudPlatforms(service) {
    console.log('☁️ Configuring Cloud Platform Sources...');
    const cloudConfigs = [
        {
            id: 'aws-cloudtrail',
            name: 'AWS CloudTrail',
            type: 'cloud_trail',
            enabled: true,
            collection: {
                method: 'api',
                config: {
                    provider: 'aws',
                    credentials: {
                        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
                        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
                        region: 'us-east-1'
                    },
                    polling: { intervalMs: 300000, maxEvents: 1000 }
                }
            },
            parsing: {
                format: 'json',
                fieldMappings: []
            },
            enrichment: { enabled: true, sources: [] },
            validation: { rules: [] },
            performance: { batchSize: 100, maxConcurrency: 3, bufferSize: 5000 }
        },
        {
            id: 'azure-activity',
            name: 'Azure Activity Logs',
            type: 'azure_activity',
            enabled: true,
            collection: {
                method: 'api',
                config: {
                    provider: 'azure',
                    credentials: {
                        subscriptionId: '12345678-1234-1234-1234-123456789012',
                        tenantId: '87654321-4321-4321-4321-210987654321',
                        clientId: 'abcdef12-3456-7890-abcd-ef1234567890',
                        clientSecret: 'secretvalue'
                    },
                    polling: { intervalMs: 300000, maxEvents: 1000 }
                }
            },
            parsing: {
                format: 'json',
                fieldMappings: []
            },
            enrichment: { enabled: true, sources: [] },
            validation: { rules: [] },
            performance: { batchSize: 100, maxConcurrency: 3, bufferSize: 5000 }
        },
        {
            id: 'gcp-audit',
            name: 'GCP Audit Logs',
            type: 'gcp_audit',
            enabled: true,
            collection: {
                method: 'api',
                config: {
                    provider: 'gcp',
                    credentials: {
                        projectId: 'my-project-id',
                        keyFile: '/path/to/service-account-key.json'
                    },
                    polling: { intervalMs: 300000, maxEvents: 1000 }
                }
            },
            parsing: {
                format: 'json',
                fieldMappings: []
            },
            enrichment: { enabled: true, sources: [] },
            validation: { rules: [] },
            performance: { batchSize: 100, maxConcurrency: 3, bufferSize: 5000 }
        }
    ];
    for (const config of cloudConfigs) {
        try {
            await service.registerDataSource(config);
            console.log(`  ✅ Registered: ${config.name}`);
        }
        catch (error) {
            console.log(`  ❌ Failed to register ${config.name}: ${error.message}`);
        }
    }
    console.log();
}
async function demonstrateNetworkSecurity(service) {
    console.log('🛡️ Configuring Network Security Sources...');
    const networkConfigs = [
        {
            id: 'palo-alto-fw01',
            name: 'Palo Alto Firewall 01',
            type: 'network_firewall',
            enabled: true,
            collection: {
                method: 'syslog',
                config: {
                    deviceType: 'firewall',
                    vendor: 'palo_alto',
                    collection: {
                        method: 'syslog',
                        endpoint: '10.1.1.100',
                        port: 514,
                        protocol: 'udp'
                    },
                    parsing: {
                        format: 'csv'
                    },
                    polling: { intervalMs: 30000, maxEvents: 2000 }
                }
            },
            parsing: {
                format: 'csv',
                fieldMappings: []
            },
            enrichment: { enabled: true, sources: [] },
            validation: { rules: [] },
            performance: { batchSize: 500, maxConcurrency: 5, bufferSize: 25000 }
        },
        {
            id: 'snort-ids',
            name: 'Snort IDS',
            type: 'network_ids',
            enabled: true,
            collection: {
                method: 'file',
                config: {
                    deviceType: 'ids',
                    vendor: 'snort',
                    collection: {
                        method: 'file',
                        endpoint: '/var/log/snort/alert.log'
                    },
                    parsing: {
                        format: 'custom',
                        customRegex: '\\[\\*\\*\\] \\[(.+?)\\] (.+?) \\[\\*\\*\\]'
                    },
                    polling: { intervalMs: 10000, maxEvents: 5000 }
                }
            },
            parsing: {
                format: 'custom',
                fieldMappings: []
            },
            enrichment: { enabled: true, sources: [] },
            validation: { rules: [] },
            performance: { batchSize: 1000, maxConcurrency: 3, bufferSize: 50000 }
        }
    ];
    for (const config of networkConfigs) {
        try {
            await service.registerDataSource(config);
            console.log(`  ✅ Registered: ${config.name}`);
        }
        catch (error) {
            console.log(`  ❌ Failed to register ${config.name}: ${error.message}`);
        }
    }
    console.log();
}
async function showServiceStatistics(service) {
    console.log('📈 Service Statistics:');
    const stats = service.getStats();
    console.log(`  Total Sources: ${stats.totalSources}`);
    console.log(`  Active Sources: ${stats.activeSources}`);
    console.log(`  Healthy Sources: ${stats.healthySources}`);
    console.log(`  Total Events: ${stats.totalEvents}`);
    console.log(`  Events/Second: ${stats.eventsPerSecond.toFixed(2)}`);
    console.log(`  Total Errors: ${stats.totalErrors}`);
    console.log(`  Uptime: ${stats.uptime}s`);
    console.log('\n📋 Data Source Details:');
    const sources = service.getDataSources();
    sources.forEach(source => {
        console.log(`  ${source.name} (${source.type}): ${source.status} - ${source.health.status}`);
    });
    console.log('\n🗺️ Available Mapping Profiles:');
    const profiles = service.getMappingProfiles();
    profiles.forEach(profile => {
        console.log(`  ${profile.name} (${profile.sourceType}): ${profile.description || 'No description'}`);
    });
    console.log();
}
async function demonstrateHealthMonitoring(service) {
    console.log('🏥 Health Monitoring Demo:');
    const serviceHealth = service.getServiceHealth();
    console.log(`  Service Status: ${serviceHealth.status}`);
    console.log(`  Service Details:`, serviceHealth.details);
    // Show individual source health
    const sources = service.getDataSources();
    console.log('\n  Individual Source Health:');
    sources.forEach(source => {
        const health = service.getDataSourceHealth(source.id);
        if (health) {
            console.log(`    ${source.name}:`);
            console.log(`      Status: ${health.status}`);
            console.log(`      Events/sec: ${health.metrics.eventsPerSecond}`);
            console.log(`      Error Count: ${health.errorCount}`);
            console.log(`      Last Check: ${health.lastCheck.toISOString()}`);
        }
    });
    console.log();
}
function setupEventListeners(service) {
    service.on('service:started', () => {
        console.log('🟢 Integration service started');
    });
    service.on('service:stopped', () => {
        console.log('🔴 Integration service stopped');
    });
    service.on('source:registered', (data) => {
        console.log(`📝 Source registered: ${data.sourceId}`);
    });
    service.on('source:registration_failed', (data) => {
        console.log(`❌ Source registration failed: ${data.sourceId} - ${data.error}`);
    });
    service.on('event:processed', (event) => {
        console.log(`📊 Event processed: ${event.id} from ${event.source.name}`);
    });
    service.on('processing:error', (data) => {
        console.log(`❌ Processing error: ${data.error}`);
    });
    service.on('output:error', (data) => {
        console.log(`❌ Output error for ${data.destinationId}: ${data.error}`);
    });
}
// Run the demonstration
if (require.main === module) {
    demonstrateMultiSourceIntegration().catch(console.error);
}
export { demonstrateMultiSourceIntegration };
//# sourceMappingURL=multi-source-integration-example.js.map