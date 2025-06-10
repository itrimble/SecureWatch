import { SerializationManager, SerializationFormat } from './serialization-manager';
import { LogSource, LogSeverity, LogCategory } from '../types/log-event.types';
import { performance } from 'perf_hooks';
export class SerializationBenchmark {
    serializationManager;
    sampleEvents = new Map();
    constructor() {
        this.serializationManager = new SerializationManager({
            performanceMetrics: true,
            compressionEnabled: true,
            schemaValidation: true
        });
    }
    async initialize() {
        await this.serializationManager.initialize();
        this.generateSampleEvents();
    }
    generateSampleEvents() {
        // Small event (~1KB)
        this.sampleEvents.set('small', {
            id: 'evt-001',
            timestamp: new Date(),
            source: LogSource.WINDOWS_EVENT_LOG,
            severity: LogSeverity.INFO,
            category: LogCategory.AUTHENTICATION,
            message: 'User login successful',
            fields: {
                eventId: '4624',
                userId: 'DOMAIN\\user001',
                computer: 'WORKSTATION-01'
            },
            tags: ['authentication', 'success'],
            host: {
                hostname: 'WORKSTATION-01',
                ip: ['192.168.1.100'],
                os: {
                    name: 'Windows',
                    version: '10.0.19042',
                    architecture: 'x64'
                }
            },
            metadata: {
                ingestionId: 'ing-001',
                ingestionTime: new Date(),
                collector: 'winlogbeat',
                collectorVersion: '8.12.0',
                organizationId: 'org-001',
                retention: {
                    tier: 'hot',
                    days: 7,
                    compressed: true,
                    encrypted: false
                }
            }
        });
        // Medium event (~5KB)
        this.sampleEvents.set('medium', {
            ...this.sampleEvents.get('small'),
            id: 'evt-002',
            message: 'Process execution detected with command line arguments and full process tree information',
            fields: {
                ...this.sampleEvents.get('small').fields,
                commandLine: 'C:\\Windows\\System32\\svchost.exe -k NetworkService -p -s Themes',
                parentCommandLine: 'C:\\Windows\\System32\\services.exe',
                processHash: 'a1b2c3d4e5f6789012345678901234567890abcd',
                parentProcessHash: 'xyz789abc123def456789012345678901234abcd',
                userSid: 'S-1-5-21-123456789-987654321-111111111-1001',
                logonType: '3',
                authenticationPackage: 'NTLM',
                workstationName: 'WORKSTATION-01'
            },
            process: {
                pid: 1234,
                name: 'svchost.exe',
                path: 'C:\\Windows\\System32\\svchost.exe',
                commandLine: 'C:\\Windows\\System32\\svchost.exe -k NetworkService -p -s Themes',
                parentPid: 568,
                parentName: 'services.exe',
                user: 'NT AUTHORITY\\NETWORK SERVICE',
                startTime: new Date(Date.now() - 3600000),
                hash: {
                    md5: 'a1b2c3d4e5f6789012345678901234567890',
                    sha1: 'abcdef1234567890abcdef1234567890abcdef12',
                    sha256: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567890'
                }
            },
            user: {
                username: 'NETWORK SERVICE',
                userId: 'S-1-5-20',
                domain: 'NT AUTHORITY',
                groups: ['NT AUTHORITY\\SERVICE', 'BUILTIN\\Users'],
                privileges: ['SeChangeNotifyPrivilege', 'SeCreateGlobalPrivilege']
            }
        });
        // Large event (~20KB)
        const largeFields = {
            ...this.sampleEvents.get('medium').fields
        };
        // Add many dynamic fields to simulate complex log events
        for (let i = 0; i < 100; i++) {
            largeFields[`customField${i}`] = `value${i}_${'x'.repeat(50)}`;
            largeFields[`metric${i}`] = Math.random() * 1000;
            largeFields[`timestamp${i}`] = new Date(Date.now() - Math.random() * 86400000).toISOString();
        }
        this.sampleEvents.set('large', {
            ...this.sampleEvents.get('medium'),
            id: 'evt-003',
            message: 'Complex security event with extensive metadata, network information, file operations, and detailed forensic data for comprehensive analysis',
            fields: largeFields,
            tags: ['security', 'forensics', 'detailed', 'network', 'file-operations', 'process-monitoring', 'user-activity'],
            network: {
                protocol: 'TCP',
                sourceIp: '192.168.1.100',
                sourcePort: 49152,
                destinationIp: '10.0.0.50',
                destinationPort: 443,
                direction: 'outbound',
                bytesIn: 1024000,
                bytesOut: 2048000,
                packetsIn: 1500,
                packetsOut: 3000
            },
            file: {
                path: 'C:\\Users\\user001\\Documents\\sensitive_data.xlsx',
                name: 'sensitive_data.xlsx',
                extension: '.xlsx',
                size: 2097152,
                hash: {
                    md5: 'f1e2d3c4b5a6978564738291047362514',
                    sha1: 'abcdef1234567890abcdef1234567890abcdef12',
                    sha256: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567890'
                },
                permissions: 'rw-rw----',
                owner: 'DOMAIN\\user001',
                createdAt: new Date(Date.now() - 86400000),
                modifiedAt: new Date(Date.now() - 3600000),
                accessedAt: new Date()
            }
        });
        // Extra large event (~100KB)
        const xlargeFields = { ...largeFields };
        // Add even more fields and nested data
        for (let i = 0; i < 500; i++) {
            xlargeFields[`bigField${i}`] = 'A'.repeat(200); // 200 char strings
            xlargeFields[`nestedObject${i}`] = {
                id: i,
                data: 'X'.repeat(100),
                timestamp: new Date().toISOString(),
                metadata: {
                    source: `system${i}`,
                    version: `v${i}.0.0`,
                    tags: [`tag${i}`, `category${i % 10}`, `type${i % 5}`]
                }
            };
        }
        this.sampleEvents.set('xlarge', {
            ...this.sampleEvents.get('large'),
            id: 'evt-004',
            message: 'Extremely large security event with comprehensive forensic data, full network capture details, extensive file system operations, complete process tree, user session information, and detailed system state for advanced threat hunting and incident response analysis',
            fields: xlargeFields,
            rawEvent: JSON.stringify(xlargeFields) // Include raw event data
        });
    }
    async runBenchmark(config) {
        console.log(`Starting serialization benchmark:`);
        console.log(`- Event size: ${config.eventSize}`);
        console.log(`- Iterations: ${config.iterations}`);
        console.log(`- Formats: ${config.formats.join(', ')}`);
        console.log(`- Warmup iterations: ${config.warmupIterations}`);
        const results = new Map();
        const sampleEvent = this.sampleEvents.get(config.eventSize);
        for (const format of config.formats) {
            console.log(`\nBenchmarking ${format}...`);
            // Warmup phase
            console.log(`Warmup phase (${config.warmupIterations} iterations)...`);
            for (let i = 0; i < config.warmupIterations; i++) {
                try {
                    const serialized = await this.serializationManager.serialize(sampleEvent, format, 'NormalizedLogEvent');
                    await this.serializationManager.deserialize(serialized.data, format, 'NormalizedLogEvent');
                }
                catch (error) {
                    // Ignore warmup errors
                }
            }
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
            // Actual benchmark
            const startMemory = process.memoryUsage().heapUsed;
            const serializationTimes = [];
            const deserializationTimes = [];
            const serializedSizes = [];
            const totalTimes = [];
            let errorCount = 0;
            console.log(`Running benchmark (${config.iterations} iterations)...`);
            for (let i = 0; i < config.iterations; i++) {
                try {
                    // Serialization benchmark
                    const serStart = performance.now();
                    const serialized = await this.serializationManager.serialize(sampleEvent, format, 'NormalizedLogEvent');
                    const serEnd = performance.now();
                    serializationTimes.push(serEnd - serStart);
                    serializedSizes.push(serialized.size);
                    // Deserialization benchmark
                    const deserStart = performance.now();
                    await this.serializationManager.deserialize(serialized.data, format, 'NormalizedLogEvent');
                    const deserEnd = performance.now();
                    deserializationTimes.push(deserEnd - deserStart);
                    totalTimes.push((serEnd - serStart) + (deserEnd - deserStart));
                }
                catch (error) {
                    errorCount++;
                    console.error(`Iteration ${i} failed:`, error.message);
                }
                // Progress indicator
                if ((i + 1) % Math.max(1, Math.floor(config.iterations / 10)) === 0) {
                    const progress = Math.round(((i + 1) / config.iterations) * 100);
                    process.stdout.write(`\r${progress}% complete`);
                }
            }
            const endMemory = process.memoryUsage().heapUsed;
            console.log(''); // New line after progress
            // Calculate statistics
            const avgSerTime = serializationTimes.reduce((a, b) => a + b, 0) / serializationTimes.length;
            const avgDeserTime = deserializationTimes.reduce((a, b) => a + b, 0) / deserializationTimes.length;
            const avgTotalTime = totalTimes.reduce((a, b) => a + b, 0) / totalTimes.length;
            const avgSerializedSize = serializedSizes.reduce((a, b) => a + b, 0) / serializedSizes.length;
            const originalSize = JSON.stringify(sampleEvent).length;
            const compressionRatio = avgSerializedSize / originalSize;
            const throughput = 1000 / avgTotalTime; // ops per second
            const memoryUsage = (endMemory - startMemory) / (1024 * 1024); // MB
            const result = {
                format,
                avgSerializationTimeMs: avgSerTime,
                avgDeserializationTimeMs: avgDeserTime,
                avgTotalTimeMs: avgTotalTime,
                throughputOpsPerSec: throughput,
                avgSerializedSizeBytes: avgSerializedSize,
                compressionRatio,
                memoryUsageMB: memoryUsage,
                errorCount
            };
            results.set(format, result);
            console.log(`${format} Results:`);
            console.log(`  Avg Serialization: ${avgSerTime.toFixed(3)}ms`);
            console.log(`  Avg Deserialization: ${avgDeserTime.toFixed(3)}ms`);
            console.log(`  Avg Total: ${avgTotalTime.toFixed(3)}ms`);
            console.log(`  Throughput: ${throughput.toFixed(0)} ops/sec`);
            console.log(`  Avg Size: ${(avgSerializedSize / 1024).toFixed(2)}KB`);
            console.log(`  Compression Ratio: ${compressionRatio.toFixed(3)}`);
            console.log(`  Memory Usage: ${memoryUsage.toFixed(2)}MB`);
            console.log(`  Errors: ${errorCount}`);
        }
        return results;
    }
    printComparison(results) {
        console.log('\n=== PERFORMANCE COMPARISON ===');
        console.log('Format'.padEnd(12) +
            'Ser(ms)'.padEnd(10) +
            'Deser(ms)'.padEnd(12) +
            'Total(ms)'.padEnd(12) +
            'Throughput'.padEnd(12) +
            'Size(KB)'.padEnd(10) +
            'Compression'.padEnd(12) +
            'Memory(MB)'.padEnd(12) +
            'Errors');
        console.log('-'.repeat(120));
        const sortedResults = Array.from(results.entries())
            .sort((a, b) => b[1].throughputOpsPerSec - a[1].throughputOpsPerSec);
        for (const [format, result] of sortedResults) {
            console.log(format.padEnd(12) +
                result.avgSerializationTimeMs.toFixed(3).padEnd(10) +
                result.avgDeserializationTimeMs.toFixed(3).padEnd(12) +
                result.avgTotalTimeMs.toFixed(3).padEnd(12) +
                result.throughputOpsPerSec.toFixed(0).padEnd(12) +
                (result.avgSerializedSizeBytes / 1024).toFixed(2).padEnd(10) +
                result.compressionRatio.toFixed(3).padEnd(12) +
                result.memoryUsageMB.toFixed(2).padEnd(12) +
                result.errorCount.toString());
        }
        // Find best performers
        const bestThroughput = sortedResults[0];
        const bestCompression = Array.from(results.entries())
            .sort((a, b) => a[1].compressionRatio - b[1].compressionRatio)[0];
        const bestLatency = Array.from(results.entries())
            .sort((a, b) => a[1].avgTotalTimeMs - b[1].avgTotalTimeMs)[0];
        console.log('\n=== RECOMMENDATIONS ===');
        console.log(`Best Throughput: ${bestThroughput[0]} (${bestThroughput[1].throughputOpsPerSec.toFixed(0)} ops/sec)`);
        console.log(`Best Compression: ${bestCompression[0]} (${bestCompression[1].compressionRatio.toFixed(3)}x)`);
        console.log(`Best Latency: ${bestLatency[0]} (${bestLatency[1].avgTotalTimeMs.toFixed(3)}ms)`);
    }
    async runFullBenchmarkSuite() {
        console.log('Starting full serialization benchmark suite...\n');
        const eventSizes = ['small', 'medium', 'large'];
        const formats = [SerializationFormat.PROTOBUF, SerializationFormat.AVRO, SerializationFormat.JSON];
        for (const eventSize of eventSizes) {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`BENCHMARK: ${eventSize.toUpperCase()} EVENTS`);
            console.log(`${'='.repeat(60)}`);
            const config = {
                iterations: eventSize === 'large' ? 100 : 1000,
                eventSize,
                formats,
                warmupIterations: eventSize === 'large' ? 10 : 100
            };
            const results = await this.runBenchmark(config);
            this.printComparison(results);
        }
        // Performance insights
        console.log('\n=== PERFORMANCE INSIGHTS ===');
        console.log('For high-throughput log ingestion (10M+ events/sec):');
        console.log('- Use Protocol Buffers for small events (<1KB) requiring maximum speed');
        console.log('- Use Avro for medium-large events requiring schema evolution');
        console.log('- JSON should only be used for debugging/development');
        console.log('- Consider event size when choosing serialization format');
        console.log('- Enable compression for events >1KB');
    }
}
// CLI interface for running benchmarks
if (require.main === module) {
    const benchmark = new SerializationBenchmark();
    benchmark.initialize()
        .then(() => benchmark.runFullBenchmarkSuite())
        .then(() => {
        console.log('\nBenchmark suite completed successfully!');
        process.exit(0);
    })
        .catch(error => {
        console.error('Benchmark failed:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=serialization-benchmark.js.map