import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import { join } from 'path';
import { AIModelConfig, ModelVersion, ModelDeployment, AIEngineError } from '../types/ai.types';
import { LocalLLMProvider } from '../providers/local-llm-provider';
import { CloudAIProvider } from '../providers/cloud-ai-provider';
import { logger } from '../utils/logger';

interface ModelRegistry {
  models: Record<string, AIModelConfig>;
  versions: Record<string, ModelVersion[]>;
  deployments: Record<string, ModelDeployment[]>;
  metadata: {
    lastUpdated: string;
    version: string;
  };
}

interface ModelMetrics {
  modelId: string;
  version: string;
  metrics: {
    accuracy: number;
    latency: number;
    throughput: number;
    errorRate: number;
    uptime: number;
  };
  timestamp: string;
}

interface DeploymentPlan {
  modelId: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  rolloutStrategy: 'immediate' | 'gradual' | 'canary';
  healthChecks: boolean;
  rollbackEnabled: boolean;
}

/**
 * Model Management and Versioning System
 * Handles lifecycle management of AI models including deployment, versioning, and monitoring
 */
export class ModelManager extends EventEmitter {
  private localProvider: LocalLLMProvider;
  private cloudProvider: CloudAIProvider;
  private registry: ModelRegistry;
  private registryPath: string;
  private metricsHistory: Map<string, ModelMetrics[]> = new Map();
  private healthChecks: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    localProvider: LocalLLMProvider,
    cloudProvider: CloudAIProvider,
    registryPath: string = './model-registry.json'
  ) {
    super();
    this.localProvider = localProvider;
    this.cloudProvider = cloudProvider;
    this.registryPath = registryPath;
    this.registry = this.initializeRegistry();
    this.setupHealthMonitoring();
  }

  /**
   * Initialize the model manager
   */
  async initialize(): Promise<void> {
    try {
      await this.loadRegistry();
      await this.validateDeployments();
      this.emit('manager:initialized');
      logger.info('Model manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize model manager:', error);
      throw new AIEngineError(
        `Model manager initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'MANAGER_INITIALIZATION_FAILED'
      );
    }
  }

  /**
   * Register a new model
   */
  async registerModel(config: AIModelConfig): Promise<void> {
    try {
      // Validate model configuration
      this.validateModelConfig(config);

      // Test model connectivity
      await this.testModelConnectivity(config);

      // Add to registry
      this.registry.models[config.id] = config;

      // Create initial version
      const version: ModelVersion = {
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
      logger.info(`Registered model: ${config.id} (${config.provider})`);

    } catch (error) {
      logger.error(`Error registering model ${config.id}:`, error);
      throw new AIEngineError(
        `Failed to register model: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'MODEL_REGISTRATION_FAILED',
        { modelId: config.id, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Create a new model version
   */
  async createVersion(
    modelId: string,
    newConfig: Partial<AIModelConfig>,
    versionNumber?: string
  ): Promise<ModelVersion> {
    try {
      const baseModel = this.registry.models[modelId];
      if (!baseModel) {
        throw new AIEngineError(`Model not found: ${modelId}`, 'MODEL_NOT_FOUND');
      }

      const versions = this.registry.versions[modelId] || [];
      const latestVersion = versions[versions.length - 1];
      
      // Generate version number if not provided
      if (!versionNumber) {
        const [major, minor, patch] = latestVersion.version.split('.').map(Number);
        versionNumber = `${major}.${minor}.${patch + 1}`;
      }

      // Merge configurations
      const updatedConfig: AIModelConfig = {
        ...baseModel,
        ...newConfig,
        id: modelId // Ensure ID stays the same
      };

      // Validate updated configuration
      this.validateModelConfig(updatedConfig);

      // Test connectivity with new configuration
      await this.testModelConnectivity(updatedConfig);

      const newVersion: ModelVersion = {
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
      logger.info(`Created new version ${versionNumber} for model ${modelId}`);

      return newVersion;

    } catch (error) {
      logger.error(`Error creating version for model ${modelId}:`, error);
      throw new AIEngineError(
        `Failed to create model version: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'VERSION_CREATION_FAILED',
        { modelId, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Deploy a model version
   */
  async deployModel(plan: DeploymentPlan): Promise<string> {
    try {
      const { modelId, version, environment } = plan;
      
      // Validate model and version exist
      const modelVersions = this.registry.versions[modelId];
      if (!modelVersions) {
        throw new AIEngineError(`Model not found: ${modelId}`, 'MODEL_NOT_FOUND');
      }

      const modelVersion = modelVersions.find(v => v.version === version);
      if (!modelVersion) {
        throw new AIEngineError(`Version not found: ${version}`, 'VERSION_NOT_FOUND');
      }

      const deploymentId = `deploy-${modelId}-${version}-${environment}-${Date.now()}`;
      
      const deployment: ModelDeployment = {
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
      logger.info(`Deployed model ${modelId} version ${version} to ${environment}`);

      return deploymentId;

    } catch (error) {
      logger.error(`Error deploying model ${plan.modelId}:`, error);
      throw new AIEngineError(
        `Failed to deploy model: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DEPLOYMENT_FAILED',
        { modelId: plan.modelId, version: plan.version, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Rollback a deployment
   */
  async rollbackDeployment(deploymentId: string, targetVersion?: string): Promise<void> {
    try {
      const deployment = this.findDeployment(deploymentId);
      if (!deployment) {
        throw new AIEngineError(`Deployment not found: ${deploymentId}`, 'DEPLOYMENT_NOT_FOUND');
      }

      const { modelId, environment } = deployment;
      
      // Find target version to rollback to
      let rollbackVersion: ModelVersion;
      
      if (targetVersion) {
        const targetModelVersion = this.registry.versions[modelId]?.find(v => v.version === targetVersion);
        if (!targetModelVersion) {
          throw new AIEngineError(`Target version not found: ${targetVersion}`, 'VERSION_NOT_FOUND');
        }
        rollbackVersion = targetModelVersion;
      } else {
        // Use the rollbackTo field if specified, otherwise use previous version
        const versions = this.registry.versions[modelId] || [];
        const currentVersionIndex = versions.findIndex(v => v.version === deployment.version);
        
        if (currentVersionIndex <= 0) {
          throw new AIEngineError('No previous version available for rollback', 'NO_ROLLBACK_VERSION');
        }
        
        rollbackVersion = versions[currentVersionIndex - 1];
      }

      // Create rollback deployment
      const rollbackPlan: DeploymentPlan = {
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
      logger.info(`Rolled back deployment ${deploymentId} to version ${rollbackVersion.version}`);

    } catch (error) {
      logger.error(`Error rolling back deployment ${deploymentId}:`, error);
      throw new AIEngineError(
        `Failed to rollback deployment: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'ROLLBACK_FAILED',
        { deploymentId, error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Get model performance metrics
   */
  getModelMetrics(modelId: string, timeRange?: { start: string; end: string }): ModelMetrics[] {
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
  recordMetrics(metrics: ModelMetrics): void {
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
  listModels(): AIModelConfig[] {
    return Object.values(this.registry.models);
  }

  /**
   * Get model versions
   */
  getModelVersions(modelId: string): ModelVersion[] {
    return this.registry.versions[modelId] || [];
  }

  /**
   * Get active deployments
   */
  getActiveDeployments(): ModelDeployment[] {
    const allDeployments = Object.values(this.registry.deployments).flat();
    return allDeployments.filter(deployment => deployment.status === 'active');
  }

  /**
   * Get deployment by ID
   */
  getDeployment(deploymentId: string): ModelDeployment | null {
    return this.findDeployment(deploymentId);
  }

  /**
   * Deactivate a model
   */
  async deactivateModel(modelId: string): Promise<void> {
    const model = this.registry.models[modelId];
    if (!model) {
      throw new AIEngineError(`Model not found: ${modelId}`, 'MODEL_NOT_FOUND');
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
    logger.info(`Deactivated model: ${modelId}`);
  }

  private validateModelConfig(config: AIModelConfig): void {
    if (!config.id || !config.name || !config.model || !config.provider) {
      throw new AIEngineError('Invalid model configuration: missing required fields', 'INVALID_CONFIG');
    }

    if (!['local', 'cloud'].includes(config.type)) {
      throw new AIEngineError(`Invalid model type: ${config.type}`, 'INVALID_MODEL_TYPE');
    }

    if (config.temperature < 0 || config.temperature > 2) {
      throw new AIEngineError('Temperature must be between 0 and 2', 'INVALID_TEMPERATURE');
    }

    if (config.maxTokens <= 0) {
      throw new AIEngineError('Max tokens must be positive', 'INVALID_MAX_TOKENS');
    }
  }

  private async testModelConnectivity(config: AIModelConfig): Promise<void> {
    try {
      if (config.type === 'local') {
        // Test local model connectivity
        const healthStatus = await this.localProvider.checkHealth();
        const isHealthy = healthStatus.get(config.id);
        
        if (isHealthy === false) {
          throw new Error('Local model is not responding');
        }
      } else if (config.type === 'cloud') {
        // Test cloud model connectivity
        const healthStatus = await this.cloudProvider.checkHealth();
        const isHealthy = healthStatus.get(config.id);
        
        if (isHealthy === false) {
          throw new Error('Cloud model is not responding');
        }
      }
    } catch (error) {
      throw new AIEngineError(
        `Model connectivity test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CONNECTIVITY_TEST_FAILED'
      );
    }
  }

  private async executeDeployment(deployment: ModelDeployment, plan: DeploymentPlan): Promise<void> {
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

  private async performImmediateDeployment(deployment: ModelDeployment): Promise<void> {
    // Register with appropriate provider
    const modelVersions = this.registry.versions[deployment.modelId];
    const version = modelVersions?.find(v => v.version === deployment.version);
    
    if (!version) {
      throw new AIEngineError('Model version not found', 'VERSION_NOT_FOUND');
    }

    if (version.config.type === 'local') {
      await this.localProvider.registerProvider(version.config);
    } else {
      await this.cloudProvider.registerProvider(version.config);
    }
  }

  private async performGradualDeployment(deployment: ModelDeployment): Promise<void> {
    // Implement gradual rollout logic
    await this.performImmediateDeployment(deployment);
  }

  private async performCanaryDeployment(deployment: ModelDeployment): Promise<void> {
    // Implement canary deployment logic
    await this.performImmediateDeployment(deployment);
  }

  private findDeployment(deploymentId: string): ModelDeployment | null {
    for (const deployments of Object.values(this.registry.deployments)) {
      const deployment = deployments.find(d => d.id === deploymentId);
      if (deployment) {
        return deployment;
      }
    }
    return null;
  }

  private startHealthMonitoring(deploymentId: string, config: AIModelConfig): void {
    const interval = setInterval(async () => {
      try {
        let isHealthy = false;
        
        if (config.type === 'local') {
          const healthStatus = await this.localProvider.checkHealth();
          isHealthy = healthStatus.get(config.id) || false;
        } else {
          const healthStatus = await this.cloudProvider.checkHealth();
          isHealthy = healthStatus.get(config.id) || false;
        }

        if (!isHealthy) {
          this.emit('deployment:unhealthy', { deploymentId, modelId: config.id });
          logger.warn(`Health check failed for deployment ${deploymentId}`);
        }

      } catch (error) {
        logger.error(`Health check error for deployment ${deploymentId}:`, error);
      }
    }, 30000); // Check every 30 seconds

    this.healthChecks.set(deploymentId, interval);
  }

  private stopHealthMonitoring(deploymentId: string): void {
    const interval = this.healthChecks.get(deploymentId);
    if (interval) {
      clearInterval(interval);
      this.healthChecks.delete(deploymentId);
    }
  }

  private async validateDeployments(): Promise<void> {
    // Validate all active deployments on startup
    const activeDeployments = this.getActiveDeployments();
    
    for (const deployment of activeDeployments) {
      try {
        const modelVersions = this.registry.versions[deployment.modelId];
        const version = modelVersions?.find(v => v.version === deployment.version);
        
        if (version) {
          this.startHealthMonitoring(deployment.id, version.config);
        }
      } catch (error) {
        logger.warn(`Failed to validate deployment ${deployment.id}:`, error);
      }
    }
  }

  private initializeRegistry(): ModelRegistry {
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

  private async loadRegistry(): Promise<void> {
    try {
      const registryData = await fs.readFile(this.registryPath, 'utf-8');
      this.registry = JSON.parse(registryData);
      logger.info('Model registry loaded successfully');
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        logger.info('Registry file not found, using empty registry');
        await this.saveRegistry();
      } else {
        logger.error('Error loading model registry:', error);
        throw error;
      }
    }
  }

  private async saveRegistry(): Promise<void> {
    try {
      this.registry.metadata.lastUpdated = new Date().toISOString();
      await fs.writeFile(this.registryPath, JSON.stringify(this.registry, null, 2));
    } catch (error) {
      logger.error('Error saving model registry:', error);
      throw error;
    }
  }

  private setupHealthMonitoring(): void {
    // Periodic registry backup
    setInterval(async () => {
      try {
        const backupPath = `${this.registryPath}.backup.${Date.now()}`;
        await fs.copyFile(this.registryPath, backupPath);
        
        // Keep only last 5 backups
        const files = await fs.readdir('.');
        const backupFiles = files
          .filter(f => f.startsWith(`${this.registryPath}.backup.`))
          .sort()
          .reverse();
        
        for (const file of backupFiles.slice(5)) {
          await fs.unlink(file);
        }
      } catch (error) {
        logger.error('Error creating registry backup:', error);
      }
    }, 60 * 60 * 1000); // Every hour
  }
}

export default ModelManager;