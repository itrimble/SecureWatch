"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultConfig = void 0;
exports.defaultConfig = {
    services: [
        {
            name: 'Frontend',
            url: 'http://localhost:4000',
            healthPath: '/api/health',
            port: 4000
        },
        {
            name: 'Search API',
            url: 'http://localhost:4004',
            healthPath: '/health',
            metricsPath: '/api/v1/metrics/performance',
            port: 4004
        },
        {
            name: 'Log Ingestion',
            url: 'http://localhost:4002',
            healthPath: '/health',
            metricsPath: '/metrics',
            port: 4002
        },
        {
            name: 'Correlation Engine',
            url: 'http://localhost:4005',
            healthPath: '/health',
            port: 4005
        },
        {
            name: 'Analytics Engine',
            url: 'http://localhost:4006',
            healthPath: '/health',
            port: 4006
        }
    ],
    refreshInterval: 5000, // 5 seconds
    timeout: 3000, // 3 seconds
    maxRetries: 3,
    dockerComposeFile: 'docker-compose.dev.yml',
    logPaths: {
        'frontend': '/tmp/frontend.log',
        'search-api': '/tmp/search-api.log',
        'log-ingestion': '/tmp/log-ingestion.log',
        'correlation-engine': '/tmp/correlation-engine.log',
        'analytics-engine': '/tmp/analytics-engine.log'
    }
};
//# sourceMappingURL=dashboard.config.js.map