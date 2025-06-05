"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelManager = void 0;
const events_1 = require("events");
const fs_1 = require("fs");
const ai_types_1 = require("../types/ai.types");
const logger_1 = require("../utils/logger");
/**
 * Model Management and Versioning System
 * Handles lifecycle management of AI models including deployment, versioning, and monitoring
 */
class ModelManager extends events_1.EventEmitter {
    constructor(localProvider, cloudProvider, registryPath = './model-registry.json') {
        super();
        this.metricsHistory = new Map();
        this.healthChecks = new Map();
        this.localProvider = localProvider;
        this.cloudProvider = cloudProvider;
        this.registryPath = registryPath;
        this.registry = this.initializeRegistry();
        this.setupHealthMonitoring();
    }
    /**
     * Initialize the model manager
     */
    async initialize() {
        try {
            await this.loadRegistry();
            await this.validateDeployments();
            this.emit('manager:initialized');
            logger_1.logger.info('Model manager initialized successfully');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize model manager:', error);
            throw new ai_types_1.AIEngineError(`Model manager initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'MANAGER_INITIALIZATION_FAILED');
        }
    }
    /**
     * Register a new model
     */
    async registerModel(config) {
        try {
            // Validate model configuration
            this.validateModelConfig(config);
            // Test model connectivity
            await this.testModelConnectivity(config);
            // Add to registry
            this.registry.models[config.id] = config;
            // Create initial version
            const version = {
                version: '1.0.0',
                timestamp: new Date().toISOString(),
                config,
                performance: {
                    accuracy: 0,
                    latency: 0,
                    throughput: 0,
                    errorRate: 0
                },
                deploymentStatus: 'staging'
            };
            if (!this.registry.versions[config.id]) {
                this.registry.versions[config.id] = [];
            }
            this.registry.versions[config.id].push(version);
            await this.saveRegistry();
            this.emit('model:registered', config);
            logger_1.logger.info(`Registered model: ${config.id} (${config.provider})`);
        }
        catch (error) {
            logger_1.logger.error(`Error registering model ${config.id}:`, error);
            throw new ai_types_1.AIEngineError(`Failed to register model: ${error instanceof Error ? error.message : 'Unknown error'}`, 'MODEL_REGISTRATION_FAILED', { modelId: config.id, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    /**
     * Create a new model version
     */
    async createVersion(modelId, newConfig, versionNumber) {
        try {
            const baseModel = this.registry.models[modelId];
            if (!baseModel) {
                throw new ai_types_1.AIEngineError(`Model not found: ${modelId}`, 'MODEL_NOT_FOUND');
            }
            const versions = this.registry.versions[modelId] || [];
            const latestVersion = versions[versions.length - 1];
            // Generate version number if not provided
            if (!versionNumber) {
                const [major, minor, patch] = latestVersion.version.split('.').map(Number);
                versionNumber = `${major}.${minor}.${patch + 1}`;
            }
            // Merge configurations
            const updatedConfig = {
                ...baseModel,
                ...newConfig,
                id: modelId // Ensure ID stays the same
            };
            // Validate updated configuration
            this.validateModelConfig(updatedConfig);
            // Test connectivity with new configuration
            await this.testModelConnectivity(updatedConfig);
            const newVersion = {
                version: versionNumber,
                timestamp: new Date().toISOString(),
                config: updatedConfig,
                performance: {
                    accuracy: 0,
                    latency: 0,
                    throughput: 0,
                    errorRate: 0
                },
                deploymentStatus: 'staging'
            };
            this.registry.versions[modelId].push(newVersion);
            await this.saveRegistry();
            this.emit('version:created', { modelId, version: versionNumber });
            logger_1.logger.info(`Created new version ${versionNumber} for model ${modelId}`);
            return newVersion;
        }
        catch (error) {
            logger_1.logger.error(`Error creating version for model ${modelId}:`, error);
            throw new ai_types_1.AIEngineError(`Failed to create model version: ${error instanceof Error ? error.message : 'Unknown error'}`, 'VERSION_CREATION_FAILED', { modelId, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    /**
     * Deploy a model version
     */
    async deployModel(plan) {
        try {
            const { modelId, version, environment } = plan;
            // Validate model and version exist
            const modelVersions = this.registry.versions[modelId];
            if (!modelVersions) {
                throw new ai_types_1.AIEngineError(`Model not found: ${modelId}`, 'MODEL_NOT_FOUND');
            }
            const modelVersion = modelVersions.find(v => v.version === version);
            if (!modelVersion) {
                throw new ai_types_1.AIEngineError(`Version not found: ${version}`, 'VERSION_NOT_FOUND');
            }
            const deploymentId = `deploy-${modelId}-${version}-${environment}-${Date.now()}`;
            const deployment = {
                id: deploymentId,
                modelId,
                version,
                environment,
                status: 'deploying',
                startTime: new Date().toISOString(),
                resources: {
                    cpu: 1,
                    memory: 2048,
                    gpu: 0
                },
                healthCheck: {
                    endpoint: '/health',
                    interval: 30000,
                    timeout: 5000
                }
            };
            // Add to registry
            if (!this.registry.deployments[modelId]) {
                this.registry.deployments[modelId] = [];
            }
            this.registry.deployments[modelId].push(deployment);
            // Perform deployment based on strategy
            await this.executeDeployment(deployment, plan);
            // Update deployment status
            deployment.status = 'active';
            deployment.endTime = new Date().toISOString();
            // Update model version status
            modelVersion.deploymentStatus = 'active';
            await this.saveRegistry();
            // Start health monitoring
            if (plan.healthChecks) {
                this.startHealthMonitoring(deploymentId, modelVersion.config);
            }
            this.emit('model:deployed', { deploymentId, modelId, version, environment });
            logger_1.logger.info(`Deployed model ${modelId} version ${version} to ${environment}`);
            return deploymentId;
        }
        catch (error) {
            logger_1.logger.error(`Error deploying model ${plan.modelId}:`, error);
            throw new ai_types_1.AIEngineError(`Failed to deploy model: ${error instanceof Error ? error.message : 'Unknown error'}`, 'DEPLOYMENT_FAILED', { modelId: plan.modelId, version: plan.version, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    /**
     * Rollback a deployment
     */
    async rollbackDeployment(deploymentId, targetVersion) {
        try {
            const deployment = this.findDeployment(deploymentId);
            if (!deployment) {
                throw new ai_types_1.AIEngineError(`Deployment not found: ${deploymentId}`, 'DEPLOYMENT_NOT_FOUND');
            }
            const { modelId, environment } = deployment;
            // Find target version to rollback to
            let rollbackVersion;
            if (targetVersion) {
                const targetModelVersion = this.registry.versions[modelId]?.find(v => v.version === targetVersion);
                if (!targetModelVersion) {
                    throw new ai_types_1.AIEngineError(`Target version not found: ${targetVersion}`, 'VERSION_NOT_FOUND');
                }
                rollbackVersion = targetModelVersion;
            }
            else {
                // Use the rollbackTo field if specified, otherwise use previous version
                const versions = this.registry.versions[modelId] || [];
                const currentVersionIndex = versions.findIndex(v => v.version === deployment.version);
                if (currentVersionIndex <= 0) {
                    throw new ai_types_1.AIEngineError('No previous version available for rollback', 'NO_ROLLBACK_VERSION');
                }
                rollbackVersion = versions[currentVersionIndex - 1];
            }
            // Create rollback deployment
            const rollbackPlan = {
                modelId,
                version: rollbackVersion.version,
                environment,
                rolloutStrategy: 'immediate',
                healthChecks: true,
                rollbackEnabled: false
            };
            // Stop current deployment health monitoring
            this.stopHealthMonitoring(deploymentId);
            // Mark current deployment as inactive
            deployment.status = 'inactive';
            // Deploy rollback version
            await this.deployModel(rollbackPlan);
            this.emit('deployment:rolled-back', { deploymentId, rollbackVersion: rollbackVersion.version });
            logger_1.logger.info(`Rolled back deployment ${deploymentId} to version ${rollbackVersion.version}`);
        }
        catch (error) {
            logger_1.logger.error(`Error rolling back deployment ${deploymentId}:`, error);
            throw new ai_types_1.AIEngineError(`Failed to rollback deployment: ${error instanceof Error ? error.message : 'Unknown error'}`, 'ROLLBACK_FAILED', { deploymentId, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    /**
     * Get model performance metrics
     */
    getModelMetrics(modelId, timeRange) {
        const metrics = this.metricsHistory.get(modelId) || [];
        if (!timeRange) {
            return metrics;
        }
        const startTime = new Date(timeRange.start).getTime();
        const endTime = new Date(timeRange.end).getTime();
        return metrics.filter(metric => {
            const metricTime = new Date(metric.timestamp).getTime();
            return metricTime >= startTime && metricTime <= endTime;
        });
    }
    /**
     * Record model performance metrics
     */
    recordMetrics(metrics) {
        const modelMetrics = this.metricsHistory.get(metrics.modelId) || [];
        modelMetrics.push(metrics);
        // Keep only last 1000 metrics per model
        if (modelMetrics.length > 1000) {
            modelMetrics.splice(0, modelMetrics.length - 1000);
        }
        this.metricsHistory.set(metrics.modelId, modelMetrics);
        this.emit('metrics:recorded', metrics);
    }
    /**
     * List all registered models
     */
    listModels() {
        return Object.values(this.registry.models);
    }
    /**
     * Get model versions
     */
    getModelVersions(modelId) {
        return this.registry.versions[modelId] || [];
    }
    /**
     * Get active deployments
     */
    getActiveDeployments() {
        const allDeployments = Object.values(this.registry.deployments).flat();
        return allDeployments.filter(deployment => deployment.status === 'active');
    }
    /**
     * Get deployment by ID
     */
    getDeployment(deploymentId) {
        return this.findDeployment(deploymentId);
    }
    /**
     * Deactivate a model
     */
    async deactivateModel(modelId) {
        const model = this.registry.models[modelId];
        if (!model) {
            throw new ai_types_1.AIEngineError(`Model not found: ${modelId}`, 'MODEL_NOT_FOUND');
        }
        model.enabled = false;
        // Deactivate all deployments
        const deployments = this.registry.deployments[modelId] || [];
        deployments.forEach(deployment => {
            if (deployment.status === 'active') {
                deployment.status = 'inactive';
                this.stopHealthMonitoring(deployment.id);
            }
        });
        await this.saveRegistry();
        this.emit('model:deactivated', { modelId });
        logger_1.logger.info(`Deactivated model: ${modelId}`);
    }
    validateModelConfig(config) {
        if (!config.id || !config.name || !config.model || !config.provider) {
            throw new ai_types_1.AIEngineError('Invalid model configuration: missing required fields', 'INVALID_CONFIG');
        }
        if (!['local', 'cloud'].includes(config.type)) {
            throw new ai_types_1.AIEngineError(`Invalid model type: ${config.type}`, 'INVALID_MODEL_TYPE');
        }
        if (config.temperature < 0 || config.temperature > 2) {
            throw new ai_types_1.AIEngineError('Temperature must be between 0 and 2', 'INVALID_TEMPERATURE');
        }
        if (config.maxTokens <= 0) {
            throw new ai_types_1.AIEngineError('Max tokens must be positive', 'INVALID_MAX_TOKENS');
        }
    }
    async testModelConnectivity(config) {
        try {
            if (config.type === 'local') {
                // Test local model connectivity
                const healthStatus = await this.localProvider.checkHealth();
                const isHealthy = healthStatus.get(config.id);
                if (isHealthy === false) {
                    throw new Error('Local model is not responding');
                }
            }
            else if (config.type === 'cloud') {
                // Test cloud model connectivity
                const healthStatus = await this.cloudProvider.checkHealth();
                const isHealthy = healthStatus.get(config.id);
                if (isHealthy === false) {
                    throw new Error('Cloud model is not responding');
                }
            }
        }
        catch (error) {
            throw new ai_types_1.AIEngineError(`Model connectivity test failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'CONNECTIVITY_TEST_FAILED');
        }
    }
    async executeDeployment(deployment, plan) {
        // Simulate deployment process
        switch (plan.rolloutStrategy) {
            case 'immediate':
                // Deploy immediately
                await this.performImmediateDeployment(deployment);
                break;
            case 'gradual':
                // Gradual rollout over time
                await this.performGradualDeployment(deployment);
                break;
            case 'canary':
                // Canary deployment with monitoring
                await this.performCanaryDeployment(deployment);
                break;
        }
    }
    async performImmediateDeployment(deployment) {
        // Register with appropriate provider
        const modelVersions = this.registry.versions[deployment.modelId];
        const version = modelVersions?.find(v => v.version === deployment.version);
        if (!version) {
            throw new ai_types_1.AIEngineError('Model version not found', 'VERSION_NOT_FOUND');
        }
        if (version.config.type === 'local') {
            await this.localProvider.registerProvider(version.config);
        }
        else {
            await this.cloudProvider.registerProvider(version.config);
        }
    }
    async performGradualDeployment(deployment) {
        // Implement gradual rollout logic
        await this.performImmediateDeployment(deployment);
    }
    async performCanaryDeployment(deployment) {
        // Implement canary deployment logic
        await this.performImmediateDeployment(deployment);
    }
    findDeployment(deploymentId) {
        for (const deployments of Object.values(this.registry.deployments)) {
            const deployment = deployments.find(d => d.id === deploymentId);
            if (deployment) {
                return deployment;
            }
        }
        return null;
    }
    startHealthMonitoring(deploymentId, config) {
        const interval = setInterval(async () => {
            try {
                let isHealthy = false;
                if (config.type === 'local') {
                    const healthStatus = await this.localProvider.checkHealth();
                    isHealthy = healthStatus.get(config.id) || false;
                }
                else {
                    const healthStatus = await this.cloudProvider.checkHealth();
                    isHealthy = healthStatus.get(config.id) || false;
                }
                if (!isHealthy) {
                    this.emit('deployment:unhealthy', { deploymentId, modelId: config.id });
                    logger_1.logger.warn(`Health check failed for deployment ${deploymentId}`);
                }
            }
            catch (error) {
                logger_1.logger.error(`Health check error for deployment ${deploymentId}:`, error);
            }
        }, 30000); // Check every 30 seconds
        this.healthChecks.set(deploymentId, interval);
    }
    stopHealthMonitoring(deploymentId) {
        const interval = this.healthChecks.get(deploymentId);
        if (interval) {
            clearInterval(interval);
            this.healthChecks.delete(deploymentId);
        }
    }
    async validateDeployments() {
        // Validate all active deployments on startup
        const activeDeployments = this.getActiveDeployments();
        for (const deployment of activeDeployments) {
            try {
                const modelVersions = this.registry.versions[deployment.modelId];
                const version = modelVersions?.find(v => v.version === deployment.version);
                if (version) {
                    this.startHealthMonitoring(deployment.id, version.config);
                }
            }
            catch (error) {
                logger_1.logger.warn(`Failed to validate deployment ${deployment.id}:`, error);
            }
        }
    }
    initializeRegistry() {
        return {
            models: {},
            versions: {},
            deployments: {},
            metadata: {
                lastUpdated: new Date().toISOString(),
                version: '1.0.0'
            }
        };
    }
    async loadRegistry() {
        try {
            const registryData = await fs_1.promises.readFile(this.registryPath, 'utf-8');
            this.registry = JSON.parse(registryData);
            logger_1.logger.info('Model registry loaded successfully');
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                logger_1.logger.info('Registry file not found, using empty registry');
                await this.saveRegistry();
            }
            else {
                logger_1.logger.error('Error loading model registry:', error);
                throw error;
            }
        }
    }
    async saveRegistry() {
        try {
            this.registry.metadata.lastUpdated = new Date().toISOString();
            await fs_1.promises.writeFile(this.registryPath, JSON.stringify(this.registry, null, 2));
        }
        catch (error) {
            logger_1.logger.error('Error saving model registry:', error);
            throw error;
        }
    }
    setupHealthMonitoring() {
        // Periodic registry backup
        setInterval(async () => {
            try {
                const backupPath = `${this.registryPath}.backup.${Date.now()}`;
                await fs_1.promises.copyFile(this.registryPath, backupPath);
                // Keep only last 5 backups
                const files = await fs_1.promises.readdir('.');
                const backupFiles = files
                    .filter(f => f.startsWith(`${this.registryPath}.backup.`))
                    .sort()
                    .reverse();
                for (const file of backupFiles.slice(5)) {
                    await fs_1.promises.unlink(file);
                }
            }
            catch (error) {
                logger_1.logger.error('Error creating registry backup:', error);
            }
        }, 60 * 60 * 1000); // Every hour
    }
}
exports.ModelManager = ModelManager;
exports.default = ModelManager;
//# sourceMappingURL=model-manager.js.map