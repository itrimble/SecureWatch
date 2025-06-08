import { EventEmitter } from 'events';
import { AlertEnrichmentRequest, AlertEnrichmentResponse } from '../types/ai.types';
import { LocalLLMProvider } from '../providers/local-llm-provider';
import { CloudAIProvider } from '../providers/cloud-ai-provider';
interface ThreatIntelSource {
    id: string;
    name: string;
    type: 'ip' | 'domain' | 'hash' | 'url' | 'email';
    endpoint: string;
    apiKey?: string;
    rateLimitPerHour: number;
    enabled: boolean;
}
/**
 * Alert Enrichment Service
 * Automatically enriches security alerts with additional context and intelligence
 */
export declare class AlertEnrichmentService extends EventEmitter {
    private localProvider;
    private cloudProvider;
    private threatIntelSources;
    private enrichmentCache;
    private rateLimitCounters;
    constructor(localProvider: LocalLLMProvider, cloudProvider: CloudAIProvider);
    /**
     * Enrich an alert with additional context and intelligence
     */
    enrichAlert(request: AlertEnrichmentRequest): Promise<AlertEnrichmentResponse>;
    /**
     * Add a threat intelligence source
     */
    addThreatIntelSource(source: ThreatIntelSource): void;
    /**
     * Get enrichment statistics
     */
    getEnrichmentStats(): {
        totalEnrichments: number;
        cacheHitRate: number;
        averageProcessingTime: number;
        sourceStats: Record<string, {
            requests: number;
            errors: number;
            lastUsed: string;
        }>;
    };
    private performEnrichment;
    private getThreatIntelligence;
    private getGeolocation;
    private getReputation;
    private generateContextualAnalysis;
    private findSimilarEvents;
    private generateMitigationSuggestions;
    private extractIndicators;
    private extractIPAddresses;
    private queryThreatIntelSource;
    private queryGeolocationService;
    private queryReputationService;
    private calculateRiskScore;
    private identifyMITRETechniques;
    private assessBusinessImpact;
    private calculateUrgency;
    private generateContainmentActions;
    private generateInvestigationSteps;
    private identifyAutomationOpportunities;
    private isIndicatorTypeSupported;
    private checkRateLimit;
    private updateRateLimit;
    private setupCacheCleanup;
    private initializeThreatIntelSources;
}
export default AlertEnrichmentService;
//# sourceMappingURL=alert-enrichment-service.d.ts.map