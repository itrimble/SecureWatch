import { EventEmitter } from 'events';
import { AnomalyDetectionModel, AnomalyDetectionResult } from '../types/ai.types';
interface DataPoint {
    timestamp: number;
    features: Record<string, number>;
    metadata?: Record<string, any>;
}
/**
 * Anomaly Detection Engine
 * Implements multiple ML-based anomaly detection algorithms
 */
export declare class AnomalyDetectionEngine extends EventEmitter {
    private models;
    private baselineModels;
    private isolationForests;
    private timeSeriesModels;
    private detectionCache;
    constructor();
    /**
     * Register an anomaly detection model
     */
    registerModel(model: AnomalyDetectionModel): void;
    /**
     * Train a model with historical data
     */
    trainModel(modelId: string, trainingData: DataPoint[]): Promise<void>;
    /**
     * Detect anomalies in new data
     */
    detectAnomalies(modelId: string, dataPoints: DataPoint[]): Promise<AnomalyDetectionResult[]>;
    /**
     * Update model with new data (online learning)
     */
    updateModel(modelId: string, newData: DataPoint[]): Promise<void>;
    /**
     * Get model performance metrics
     */
    getModelMetrics(modelId: string): {
        accuracy?: number;
        falsePositiveRate: number;
        falseNegativeRate: number;
        lastTrained: string;
        dataPoints: number;
    };
    private trainStatisticalModel;
    private trainIsolationForest;
    private trainTimeSeriesModel;
    private trainAutoencoderModel;
    private detectWithStatistical;
    private detectWithIsolationForest;
    private detectWithTimeSeries;
    private detectWithAutoencoder;
    private updateStatisticalModel;
    private updateTimeSeriesModel;
    private calculateCorrelationMatrix;
    private calculateCorrelation;
    private sampleData;
    private buildIsolationTree;
    private getPathLength;
    private expectedPathLength;
    private detectSeasonality;
    private calculateAutocorrelation;
    private calculateTimeSeriesBaseline;
    private predictTimeSeries;
    private estimateStandardDeviation;
    private setupCacheCleanup;
}
export default AnomalyDetectionEngine;
//# sourceMappingURL=anomaly-detection.d.ts.map