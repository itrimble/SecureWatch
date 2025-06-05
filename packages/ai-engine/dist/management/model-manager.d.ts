import { EventEmitter } from 'events';
import { AIModelConfig, ModelVersion, ModelDeployment } from '../types/ai.types';
import { LocalLLMProvider } from '../providers/local-llm-provider';
import { CloudAIProvider } from '../providers/cloud-ai-provider';
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
export declare class ModelManager extends EventEmitter {
    private localProvider;
    private cloudProvider;
    private registry;
    private registryPath;
    private metricsHistory;
    private healthChecks;
    constructor(localProvider: LocalLLMProvider, cloudProvider: CloudAIProvider, registryPath?: string);
    /**
     * Initialize the model manager
     */
    initialize(): Promise<void>;
    /**
     * Register a new model
     */
    registerModel(config: AIModelConfig): Promise<void>;
    /**
     * Create a new model version
     */
    createVersion(modelId: string, newConfig: Partial<AIModelConfig>, versionNumber?: string): Promise<ModelVersion>;
    /**
     * Deploy a model version
     */
    deployModel(plan: DeploymentPlan): Promise<string>;
    /**
     * Rollback a deployment
     */
    rollbackDeployment(deploymentId: string, targetVersion?: string): Promise<void>;
    /**
     * Get model performance metrics
     */
    getModelMetrics(modelId: string, timeRange?: {
        start: string;
        end: string;
    }): ModelMetrics[];
    /**
     * Record model performance metrics
     */
    recordMetrics(metrics: ModelMetrics): void;
    /**
     * List all registered models
     */
    listModels(): AIModelConfig[];
    /**
     * Get model versions
     */
    getModelVersions(modelId: string): ModelVersion[];
    /**
     * Get active deployments
     */
    getActiveDeployments(): ModelDeployment[];
    /**
     * Get deployment by ID
     */
    getDeployment(deploymentId: string): ModelDeployment | null;
    /**
     * Deactivate a model
     */
    deactivateModel(modelId: string): Promise<void>;
    private validateModelConfig;
    private testModelConnectivity;
    private executeDeployment;
    private performImmediateDeployment;
    private performGradualDeployment;
    private performCanaryDeployment;
    private findDeployment;
    private startHealthMonitoring;
    private stopHealthMonitoring;
    private validateDeployments;
    private initializeRegistry;
    private loadRegistry;
    private saveRegistry;
    private setupHealthMonitoring;
}
export default ModelManager;
//# sourceMappingURL=model-manager.d.ts.map