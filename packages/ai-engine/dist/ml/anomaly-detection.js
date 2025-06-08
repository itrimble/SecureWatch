"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnomalyDetectionEngine = void 0;
const events_1 = require("events");
const simple_statistics_1 = require("simple-statistics");
const ai_types_1 = require("../types/ai.types");
const logger_1 = require("../utils/logger");
/**
 * Anomaly Detection Engine
 * Implements multiple ML-based anomaly detection algorithms
 */
class AnomalyDetectionEngine extends events_1.EventEmitter {
    constructor() {
        super();
        this.models = new Map();
        this.baselineModels = new Map();
        this.isolationForests = new Map();
        this.timeSeriesModels = new Map();
        this.detectionCache = new Map();
        this.setupCacheCleanup();
    }
    /**
     * Register an anomaly detection model
     */
    registerModel(model) {
        this.models.set(model.id, model);
        this.emit('model:registered', model);
        logger_1.logger.info(`Registered anomaly detection model: ${model.name} (${model.type})`);
    }
    /**
     * Train a model with historical data
     */
    async trainModel(modelId, trainingData) {
        const model = this.models.get(modelId);
        if (!model) {
            throw new ai_types_1.AIEngineError(`Model not found: ${modelId}`, 'MODEL_NOT_FOUND');
        }
        try {
            logger_1.logger.info(`Training anomaly detection model: ${model.name}`, {
                dataPoints: trainingData.length,
                type: model.type
            });
            switch (model.type) {
                case 'statistical':
                    await this.trainStatisticalModel(modelId, model, trainingData);
                    break;
                case 'isolation-forest':
                    await this.trainIsolationForest(modelId, model, trainingData);
                    break;
                case 'time-series':
                    await this.trainTimeSeriesModel(modelId, model, trainingData);
                    break;
                case 'autoencoder':
                    await this.trainAutoencoderModel(modelId, model, trainingData);
                    break;
                default:
                    throw new ai_types_1.AIEngineError(`Unsupported model type: ${model.type}`, 'UNSUPPORTED_MODEL_TYPE');
            }
            // Update model metadata
            model.lastTrained = new Date().toISOString();
            this.models.set(modelId, model);
            this.emit('model:trained', { modelId, dataPoints: trainingData.length });
            logger_1.logger.info(`Model training completed: ${model.name}`);
        }
        catch (error) {
            logger_1.logger.error(`Error training model ${modelId}:`, error);
            throw new ai_types_1.AIEngineError(`Failed to train model: ${error instanceof Error ? error.message : 'Unknown error'}`, 'TRAINING_FAILED', { modelId, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    /**
     * Detect anomalies in new data
     */
    async detectAnomalies(modelId, dataPoints) {
        const model = this.models.get(modelId);
        if (!model) {
            throw new ai_types_1.AIEngineError(`Model not found: ${modelId}`, 'MODEL_NOT_FOUND');
        }
        try {
            const results = [];
            for (const dataPoint of dataPoints) {
                const cacheKey = `${modelId}:${JSON.stringify(dataPoint.features)}`;
                // Check cache first
                const cached = this.detectionCache.get(cacheKey);
                if (cached) {
                    results.push(cached);
                    continue;
                }
                let result;
                switch (model.type) {
                    case 'statistical':
                        result = await this.detectWithStatistical(modelId, dataPoint);
                        break;
                    case 'isolation-forest':
                        result = await this.detectWithIsolationForest(modelId, dataPoint);
                        break;
                    case 'time-series':
                        result = await this.detectWithTimeSeries(modelId, dataPoint);
                        break;
                    case 'autoencoder':
                        result = await this.detectWithAutoencoder(modelId, dataPoint);
                        break;
                    default:
                        throw new ai_types_1.AIEngineError(`Unsupported model type: ${model.type}`, 'UNSUPPORTED_MODEL_TYPE');
                }
                // Cache the result
                this.detectionCache.set(cacheKey, result);
                results.push(result);
                // Emit anomaly event if detected
                if (result.isAnomaly) {
                    this.emit('anomaly:detected', result);
                }
            }
            return results;
        }
        catch (error) {
            logger_1.logger.error(`Error detecting anomalies with model ${modelId}:`, error);
            throw new ai_types_1.AIEngineError(`Failed to detect anomalies: ${error instanceof Error ? error.message : 'Unknown error'}`, 'DETECTION_FAILED', { modelId, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    /**
     * Update model with new data (online learning)
     */
    async updateModel(modelId, newData) {
        const model = this.models.get(modelId);
        if (!model) {
            throw new ai_types_1.AIEngineError(`Model not found: ${modelId}`, 'MODEL_NOT_FOUND');
        }
        try {
            if (model.type === 'statistical') {
                await this.updateStatisticalModel(modelId, newData);
            }
            else if (model.type === 'time-series') {
                await this.updateTimeSeriesModel(modelId, newData);
            }
            else {
                logger_1.logger.warn(`Online learning not supported for model type: ${model.type}`);
            }
            this.emit('model:updated', { modelId, newDataPoints: newData.length });
        }
        catch (error) {
            logger_1.logger.error(`Error updating model ${modelId}:`, error);
            throw error;
        }
    }
    /**
     * Get model performance metrics
     */
    getModelMetrics(modelId) {
        const model = this.models.get(modelId);
        if (!model) {
            throw new ai_types_1.AIEngineError(`Model not found: ${modelId}`, 'MODEL_NOT_FOUND');
        }
        const baseline = this.baselineModels.get(modelId);
        return {
            accuracy: model.accuracy,
            falsePositiveRate: 0.05, // Placeholder values
            falseNegativeRate: 0.03,
            lastTrained: model.lastTrained,
            dataPoints: baseline?.sampleCount || 0
        };
    }
    async trainStatisticalModel(modelId, model, trainingData) {
        const features = model.trainingData.features;
        const featureValues = {};
        // Initialize feature arrays
        features.forEach(feature => {
            featureValues[feature] = [];
        });
        // Extract feature values
        trainingData.forEach(point => {
            features.forEach(feature => {
                if (point.features[feature] !== undefined) {
                    featureValues[feature].push(point.features[feature]);
                }
            });
        });
        // Calculate statistics
        const means = {};
        const stds = {};
        features.forEach(feature => {
            const values = featureValues[feature];
            if (values.length > 0) {
                means[feature] = (0, simple_statistics_1.mean)(values);
                stds[feature] = (0, simple_statistics_1.standardDeviation)(values);
            }
        });
        // Calculate correlation matrix
        const correlations = this.calculateCorrelationMatrix(featureValues, features);
        const baselineModel = {
            means,
            stds,
            correlations,
            featureNames: features,
            threshold: model.threshold,
            sampleCount: trainingData.length,
            lastUpdated: Date.now()
        };
        this.baselineModels.set(modelId, baselineModel);
    }
    async trainIsolationForest(modelId, model, trainingData) {
        const features = model.trainingData.features;
        const numTrees = model.parameters.numTrees || 100;
        const maxDepth = model.parameters.maxDepth || Math.ceil(Math.log2(trainingData.length));
        const trees = [];
        for (let i = 0; i < numTrees; i++) {
            // Sample data for this tree
            const sampleSize = Math.min(256, trainingData.length);
            const sample = this.sampleData(trainingData, sampleSize);
            // Build isolation tree
            const tree = this.buildIsolationTree(sample, features, 0, maxDepth);
            trees.push(tree);
        }
        this.isolationForests.set(modelId, trees);
    }
    async trainTimeSeriesModel(modelId, model, trainingData) {
        // Sort data by timestamp
        const sortedData = trainingData.sort((a, b) => a.timestamp - b.timestamp);
        // Extract time series values (assuming single feature for time series)
        const feature = model.trainingData.features[0];
        const timeSeries = sortedData.map(point => ({
            timestamp: point.timestamp,
            value: point.features[feature]
        }));
        // Detect seasonality
        const seasonality = this.detectSeasonality(timeSeries);
        // Calculate moving average and residuals for baseline
        this.calculateTimeSeriesBaseline(timeSeries, seasonality);
        this.timeSeriesModels.set(modelId, {
            history: timeSeries,
            seasonality
        });
    }
    async trainAutoencoderModel(modelId, model, trainingData) {
        // Placeholder for autoencoder training
        // In a real implementation, this would use TensorFlow.js or similar
        logger_1.logger.warn('Autoencoder training not yet implemented');
    }
    async detectWithStatistical(modelId, dataPoint) {
        const baseline = this.baselineModels.get(modelId);
        if (!baseline) {
            throw new ai_types_1.AIEngineError(`Baseline model not found: ${modelId}`, 'MODEL_NOT_TRAINED');
        }
        let anomalyScore = 0;
        let explanation = '';
        const anomalyFeatures = [];
        // Calculate z-scores for each feature
        for (const feature of baseline.featureNames) {
            const value = dataPoint.features[feature];
            if (value !== undefined) {
                const mean = baseline.means[feature];
                const std = baseline.stds[feature];
                if (std > 0) {
                    const zScore = Math.abs((value - mean) / std);
                    if (zScore > 2) { // More than 2 standard deviations
                        anomalyScore = Math.max(anomalyScore, zScore / 5); // Normalize to 0-1 range
                        anomalyFeatures.push(feature);
                    }
                }
            }
        }
        const isAnomaly = anomalyScore > baseline.threshold;
        if (isAnomaly) {
            explanation = `Statistical anomaly detected in features: ${anomalyFeatures.join(', ')}`;
        }
        else {
            explanation = 'No statistical anomaly detected';
        }
        return {
            id: `anomaly-${Date.now()}`,
            timestamp: new Date(dataPoint.timestamp).toISOString(),
            anomalyScore,
            isAnomaly,
            features: dataPoint.features,
            explanation,
            confidence: Math.min(anomalyScore * 2, 1), // Confidence based on anomaly score
            relatedEvents: []
        };
    }
    async detectWithIsolationForest(modelId, dataPoint) {
        const trees = this.isolationForests.get(modelId);
        if (!trees) {
            throw new ai_types_1.AIEngineError(`Isolation forest not found: ${modelId}`, 'MODEL_NOT_TRAINED');
        }
        const model = this.models.get(modelId);
        let totalPathLength = 0;
        // Calculate average path length across all trees
        for (const tree of trees) {
            const pathLength = this.getPathLength(tree, dataPoint);
            totalPathLength += pathLength;
        }
        const avgPathLength = totalPathLength / trees.length;
        const expectedPathLength = this.expectedPathLength(256); // Assuming 256 sample size
        // Anomaly score based on isolation path length
        const anomalyScore = Math.pow(2, -avgPathLength / expectedPathLength);
        const isAnomaly = anomalyScore > model.threshold;
        return {
            id: `anomaly-${Date.now()}`,
            timestamp: new Date(dataPoint.timestamp).toISOString(),
            anomalyScore,
            isAnomaly,
            features: dataPoint.features,
            explanation: isAnomaly ?
                `Isolation forest detected anomaly (score: ${anomalyScore.toFixed(3)})` :
                'No anomaly detected by isolation forest',
            confidence: anomalyScore,
            relatedEvents: []
        };
    }
    async detectWithTimeSeries(modelId, dataPoint) {
        const tsModel = this.timeSeriesModels.get(modelId);
        if (!tsModel) {
            throw new ai_types_1.AIEngineError(`Time series model not found: ${modelId}`, 'MODEL_NOT_TRAINED');
        }
        const model = this.models.get(modelId);
        const feature = model.trainingData.features[0];
        const value = dataPoint.features[feature];
        // Predict based on historical data and seasonality
        const predicted = this.predictTimeSeries(tsModel, dataPoint.timestamp);
        const residual = Math.abs(value - predicted);
        // Calculate anomaly score based on residual
        const historicalResiduals = tsModel.history
            .filter(p => p.residual !== undefined)
            .map(p => p.residual);
        const residualMean = historicalResiduals.length > 0 ? (0, simple_statistics_1.mean)(historicalResiduals) : 0;
        const residualStd = historicalResiduals.length > 1 ? (0, simple_statistics_1.standardDeviation)(historicalResiduals) : 1;
        const anomalyScore = residualStd > 0 ? Math.min(residual / (residualMean + 2 * residualStd), 1) : 0;
        const isAnomaly = anomalyScore > model.threshold;
        // Update model history
        tsModel.history.push({
            timestamp: dataPoint.timestamp,
            value,
            predicted,
            residual
        });
        // Keep only recent history
        if (tsModel.history.length > 1000) {
            tsModel.history = tsModel.history.slice(-1000);
        }
        return {
            id: `anomaly-${Date.now()}`,
            timestamp: new Date(dataPoint.timestamp).toISOString(),
            anomalyScore,
            isAnomaly,
            features: { ...dataPoint.features, predicted, residual },
            explanation: isAnomaly ?
                `Time series anomaly: value ${value}, predicted ${predicted.toFixed(2)}` :
                'Value within expected range',
            confidence: Math.min(anomalyScore * 2, 1),
            relatedEvents: []
        };
    }
    async detectWithAutoencoder(modelId, dataPoint) {
        // Placeholder for autoencoder detection
        return {
            id: `anomaly-${Date.now()}`,
            timestamp: new Date(dataPoint.timestamp).toISOString(),
            anomalyScore: 0,
            isAnomaly: false,
            features: dataPoint.features,
            explanation: 'Autoencoder detection not yet implemented',
            confidence: 0,
            relatedEvents: []
        };
    }
    async updateStatisticalModel(modelId, newData) {
        const baseline = this.baselineModels.get(modelId);
        if (!baseline) {
            throw new ai_types_1.AIEngineError(`Baseline model not found: ${modelId}`, 'MODEL_NOT_TRAINED');
        }
        // Update running statistics with new data
        const totalSamples = baseline.sampleCount + newData.length;
        for (const feature of baseline.featureNames) {
            const newValues = newData
                .map(point => point.features[feature])
                .filter(val => val !== undefined);
            if (newValues.length > 0) {
                // Update running mean and standard deviation
                const oldMean = baseline.means[feature];
                const newMean = (0, simple_statistics_1.mean)(newValues);
                const combinedMean = (oldMean * baseline.sampleCount + newMean * newValues.length) / totalSamples;
                baseline.means[feature] = combinedMean;
                // For simplicity, recalculate std dev (in production, use running variance)
                baseline.stds[feature] = this.estimateStandardDeviation(baseline.means[feature], newValues);
            }
        }
        baseline.sampleCount = totalSamples;
        baseline.lastUpdated = Date.now();
    }
    async updateTimeSeriesModel(modelId, newData) {
        const tsModel = this.timeSeriesModels.get(modelId);
        if (!tsModel) {
            throw new ai_types_1.AIEngineError(`Time series model not found: ${modelId}`, 'MODEL_NOT_TRAINED');
        }
        // Add new data points to history
        const model = this.models.get(modelId);
        const feature = model.trainingData.features[0];
        newData.forEach(point => {
            tsModel.history.push({
                timestamp: point.timestamp,
                value: point.features[feature]
            });
        });
        // Keep only recent history
        if (tsModel.history.length > 1000) {
            tsModel.history = tsModel.history.slice(-1000);
        }
        // Re-calculate baseline
        this.calculateTimeSeriesBaseline(tsModel.history, tsModel.seasonality);
    }
    calculateCorrelationMatrix(featureValues, features) {
        const matrix = [];
        for (let i = 0; i < features.length; i++) {
            matrix[i] = [];
            for (let j = 0; j < features.length; j++) {
                if (i === j) {
                    matrix[i][j] = 1;
                }
                else {
                    const correlation = this.calculateCorrelation(featureValues[features[i]], featureValues[features[j]]);
                    matrix[i][j] = correlation;
                }
            }
        }
        return matrix;
    }
    calculateCorrelation(x, y) {
        if (x.length !== y.length || x.length === 0)
            return 0;
        const meanX = (0, simple_statistics_1.mean)(x);
        const meanY = (0, simple_statistics_1.mean)(y);
        let numerator = 0;
        let denominatorX = 0;
        let denominatorY = 0;
        for (let i = 0; i < x.length; i++) {
            const diffX = x[i] - meanX;
            const diffY = y[i] - meanY;
            numerator += diffX * diffY;
            denominatorX += diffX * diffX;
            denominatorY += diffY * diffY;
        }
        const denominator = Math.sqrt(denominatorX * denominatorY);
        return denominator === 0 ? 0 : numerator / denominator;
    }
    sampleData(data, sampleSize) {
        const shuffled = [...data].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, sampleSize);
    }
    buildIsolationTree(data, features, depth, maxDepth) {
        if (depth >= maxDepth || data.length <= 1) {
            return {
                feature: '',
                threshold: 0,
                isLeaf: true,
                depth,
                size: data.length
            };
        }
        // Randomly select feature and threshold
        const feature = features[Math.floor(Math.random() * features.length)];
        const values = data.map(point => point.features[feature]).filter(val => val !== undefined);
        if (values.length === 0) {
            return {
                feature: '',
                threshold: 0,
                isLeaf: true,
                depth,
                size: data.length
            };
        }
        const minVal = Math.min(...values);
        const maxVal = Math.max(...values);
        const threshold = minVal + Math.random() * (maxVal - minVal);
        // Split data
        const leftData = data.filter(point => point.features[feature] < threshold);
        const rightData = data.filter(point => point.features[feature] >= threshold);
        return {
            feature,
            threshold,
            left: this.buildIsolationTree(leftData, features, depth + 1, maxDepth),
            right: this.buildIsolationTree(rightData, features, depth + 1, maxDepth),
            isLeaf: false,
            depth,
            size: data.length
        };
    }
    getPathLength(tree, dataPoint) {
        if (tree.isLeaf) {
            return tree.depth + this.expectedPathLength(tree.size);
        }
        const value = dataPoint.features[tree.feature];
        if (value < tree.threshold && tree.left) {
            return this.getPathLength(tree.left, dataPoint);
        }
        else if (tree.right) {
            return this.getPathLength(tree.right, dataPoint);
        }
        return tree.depth;
    }
    expectedPathLength(n) {
        if (n <= 1)
            return 0;
        return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1)) / n;
    }
    detectSeasonality(timeSeries) {
        // Simple autocorrelation-based seasonality detection
        if (timeSeries.length < 10)
            return 1;
        const values = timeSeries.map(p => p.value);
        let maxCorrelation = 0;
        let bestLag = 1;
        for (let lag = 1; lag <= Math.min(timeSeries.length / 2, 50); lag++) {
            const correlation = this.calculateAutocorrelation(values, lag);
            if (correlation > maxCorrelation) {
                maxCorrelation = correlation;
                bestLag = lag;
            }
        }
        return bestLag;
    }
    calculateAutocorrelation(values, lag) {
        if (lag >= values.length)
            return 0;
        const x = values.slice(0, values.length - lag);
        const y = values.slice(lag);
        return Math.abs(this.calculateCorrelation(x, y));
    }
    calculateTimeSeriesBaseline(timeSeries, seasonality) {
        // Calculate moving average and residuals
        const windowSize = Math.max(seasonality, 5);
        for (let i = windowSize; i < timeSeries.length; i++) {
            const window = timeSeries.slice(i - windowSize, i);
            const predicted = (0, simple_statistics_1.mean)(window.map(p => p.value));
            const residual = Math.abs(timeSeries[i].value - predicted);
            timeSeries[i].predicted = predicted;
            timeSeries[i].residual = residual;
        }
    }
    predictTimeSeries(tsModel, timestamp) {
        if (tsModel.history.length === 0)
            return 0;
        // Simple prediction based on recent trend and seasonality
        const recentPoints = tsModel.history.slice(-tsModel.seasonality * 2);
        const recentValues = recentPoints.map(p => p.value);
        if (recentValues.length === 0)
            return 0;
        // Use simple moving average as prediction
        return (0, simple_statistics_1.mean)(recentValues);
    }
    estimateStandardDeviation(mean, values) {
        if (values.length <= 1)
            return 1;
        const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
        const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
        return Math.sqrt(avgSquaredDiff);
    }
    setupCacheCleanup() {
        // Clean up detection cache every 30 minutes
        setInterval(() => {
            this.detectionCache.clear();
        }, 30 * 60 * 1000);
    }
}
exports.AnomalyDetectionEngine = AnomalyDetectionEngine;
exports.default = AnomalyDetectionEngine;
//# sourceMappingURL=anomaly-detection.js.map