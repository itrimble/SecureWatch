import { LogParser, NormalizedEvent, ParserStats, ParserTestResult } from './types';
export declare class ParserManager {
    private parsers;
    private parsersBySource;
    private parsersByCategory;
    private communityLoader;
    private validator;
    private metrics;
    private enrichment;
    private isInitialized;
    constructor();
    initialize(): Promise<void>;
    registerParser(parser: LogParser): Promise<void>;
    parseLog(rawLog: string, sourceHint?: string, categoryHint?: string): Promise<NormalizedEvent | null>;
    parseLogsAsync(logs: Array<{
        rawLog: string;
        sourceHint?: string;
        categoryHint?: string;
    }>, batchSize?: number): Promise<Array<{
        index: number;
        result: NormalizedEvent | null;
        error?: Error;
    }>>;
    private getCandidateParsers;
    private calculateConfidence;
    private loadBuiltInParsers;
    private loadCommunityParsers;
    getParser(parserId: string): LogParser | undefined;
    listParsers(): LogParser[];
    getParsersByCategory(category: string): LogParser[];
    getParsersBySource(source: string): LogParser[];
    setParserEnabled(parserId: string, enabled: boolean): boolean;
    testParser(parserId: string, testData: string[]): Promise<ParserTestResult>;
    getParserStats(): ParserStats;
    getParserMetrics(parserId?: string): import("./metrics/ParserMetrics").ParserMetric[];
    resetMetrics(parserId?: string): void;
    unregisterParser(parserId: string): boolean;
    private logParserStats;
    shutdown(): Promise<void>;
}
//# sourceMappingURL=ParserManager.d.ts.map