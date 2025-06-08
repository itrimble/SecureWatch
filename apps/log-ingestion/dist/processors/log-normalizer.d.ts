import { NormalizedLogEvent } from '../types/log-event.types';
export declare class LogNormalizer {
    private fieldExtractor;
    private severityMapper;
    private categoryClassifier;
    constructor();
    normalize(rawEvent: any): Promise<NormalizedLogEvent>;
    private normalizeEVTXEvent;
    private normalizeWindowsEvent;
    private normalizeSyslogEvent;
    private normalizeCloudTrailEvent;
    private normalizeAzureActivityEvent;
    private normalizeGCPLoggingEvent;
    private normalizeGenericEvent;
    private extractWindowsFields;
    private buildWindowsMessage;
    private buildWindowsTags;
    private extractDomain;
    private extractWindowsProcessInfo;
    private extractWindowsNetworkInfo;
    private buildSyslogTags;
    private getFacilityName;
    private getSeverityName;
    private determineCloudTrailSeverity;
    private extractCloudTrailUser;
    private mapAzureLevel;
    private classifyAzureCategory;
    private mapGCPSeverity;
    private classifyGCPCategory;
    private mapWindowsEventSeverity;
    private classifyWindowsEventCategory;
    private buildWindowsEventMessage;
    private buildWindowsEVTXTags;
}
//# sourceMappingURL=log-normalizer.d.ts.map