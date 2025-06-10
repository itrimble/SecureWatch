// High-performance real-time collection configuration
export const highPerformanceConfig = {
    channels: [
        'Security',
        'System',
        'Application',
        'Microsoft-Windows-Sysmon/Operational',
        'Microsoft-Windows-PowerShell/Operational'
    ],
    servers: ['localhost'],
    batchSize: 5000,
    pollInterval: 1000, // 1 second for real-time feel
    includeEventData: true,
    // Enhanced performance settings
    realTimeCollection: true,
    performanceOptimized: true,
    compressionEnabled: true,
    highVolumeMode: true,
    maxConcurrentProcesses: 8,
    powerShellPath: 'powershell.exe',
    // Advanced filtering for security events
    filters: [
        {
            // Authentication events
            eventIds: [4624, 4625, 4634, 4647, 4648, 4649, 4672, 4673],
            levels: [2, 3, 4], // Error, Warning, Information
            providers: ['Microsoft-Windows-Security-Auditing'],
            includeUserData: true,
        },
        {
            // Process creation events (Sysmon)
            eventIds: [1, 3, 11, 12, 13],
            providers: ['Microsoft-Windows-Sysmon'],
            severityMin: 1,
        },
        {
            // PowerShell execution events
            eventIds: [4103, 4104, 4105, 4106],
            providers: ['Microsoft-Windows-PowerShell'],
            timeRange: {
                startTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
        }
    ]
};
// Remote domain controller collection
export const domainControllerConfig = {
    channels: ['Security', 'System', 'Directory Service'],
    servers: [
        'dc01.company.local',
        'dc02.company.local',
        'dc03.company.local'
    ],
    batchSize: 2000,
    pollInterval: 5000,
    includeEventData: true,
    realTimeCollection: true,
    performanceOptimized: true,
    compressionEnabled: true,
    highVolumeMode: false, // More conservative for remote collection
    maxConcurrentProcesses: 6,
    // Domain credentials
    credentials: {
        username: 'svc-logcollector',
        password: process.env.DC_COLLECTOR_PASSWORD || '',
        domain: 'COMPANY'
    },
    // Focus on critical domain events
    filters: [
        {
            // Domain authentication events
            eventIds: [4768, 4769, 4771, 4772, 4776, 4777],
            levels: [2, 3, 4],
            providers: ['Microsoft-Windows-Security-Auditing'],
        },
        {
            // Group policy and AD changes
            eventIds: [5136, 5137, 5138, 5139, 5141],
            providers: ['Microsoft-Windows-Security-Auditing'],
        }
    ]
};
// File-based EVTX processing for forensic analysis
export const forensicAnalysisConfig = {
    channels: [], // Not used for file processing
    servers: [], // Not used for file processing  
    batchSize: 1000,
    pollInterval: 0, // Not used for file processing
    includeEventData: true,
    realTimeCollection: false,
    performanceOptimized: true,
    compressionEnabled: true,
    highVolumeMode: false,
    maxConcurrentProcesses: 4,
    // EVTX files to process
    evtxFilePaths: [
        'C:\\ForensicData\\Security.evtx',
        'C:\\ForensicData\\System.evtx',
        'C:\\ForensicData\\Application.evtx',
        'C:\\ForensicData\\Microsoft-Windows-Sysmon%4Operational.evtx',
        'C:\\ForensicData\\Microsoft-Windows-PowerShell%4Operational.evtx'
    ],
    // Comprehensive filtering for forensic analysis
    filters: [
        {
            // All authentication events
            eventIds: [4624, 4625, 4634, 4647, 4648, 4649, 4672, 4673, 4774, 4775],
            providers: ['Microsoft-Windows-Security-Auditing'],
            includeUserData: true,
        },
        {
            // Process and network events
            eventIds: [1, 3, 5, 7, 8, 11, 12, 13, 15, 17, 18],
            providers: ['Microsoft-Windows-Sysmon'],
        },
        {
            // PowerShell execution and script block logging
            eventIds: [4103, 4104, 4105, 4106, 24577, 24578],
            providers: ['Microsoft-Windows-PowerShell', 'PowerShell'],
        },
        {
            // System events
            eventIds: [1, 6, 7034, 7035, 7036, 7040],
            levels: [1, 2, 3], // Critical, Error, Warning
        }
    ]
};
// Lightweight monitoring for endpoints
export const endpointMonitoringConfig = {
    channels: ['Security', 'System'],
    servers: ['localhost'],
    batchSize: 500,
    pollInterval: 10000, // 10 seconds
    includeEventData: true,
    realTimeCollection: false, // Use polling for lighter footprint
    performanceOptimized: true,
    compressionEnabled: true,
    highVolumeMode: false,
    maxConcurrentProcesses: 2,
    // Minimal filtering for essential security events
    filters: [
        {
            // Critical authentication failures and successes
            eventIds: [4624, 4625, 4648, 4672],
            levels: [2, 3, 4],
            providers: ['Microsoft-Windows-Security-Auditing'],
        },
        {
            // System startup/shutdown
            eventIds: [1, 6, 7001, 7002],
            levels: [1, 2, 3],
        }
    ]
};
// Development and testing configuration
export const developmentConfig = {
    channels: ['Application', 'System'],
    servers: ['localhost'],
    batchSize: 100,
    pollInterval: 15000, // 15 seconds
    includeEventData: true,
    realTimeCollection: false,
    performanceOptimized: false, // More verbose logging for development
    compressionEnabled: false,
    highVolumeMode: false,
    maxConcurrentProcesses: 2,
    // Minimal filtering for development
    filters: [
        {
            levels: [1, 2, 3], // Only errors and warnings
            timeRange: {
                startTime: new Date(Date.now() - 60 * 60 * 1000), // Last hour
            },
        }
    ]
};
// Windows Event Forwarding (WEF) configuration
export const wefCollectorConfig = {
    channels: ['ForwardedEvents'], // WEF collector channel
    servers: ['wef-collector.company.local'],
    batchSize: 10000, // Large batches for WEF
    pollInterval: 2000, // 2 seconds
    includeEventData: true,
    realTimeCollection: true,
    performanceOptimized: true,
    compressionEnabled: true,
    highVolumeMode: true,
    maxConcurrentProcesses: 12, // High concurrency for WEF
    wefEnabled: true,
    // WEF typically aggregates many event types
    filters: [
        {
            // All security events from forwarded logs
            providers: ['Microsoft-Windows-Security-Auditing'],
            levels: [1, 2, 3, 4],
        },
        {
            // Sysmon events from all endpoints
            providers: ['Microsoft-Windows-Sysmon'],
            eventIds: [1, 3, 5, 7, 8, 11, 12, 13],
        }
    ]
};
// Export configuration selection function
export function getConfigForEnvironment(environment) {
    switch (environment.toLowerCase()) {
        case 'production':
        case 'prod':
            return highPerformanceConfig;
        case 'domain-controller':
        case 'dc':
            return domainControllerConfig;
        case 'forensic':
        case 'investigation':
            return forensicAnalysisConfig;
        case 'endpoint':
        case 'workstation':
            return endpointMonitoringConfig;
        case 'wef':
        case 'collector':
            return wefCollectorConfig;
        case 'development':
        case 'dev':
        case 'test':
        default:
            return developmentConfig;
    }
}
// Configuration validation helper
export function validateConfig(config) {
    const errors = [];
    if (!config.channels || config.channels.length === 0) {
        if (!config.evtxFilePaths || config.evtxFilePaths.length === 0) {
            errors.push('Either channels or evtxFilePaths must be specified');
        }
    }
    if (!config.servers || config.servers.length === 0) {
        if (!config.evtxFilePaths || config.evtxFilePaths.length === 0) {
            errors.push('Either servers or evtxFilePaths must be specified');
        }
    }
    if (config.batchSize && config.batchSize <= 0) {
        errors.push('batchSize must be greater than 0');
    }
    if (config.pollInterval && config.pollInterval < 0) {
        errors.push('pollInterval must be non-negative');
    }
    if (config.maxConcurrentProcesses && config.maxConcurrentProcesses <= 0) {
        errors.push('maxConcurrentProcesses must be greater than 0');
    }
    if (config.filters) {
        for (let i = 0; i < config.filters.length; i++) {
            const filter = config.filters[i];
            if (filter.eventIds && filter.eventIds.some(id => id <= 0)) {
                errors.push(`Filter ${i}: eventIds must contain positive numbers`);
            }
            if (filter.levels && filter.levels.some(level => level < 1 || level > 5)) {
                errors.push(`Filter ${i}: levels must be between 1 and 5`);
            }
        }
    }
    return errors;
}
// Performance tuning recommendations
export const performanceTuningGuide = {
    highVolume: {
        description: 'For environments processing >100k events/hour',
        recommendations: [
            'Set realTimeCollection: true',
            'Enable highVolumeMode: true',
            'Increase batchSize to 5000-10000',
            'Set maxConcurrentProcesses to 8-16',
            'Enable compressionEnabled: true',
            'Use specific eventId filters to reduce noise',
            'Consider using Windows Event Forwarding (WEF)'
        ]
    },
    lowLatency: {
        description: 'For real-time security monitoring',
        recommendations: [
            'Set pollInterval to 1000ms or enable realTimeCollection',
            'Reduce batchSize to 500-1000',
            'Enable performanceOptimized: true',
            'Use targeted filters for critical events only',
            'Monitor memory usage and adjust maxConcurrentProcesses'
        ]
    },
    resourceConstrained: {
        description: 'For endpoints with limited resources',
        recommendations: [
            'Set realTimeCollection: false',
            'Increase pollInterval to 30000ms',
            'Reduce maxConcurrentProcesses to 2-4',
            'Set highVolumeMode: false',
            'Use aggressive filtering to reduce event volume',
            'Consider scheduled batch processing'
        ]
    },
    forensicAnalysis: {
        description: 'For processing historical EVTX files',
        recommendations: [
            'Use evtxFilePaths instead of real-time collection',
            'Set large batchSize for efficiency',
            'Disable compressionEnabled for debugging',
            'Process files sequentially to avoid resource contention',
            'Include comprehensive filters for thorough analysis'
        ]
    }
};
//# sourceMappingURL=windows-event-log.config.example.js.map