import { SerializationFormat } from './serialization-manager';
interface BenchmarkConfig {
    iterations: number;
    eventSize: 'small' | 'medium' | 'large' | 'xlarge';
    formats: SerializationFormat[];
    warmupIterations: number;
}
interface BenchmarkResults {
    format: SerializationFormat;
    avgSerializationTimeMs: number;
    avgDeserializationTimeMs: number;
    avgTotalTimeMs: number;
    throughputOpsPerSec: number;
    avgSerializedSizeBytes: number;
    compressionRatio: number;
    memoryUsageMB: number;
    errorCount: number;
}
export declare class SerializationBenchmark {
    private serializationManager;
    private sampleEvents;
    constructor();
    initialize(): Promise<void>;
    private generateSampleEvents;
    runBenchmark(config: BenchmarkConfig): Promise<Map<SerializationFormat, BenchmarkResults>>;
    printComparison(results: Map<SerializationFormat, BenchmarkResults>): void;
    runFullBenchmarkSuite(): Promise<void>;
}
export {};
//# sourceMappingURL=serialization-benchmark.d.ts.map