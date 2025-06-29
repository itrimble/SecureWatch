"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertEnrichmentService = void 0;
const events_1 = require("events");
const ai_types_1 = require("../types/ai.types");
const logger_1 = require("../utils/logger");
/**
 * Alert Enrichment Service
 * Automatically enriches security alerts with additional context and intelligence
 */
class AlertEnrichmentService extends events_1.EventEmitter {
    constructor(localProvider, cloudProvider) {
        super();
        this.threatIntelSources = new Map();
        this.enrichmentCache = new Map();
        this.rateLimitCounters = new Map();
        this.localProvider = localProvider;
        this.cloudProvider = cloudProvider;
        this.initializeThreatIntelSources();
        this.setupCacheCleanup();
    }
    /**
     * Enrich an alert with additional context and intelligence
     */
    async enrichAlert(request) {
        const startTime = Date.now();
        const enrichments = [];
        const errors = [];
        try {
            logger_1.logger.info(`Starting alert enrichment for alert ${request.alertId}`, {
                enrichmentTypes: request.enrichmentTypes,
                priority: request.priority
            });
            // Process enrichments in parallel where possible
            const enrichmentPromises = request.enrichmentTypes.map(async (type) => {
                try {
                    const result = await this.performEnrichment(type, request);
                    if (result) {
                        enrichments.push(result);
                    }
                }
                catch (error) {
                    const errorMsg = `Failed to enrich with ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                    errors.push(errorMsg);
                    logger_1.logger.error(errorMsg, error);
                }
            });
            // Wait for all enrichments to complete or timeout
            await Promise.allSettled(enrichmentPromises);
            const processingTime = Date.now() - startTime;
            const response = {
                alertId: request.alertId,
                enrichments,
                processingTime,
                errors: errors.length > 0 ? errors : undefined
            };
            this.emit('alert:enriched', response);
            logger_1.logger.info(`Alert enrichment completed for ${request.alertId}`, {
                enrichmentCount: enrichments.length,
                processingTime,
                errorCount: errors.length
            });
            return response;
        }
        catch (error) {
            logger_1.logger.error(`Error enriching alert ${request.alertId}:`, error);
            throw new ai_types_1.AIEngineError(`Failed to enrich alert: ${error instanceof Error ? error.message : 'Unknown error'}`, 'ENRICHMENT_FAILED', { alertId: request.alertId, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    /**
     * Add a threat intelligence source
     */
    addThreatIntelSource(source) {
        this.threatIntelSources.set(source.id, source);
        this.rateLimitCounters.set(source.id, { count: 0, resetTime: Date.now() + 3600000 });
        logger_1.logger.info(`Added threat intel source: ${source.name}`);
    }
    /**
     * Get enrichment statistics
     */
    getEnrichmentStats() {
        // This would be implemented with actual tracking in a production system
        return {
            totalEnrichments: 0,
            cacheHitRate: 0.8,
            averageProcessingTime: 1500,
            sourceStats: {}
        };
    }
    async performEnrichment(type, request) {
        const cacheKey = `${type}:${JSON.stringify(request.eventData)}`;
        // Check cache first
        const cached = this.enrichmentCache.get(cacheKey);
        if (cached && Date.now() - new Date(cached.timestamp).getTime() < (cached.ttl || 3600000)) {
            return cached;
        }
        let enrichmentData;
        let confidence;
        let source;
        switch (type) {
            case 'threat-intel':
                ({ data: enrichmentData, confidence, source } = await this.getThreatIntelligence(request.eventData));
                break;
            case 'geo-location':
                ({ data: enrichmentData, confidence, source } = await this.getGeolocation(request.eventData));
                break;
            case 'reputation':
                ({ data: enrichmentData, confidence, source } = await this.getReputation(request.eventData));
                break;
            case 'context':
                ({ data: enrichmentData, confidence, source } = await this.generateContextualAnalysis(request));
                break;
            case 'similar-events':
                ({ data: enrichmentData, confidence, source } = await this.findSimilarEvents(request.eventData));
                break;
            case 'mitigation':
                ({ data: enrichmentData, confidence, source } = await this.generateMitigationSuggestions(request));
                break;
            default:
                logger_1.logger.warn(`Unknown enrichment type: ${type}`);
                return null;
        }
        if (!enrichmentData) {
            return null;
        }
        const result = {
            type,
            confidence,
            data: enrichmentData,
            source,
            timestamp: new Date().toISOString(),
            ttl: 3600000 // 1 hour default TTL
        };
        // Cache the result
        this.enrichmentCache.set(cacheKey, result);
        return result;
    }
    async getThreatIntelligence(eventData) {
        const indicators = this.extractIndicators(eventData);
        const threatData = { indicators: [], matches: [] };
        for (const indicator of indicators) {
            for (const [sourceId, source] of this.threatIntelSources) {
                if (!source.enabled || !this.checkRateLimit(sourceId)) {
                    continue;
                }
                if (this.isIndicatorTypeSupported(indicator.type, source.type)) {
                    try {
                        const intel = await this.queryThreatIntelSource(source, indicator.value);
                        if (intel) {
                            threatData.matches.push({
                                indicator: indicator.value,
                                type: indicator.type,
                                source: source.name,
                                ...intel
                            });
                        }
                        this.updateRateLimit(sourceId);
                    }
                    catch (error) {
                        logger_1.logger.warn(`Threat intel query failed for ${source.name}:`, error);
                    }
                }
            }
        }
        const confidence = threatData.matches.length > 0 ? 0.9 : 0.1;
        return {
            data: threatData,
            confidence,
            source: 'Threat Intelligence Aggregation'
        };
    }
    async getGeolocation(eventData) {
        const ips = this.extractIPAddresses(eventData);
        const geoData = {};
        for (const ip of ips) {
            try {
                // This would use a real geolocation service
                const geoResponse = await this.queryGeolocationService(ip);
                if (geoResponse) {
                    geoData[ip] = geoResponse;
                }
            }
            catch (error) {
                logger_1.logger.warn(`Geolocation query failed for IP ${ip}:`, error);
            }
        }
        const confidence = Object.keys(geoData).length > 0 ? 0.8 : 0.1;
        return {
            data: geoData,
            confidence,
            source: 'Geolocation Service'
        };
    }
    async getReputation(eventData) {
        const indicators = this.extractIndicators(eventData);
        const reputationData = {};
        for (const indicator of indicators) {
            try {
                // This would use real reputation services
                const repResponse = await this.queryReputationService(indicator.value, indicator.type);
                if (repResponse) {
                    reputationData[indicator.value] = repResponse;
                }
            }
            catch (error) {
                logger_1.logger.warn(`Reputation query failed for ${indicator.value}:`, error);
            }
        }
        const confidence = Object.keys(reputationData).length > 0 ? 0.8 : 0.1;
        return {
            data: reputationData,
            confidence,
            source: 'Reputation Services'
        };
    }
    async generateContextualAnalysis(request) {
        const contextPrompt = `
Analyze this security alert and provide contextual insights:

Alert ID: ${request.alertId}
Event Data: ${JSON.stringify(request.eventData, null, 2)}

Please provide:
1. A summary of what this alert indicates
2. Potential attack techniques (MITRE ATT&CK)
3. Risk assessment (Low/Medium/High/Critical)
4. Business impact analysis
5. Recommended immediate actions

Focus on actionable intelligence for security analysts.
`;
        try {
            // Use privacy-appropriate model
            const context = {
                privacyLevel: 'restricted',
                classification: 'confidential',
                dataSources: ['alerts'],
                timeRange: { start: new Date().toISOString(), end: new Date().toISOString() },
                userRole: 'security-analyst',
                organizationId: 'default',
                permissions: ['analyze-alerts']
            };
            const response = await this.localProvider.generateResponse('local-default', contextPrompt, context, { temperature: 0.3, maxTokens: 1000 });
            const analysisData = {
                summary: response.output,
                riskScore: this.calculateRiskScore(request.eventData),
                attackTechniques: this.identifyMITRETechniques(request.eventData),
                businessImpact: this.assessBusinessImpact(request.eventData),
                urgency: this.calculateUrgency(request.priority)
            };
            return {
                data: analysisData,
                confidence: response.metadata.confidence || 0.7,
                source: 'AI Contextual Analysis'
            };
        }
        catch (error) {
            logger_1.logger.error('Error generating contextual analysis:', error);
            throw error;
        }
    }
    async findSimilarEvents(eventData) {
        // This would query a vector database or similarity search system
        const similarEvents = [
            {
                eventId: 'evt-001',
                similarity: 0.85,
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                summary: 'Similar suspicious process execution detected'
            },
            {
                eventId: 'evt-002',
                similarity: 0.78,
                timestamp: new Date(Date.now() - 7200000).toISOString(),
                summary: 'Comparable network connection pattern observed'
            }
        ];
        return {
            data: { similarEvents, totalMatches: similarEvents.length },
            confidence: similarEvents.length > 0 ? 0.8 : 0.1,
            source: 'Historical Event Analysis'
        };
    }
    async generateMitigationSuggestions(request) {
        const mitigationPrompt = `
Generate specific mitigation recommendations for this security alert:

Alert Data: ${JSON.stringify(request.eventData, null, 2)}
Priority: ${request.priority}

Provide:
1. Immediate containment actions
2. Investigation steps
3. Remediation procedures
4. Prevention measures
5. Monitoring enhancements

Focus on practical, actionable steps for security teams.
`;
        try {
            const context = {
                privacyLevel: 'restricted',
                classification: 'confidential',
                dataSources: ['alerts'],
                timeRange: { start: new Date().toISOString(), end: new Date().toISOString() },
                userRole: 'security-analyst',
                organizationId: 'default',
                permissions: ['analyze-alerts']
            };
            const response = await this.localProvider.generateResponse('local-default', mitigationPrompt, context, { temperature: 0.2, maxTokens: 800 });
            const mitigationData = {
                recommendations: response.output,
                containmentActions: this.generateContainmentActions(request.eventData),
                investigationSteps: this.generateInvestigationSteps(request.eventData),
                automationOpportunities: this.identifyAutomationOpportunities(request.eventData)
            };
            return {
                data: mitigationData,
                confidence: response.metadata.confidence || 0.7,
                source: 'AI Mitigation Engine'
            };
        }
        catch (error) {
            logger_1.logger.error('Error generating mitigation suggestions:', error);
            throw error;
        }
    }
    extractIndicators(eventData) {
        const indicators = [];
        // Extract IP addresses
        const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;
        const ipMatches = JSON.stringify(eventData).match(ipRegex) || [];
        ipMatches.forEach(ip => indicators.push({ type: 'ip', value: ip }));
        // Extract domains
        const domainRegex = /\b[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*\b/g;
        const domainMatches = JSON.stringify(eventData).match(domainRegex) || [];
        domainMatches.forEach(domain => {
            if (domain.includes('.') && !ipRegex.test(domain)) {
                indicators.push({ type: 'domain', value: domain });
            }
        });
        // Extract file hashes (MD5, SHA1, SHA256)
        const hashRegex = /\b[a-fA-F0-9]{32,64}\b/g;
        const hashMatches = JSON.stringify(eventData).match(hashRegex) || [];
        hashMatches.forEach(hash => {
            if (hash.length === 32 || hash.length === 40 || hash.length === 64) {
                indicators.push({ type: 'hash', value: hash });
            }
        });
        return indicators;
    }
    extractIPAddresses(eventData) {
        const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;
        const matches = JSON.stringify(eventData).match(ipRegex) || [];
        return [...new Set(matches)]; // Remove duplicates
    }
    async queryThreatIntelSource(source, indicator) {
        // This would implement actual threat intel API calls
        // For now, return mock data
        return {
            malicious: Math.random() > 0.8,
            confidence: Math.random(),
            categories: ['malware', 'botnet'],
            lastSeen: new Date().toISOString()
        };
    }
    async queryGeolocationService(ip) {
        // This would use a real geolocation service like MaxMind or IPGeolocation
        // For now, return mock data
        if (ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.')) {
            return null; // Skip private IPs
        }
        return {
            country: 'United States',
            region: 'California',
            city: 'San Francisco',
            latitude: 37.7749,
            longitude: -122.4194,
            isp: 'Example ISP',
            organization: 'Example Org',
            asn: 'AS1234'
        };
    }
    async queryReputationService(indicator, type) {
        // This would use real reputation services like VirusTotal, URLVoid, etc.
        // For now, return mock data
        return {
            score: Math.floor(Math.random() * 100),
            categories: ['safe', 'business'],
            lastSeen: new Date().toISOString(),
            firstSeen: new Date(Date.now() - 86400000).toISOString(),
            source: 'Reputation Service'
        };
    }
    calculateRiskScore(eventData) {
        // Simple risk scoring based on event attributes
        let score = 0;
        if (eventData.severity === 'high' || eventData.severity === 'critical') {
            score += 40;
        }
        else if (eventData.severity === 'medium') {
            score += 20;
        }
        if (eventData.source?.includes('external')) {
            score += 30;
        }
        if (eventData.user?.includes('admin') || eventData.user?.includes('root')) {
            score += 20;
        }
        return Math.min(score, 100);
    }
    identifyMITRETechniques(eventData) {
        // Map event characteristics to MITRE ATT&CK techniques
        const techniques = [];
        if (eventData.processName?.toLowerCase().includes('powershell')) {
            techniques.push('T1059.001 - PowerShell');
        }
        if (eventData.networkConnection) {
            techniques.push('T1071 - Application Layer Protocol');
        }
        if (eventData.fileCreated || eventData.fileModified) {
            techniques.push('T1105 - Ingress Tool Transfer');
        }
        return techniques;
    }
    assessBusinessImpact(eventData) {
        // Assess potential business impact
        if (eventData.severity === 'critical' || eventData.assets?.includes('domain-controller')) {
            return 'High - Critical infrastructure potentially affected';
        }
        else if (eventData.severity === 'high' || eventData.user?.includes('admin')) {
            return 'Medium - Privileged access potentially compromised';
        }
        else {
            return 'Low - Limited scope of impact';
        }
    }
    calculateUrgency(priority) {
        switch (priority) {
            case 'critical': return 'Immediate action required';
            case 'high': return 'Action required within 1 hour';
            case 'medium': return 'Action required within 4 hours';
            case 'low': return 'Action required within 24 hours';
            default: return 'Normal processing time';
        }
    }
    generateContainmentActions(eventData) {
        const actions = [];
        if (eventData.user) {
            actions.push(`Disable user account: ${eventData.user}`);
        }
        if (eventData.computer || eventData.host) {
            actions.push(`Isolate host: ${eventData.computer || eventData.host}`);
        }
        if (eventData.processId) {
            actions.push(`Terminate process: ${eventData.processId}`);
        }
        return actions;
    }
    generateInvestigationSteps(eventData) {
        return [
            'Review system logs for related activity',
            'Check for lateral movement indicators',
            'Analyze network traffic patterns',
            'Examine file system changes',
            'Interview affected users if applicable'
        ];
    }
    identifyAutomationOpportunities(eventData) {
        return [
            'Automated user account disabling',
            'Automatic host isolation',
            'Dynamic firewall rule creation',
            'Incident ticket auto-creation'
        ];
    }
    isIndicatorTypeSupported(indicatorType, sourceType) {
        return indicatorType === sourceType || sourceType === 'all';
    }
    checkRateLimit(sourceId) {
        const counter = this.rateLimitCounters.get(sourceId);
        if (!counter)
            return false;
        if (Date.now() > counter.resetTime) {
            counter.count = 0;
            counter.resetTime = Date.now() + 3600000; // Reset every hour
        }
        const source = this.threatIntelSources.get(sourceId);
        return counter.count < (source?.rateLimitPerHour || 1000);
    }
    updateRateLimit(sourceId) {
        const counter = this.rateLimitCounters.get(sourceId);
        if (counter) {
            counter.count++;
        }
    }
    setupCacheCleanup() {
        // Clean up expired cache entries every 10 minutes
        setInterval(() => {
            const now = Date.now();
            for (const [key, result] of this.enrichmentCache) {
                const age = now - new Date(result.timestamp).getTime();
                if (age > (result.ttl || 3600000)) {
                    this.enrichmentCache.delete(key);
                }
            }
        }, 600000);
    }
    initializeThreatIntelSources() {
        // Initialize with some common threat intel sources
        const sources = [
            {
                id: 'virustotal',
                name: 'VirusTotal',
                type: 'hash',
                endpoint: 'https://www.virustotal.com/vtapi/v2/',
                rateLimitPerHour: 4,
                enabled: true
            },
            {
                id: 'abuseipdb',
                name: 'AbuseIPDB',
                type: 'ip',
                endpoint: 'https://api.abuseipdb.com/api/v2/',
                rateLimitPerHour: 1000,
                enabled: true
            },
            {
                id: 'urlvoid',
                name: 'URLVoid',
                type: 'url',
                endpoint: 'https://api.urlvoid.com/v1/',
                rateLimitPerHour: 100,
                enabled: true
            }
        ];
        sources.forEach(source => this.addThreatIntelSource(source));
    }
}
exports.AlertEnrichmentService = AlertEnrichmentService;
exports.default = AlertEnrichmentService;
//# sourceMappingURL=alert-enrichment-service.js.map