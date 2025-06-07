/**
 * Alert Clustering Service
 *
 * Implements advanced clustering algorithms for alert deduplication,
 * grouping similar alerts, and reducing analyst workload through
 * intelligent alert aggregation.
 */
export interface Alert {
    id: string;
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    source: string;
    timestamp: Date;
    ruleId: string;
    ruleName: string;
    indicators: Record<string, any>;
    tags: string[];
    ipAddresses: string[];
    usernames: string[];
    processes: string[];
    files: string[];
    domains: string[];
    signature?: string;
    mitreTactics: string[];
    mitreTechniques: string[];
    riskScore: number;
    confidence: number;
}
export interface AlertCluster {
    id: string;
    name: string;
    description: string;
    alerts: Alert[];
    representativeAlert: Alert;
    clusterId: string;
    clusteringMethod: ClusteringMethod;
    similarity: number;
    confidence: number;
    createdAt: Date;
    updatedAt: Date;
    tags: string[];
    mergedIndicators: Record<string, any>;
    impactScore: number;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    analystAssigned?: string;
    status: 'new' | 'investigating' | 'resolved' | 'false_positive';
}
export interface SimilarityScore {
    alertId1: string;
    alertId2: string;
    overallSimilarity: number;
    titleSimilarity: number;
    contentSimilarity: number;
    temporalSimilarity: number;
    spatialSimilarity: number;
    indicatorSimilarity: number;
    tacticSimilarity: number;
    techniqueSimilarity: number;
}
export type ClusteringMethod = 'dbscan' | 'hierarchical' | 'kmeans' | 'meanshift' | 'spectral' | 'hybrid';
export interface ClusteringConfig {
    method: ClusteringMethod;
    similarityThreshold: number;
    temporalWindowHours: number;
    maxClusterSize: number;
    minClusterSize: number;
    enableTemporalClustering: boolean;
    enableSpatialClustering: boolean;
    enableSemanticClustering: boolean;
    enableIndicatorClustering: boolean;
    weights: SimilarityWeights;
}
export interface SimilarityWeights {
    title: number;
    content: number;
    temporal: number;
    spatial: number;
    indicators: number;
    tactics: number;
    techniques: number;
    severity: number;
}
export declare class AlertClusteringService {
    private vectorService;
    private clusterStorage;
    private config;
    private readonly DEFAULT_CONFIG;
    constructor(vectorService: VectorSimilarityService, clusterStorage: ClusterStorage, config?: ClusteringConfig);
    /**
     * Main clustering function - processes new alerts and existing clusters
     */
    processAlerts(alerts: Alert[]): Promise<AlertCluster[]>;
    /**
     * Real-time clustering for incoming alerts
     */
    clusterIncomingAlert(newAlert: Alert): Promise<AlertCluster | null>;
    /**
     * Calculates comprehensive similarity matrix between all alerts
     */
    private calculateSimilarityMatrix;
    /**
     * Calculates detailed similarity between two alerts
     */
    calculateAlertSimilarity(alert1: Alert, alert2: Alert): Promise<SimilarityScore>;
    /**
     * Applies clustering algorithm based on configuration
     */
    private applyClustering;
    /**
     * DBSCAN clustering implementation
     */
    private dbscanClustering;
    /**
     * Hierarchical clustering implementation
     */
    private hierarchicalClustering;
    /**
     * Hybrid clustering - combines multiple approaches
     */
    private hybridClustering;
    /**
     * Creates an AlertCluster from a group of alerts
     */
    private createCluster;
    /**
     * Text similarity using cosine similarity of TF-IDF vectors
     */
    private calculateTextSimilarity;
    /**
     * Temporal similarity based on time difference
     */
    private calculateTemporalSimilarity;
    /**
     * Spatial similarity based on shared network indicators
     */
    private calculateSpatialSimilarity;
    /**
     * Indicator similarity based on shared artifacts
     */
    private calculateIndicatorSimilarity;
    /**
     * MITRE ATT&CK similarity (tactics/techniques)
     */
    private calculateMitreSimilarity;
    /**
     * Jaccard similarity for sets
     */
    private calculateJaccardSimilarity;
    /**
     * Object similarity for complex indicators
     */
    private calculateObjectSimilarity;
    /**
     * Simple string similarity (normalized edit distance)
     */
    private simpleStringSimilarity;
    /**
     * Levenshtein distance calculation
     */
    private levenshteinDistance;
    /**
     * Gets neighbors within similarity threshold
     */
    private getNeighbors;
    /**
     * Calculates similarity between two clusters
     */
    private calculateClusterSimilarity;
    /**
     * Extracts submatrix for specific indices
     */
    private extractSubMatrix;
    /**
     * Calculates intra-cluster similarity
     */
    private calculateIntraClusterSimilarity;
    /**
     * Merges indicators from multiple alerts
     */
    private mergeIndicators;
    /**
     * Calculates combined impact score for cluster
     */
    private calculateImpactScore;
    /**
     * Determines cluster urgency based on contained alerts
     */
    private calculateClusterUrgency;
    /**
     * Finds common tags across alerts
     */
    private findCommonTags;
    /**
     * Generates descriptive cluster name
     */
    private generateClusterName;
    /**
     * Generates cluster description
     */
    private generateClusterDescription;
    /**
     * Gets the highest severity in cluster
     */
    private getTopSeverity;
    /**
     * Calculates time span of alerts in cluster
     */
    private calculateTimeSpan;
    /**
     * Calculates clustering confidence
     */
    private calculateClusteringConfidence;
    /**
     * Calculates time span in hours
     */
    private calculateTimeSpanHours;
    private calculateAlertToClusterSimilarity;
    private getRecentClusters;
    private updateCluster;
    private mergeWithExistingClusters;
    private enrichClusters;
    private storeClusters;
}
export interface VectorSimilarityService {
    calculateSimilarity(text1: string, text2: string): Promise<number>;
    generateEmbedding(text: string): Promise<number[]>;
}
export interface ClusterStorage {
    store(cluster: AlertCluster): Promise<void>;
    update(cluster: AlertCluster): Promise<void>;
    getRecent(hours: number): Promise<AlertCluster[]>;
    getByStatus(status: string): Promise<AlertCluster[]>;
    delete(clusterId: string): Promise<void>;
}
//# sourceMappingURL=alert-clustering-service.d.ts.map