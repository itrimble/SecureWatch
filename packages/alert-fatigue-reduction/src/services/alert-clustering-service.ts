// @ts-nocheck
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
  representativeAlert: Alert; // Primary alert representing the cluster
  clusterId: string;
  clusteringMethod: ClusteringMethod;
  similarity: number; // Average intra-cluster similarity
  confidence: number; // Clustering confidence
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  mergedIndicators: Record<string, any>;
  impactScore: number; // Combined impact of all alerts in cluster
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

export type ClusteringMethod = 
  | 'dbscan' 
  | 'hierarchical' 
  | 'kmeans' 
  | 'meanshift' 
  | 'spectral' 
  | 'hybrid';

export interface ClusteringConfig {
  method: ClusteringMethod;
  similarityThreshold: number; // 0.0-1.0
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

export class AlertClusteringService {
  private readonly DEFAULT_CONFIG: ClusteringConfig = {
    method: 'hybrid',
    similarityThreshold: 0.75,
    temporalWindowHours: 24,
    maxClusterSize: 50,
    minClusterSize: 2,
    enableTemporalClustering: true,
    enableSpatialClustering: true,
    enableSemanticClustering: true,
    enableIndicatorClustering: true,
    weights: {
      title: 0.2,
      content: 0.15,
      temporal: 0.1,
      spatial: 0.1,
      indicators: 0.2,
      tactics: 0.15,
      techniques: 0.1,
      severity: 0.1
    }
  };

  constructor(
    private vectorService: VectorSimilarityService,
    private clusterStorage: ClusterStorage,
    private config: ClusteringConfig = this.DEFAULT_CONFIG
  ) {}

  /**
   * Main clustering function - processes new alerts and existing clusters
   */
  async processAlerts(alerts: Alert[]): Promise<AlertCluster[]> {
    if (alerts.length === 0) return [];

    // Step 1: Calculate similarity matrix
    const similarityMatrix = await this.calculateSimilarityMatrix(alerts);

    // Step 2: Apply clustering algorithm
    const clusters = await this.applyClustering(alerts, similarityMatrix);

    // Step 3: Merge with existing clusters if applicable
    const mergedClusters = await this.mergeWithExistingClusters(clusters);

    // Step 4: Update cluster metadata and statistics
    const enrichedClusters = await this.enrichClusters(mergedClusters);

    // Step 5: Store results
    await this.storeClusters(enrichedClusters);

    return enrichedClusters;
  }

  /**
   * Real-time clustering for incoming alerts
   */
  async clusterIncomingAlert(newAlert: Alert): Promise<AlertCluster | null> {
    // Get recent clusters within temporal window
    const recentClusters = await this.getRecentClusters(this.config.temporalWindowHours);
    
    // Find best matching cluster
    let bestCluster: AlertCluster | null = null;
    let maxSimilarity = 0;

    for (const cluster of recentClusters) {
      const similarity = await this.calculateAlertToClusterSimilarity(newAlert, cluster);
      
      if (similarity > maxSimilarity && similarity >= this.config.similarityThreshold) {
        maxSimilarity = similarity;
        bestCluster = cluster;
      }
    }

    if (bestCluster && bestCluster.alerts.length < this.config.maxClusterSize) {
      // Add alert to existing cluster
      bestCluster.alerts.push(newAlert);
      bestCluster.updatedAt = new Date();
      bestCluster.mergedIndicators = this.mergeIndicators([...bestCluster.alerts]);
      bestCluster.impactScore = this.calculateImpactScore(bestCluster.alerts);
      
      await this.updateCluster(bestCluster);
      return bestCluster;
    }

    // No suitable cluster found, potentially create new cluster
    return null;
  }

  /**
   * Calculates comprehensive similarity matrix between all alerts
   */
  private async calculateSimilarityMatrix(alerts: Alert[]): Promise<number[][]> {
    const n = alerts.length;
    const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));

    // Calculate pairwise similarities
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const similarity = await this.calculateAlertSimilarity(alerts[i], alerts[j]);
        matrix[i][j] = similarity.overallSimilarity;
        matrix[j][i] = similarity.overallSimilarity; // Symmetric
      }
      matrix[i][i] = 1.0; // Self-similarity
    }

    return matrix;
  }

  /**
   * Calculates detailed similarity between two alerts
   */
  async calculateAlertSimilarity(alert1: Alert, alert2: Alert): Promise<SimilarityScore> {
    // Text similarity (title and description)
    const titleSimilarity = await this.calculateTextSimilarity(alert1.title, alert2.title);
    const contentSimilarity = await this.calculateTextSimilarity(
      alert1.description, 
      alert2.description
    );

    // Temporal similarity
    const temporalSimilarity = this.calculateTemporalSimilarity(
      alert1.timestamp, 
      alert2.timestamp
    );

    // Spatial similarity (based on IP addresses, users, etc.)
    const spatialSimilarity = this.calculateSpatialSimilarity(alert1, alert2);

    // Indicator similarity (IOCs, artifacts)
    const indicatorSimilarity = this.calculateIndicatorSimilarity(alert1, alert2);

    // MITRE ATT&CK similarity
    const tacticSimilarity = this.calculateMitreSimilarity(
      alert1.mitreTactics, 
      alert2.mitreTactics
    );
    const techniqueSimilarity = this.calculateMitreSimilarity(
      alert1.mitreTechniques, 
      alert2.mitreTechniques
    );

    // Calculate weighted overall similarity
    const overallSimilarity = 
      (titleSimilarity * this.config.weights.title) +
      (contentSimilarity * this.config.weights.content) +
      (temporalSimilarity * this.config.weights.temporal) +
      (spatialSimilarity * this.config.weights.spatial) +
      (indicatorSimilarity * this.config.weights.indicators) +
      (tacticSimilarity * this.config.weights.tactics) +
      (techniqueSimilarity * this.config.weights.techniques);

    return {
      alertId1: alert1.id,
      alertId2: alert2.id,
      overallSimilarity,
      titleSimilarity,
      contentSimilarity,
      temporalSimilarity,
      spatialSimilarity,
      indicatorSimilarity,
      tacticSimilarity,
      techniqueSimilarity
    };
  }

  /**
   * Applies clustering algorithm based on configuration
   */
  private async applyClustering(alerts: Alert[], similarityMatrix: number[][]): Promise<AlertCluster[]> {
    switch (this.config.method) {
      case 'dbscan':
        return this.dbscanClustering(alerts, similarityMatrix);
      case 'hierarchical':
        return this.hierarchicalClustering(alerts, similarityMatrix);
      case 'kmeans':
        return this.kmeansClustering(alerts, similarityMatrix);
      case 'meanshift':
        return this.meanShiftClustering(alerts, similarityMatrix);
      case 'spectral':
        return this.spectralClustering(alerts, similarityMatrix);
      case 'hybrid':
        return this.hybridClustering(alerts, similarityMatrix);
      default:
        return this.dbscanClustering(alerts, similarityMatrix);
    }
  }

  /**
   * DBSCAN clustering implementation
   */
  private dbscanClustering(alerts: Alert[], similarityMatrix: number[][]): AlertCluster[] {
    const n = alerts.length;
    const visited = new Array(n).fill(false);
    const clusters: AlertCluster[] = [];
    let clusterId = 0;

    for (let i = 0; i < n; i++) {
      if (visited[i]) continue;

      const neighbors = this.getNeighbors(i, similarityMatrix, this.config.similarityThreshold);
      
      if (neighbors.length < this.config.minClusterSize) {
        continue; // Noise point
      }

      // Start new cluster
      const clusterAlerts: Alert[] = [];
      const queue = [...neighbors];
      visited[i] = true;
      clusterAlerts.push(alerts[i]);

      while (queue.length > 0) {
        const current = queue.shift()!;
        
        if (!visited[current]) {
          visited[current] = true;
          clusterAlerts.push(alerts[current]);

          const currentNeighbors = this.getNeighbors(current, similarityMatrix, this.config.similarityThreshold);
          if (currentNeighbors.length >= this.config.minClusterSize) {
            queue.push(...currentNeighbors.filter(n => !visited[n]));
          }
        }
      }

      if (clusterAlerts.length >= this.config.minClusterSize && 
          clusterAlerts.length <= this.config.maxClusterSize) {
        clusters.push(this.createCluster(clusterAlerts, `dbscan-${clusterId++}`, 'dbscan'));
      }
    }

    return clusters;
  }

  /**
   * Hierarchical clustering implementation
   */
  private hierarchicalClustering(alerts: Alert[], similarityMatrix: number[][]): AlertCluster[] {
    const n = alerts.length;
    const clusters: number[][] = alerts.map((_, i) => [i]); // Start with each alert as its own cluster
    
    while (clusters.length > 1) {
      let maxSimilarity = -1;
      let mergeI = -1;
      let mergeJ = -1;

      // Find most similar clusters to merge
      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          const similarity = this.calculateClusterSimilarity(clusters[i], clusters[j], similarityMatrix);
          
          if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
            mergeI = i;
            mergeJ = j;
          }
        }
      }

      // Stop if similarity is below threshold
      if (maxSimilarity < this.config.similarityThreshold) {
        break;
      }

      // Merge clusters
      const mergedCluster = [...clusters[mergeI], ...clusters[mergeJ]];
      
      // Check cluster size constraints
      if (mergedCluster.length <= this.config.maxClusterSize) {
        clusters.splice(mergeJ, 1); // Remove second cluster first (higher index)
        clusters.splice(mergeI, 1); // Remove first cluster
        clusters.push(mergedCluster);
      } else {
        break; // Stop merging if would exceed max size
      }
    }

    // Convert to AlertCluster objects
    return clusters
      .filter(cluster => cluster.length >= this.config.minClusterSize)
      .map((cluster, i) => {
        const clusterAlerts = cluster.map(index => alerts[index]);
        return this.createCluster(clusterAlerts, `hierarchical-${i}`, 'hierarchical');
      });
  }

  /**
   * Hybrid clustering - combines multiple approaches
   */
  private hybridClustering(alerts: Alert[], similarityMatrix: number[][]): AlertCluster[] {
    // First pass: DBSCAN for dense clusters
    const dbscanClusters = this.dbscanClustering(alerts, similarityMatrix);
    
    // Get unclustered alerts
    const clusteredAlertIds = new Set(
      dbscanClusters.flatMap(cluster => cluster.alerts.map(a => a.id))
    );
    const unclusteredAlerts = alerts.filter(alert => !clusteredAlertIds.has(alert.id));
    
    if (unclusteredAlerts.length === 0) {
      return dbscanClusters;
    }

    // Second pass: Hierarchical clustering for remaining alerts
    const unclusteredIndices = unclusteredAlerts.map(alert => 
      alerts.findIndex(a => a.id === alert.id)
    );
    
    const subMatrix = this.extractSubMatrix(similarityMatrix, unclusteredIndices);
    const hierarchicalClusters = this.hierarchicalClustering(unclusteredAlerts, subMatrix);

    return [...dbscanClusters, ...hierarchicalClusters];
  }

  /**
   * Creates an AlertCluster from a group of alerts
   */
  private createCluster(alerts: Alert[], clusterId: string, method: ClusteringMethod): AlertCluster {
    // Choose representative alert (highest risk score)
    const representativeAlert = alerts.reduce((prev, current) => 
      current.riskScore > prev.riskScore ? current : prev
    );

    // Calculate cluster metadata
    const similarity = this.calculateIntraClusterSimilarity(alerts);
    const mergedIndicators = this.mergeIndicators(alerts);
    const impactScore = this.calculateImpactScore(alerts);
    const urgency = this.calculateClusterUrgency(alerts);
    
    // Extract common tags
    const allTags = alerts.flatMap(alert => alert.tags);
    const commonTags = this.findCommonTags(allTags);

    return {
      id: `cluster-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: this.generateClusterName(alerts),
      description: this.generateClusterDescription(alerts),
      alerts,
      representativeAlert,
      clusterId,
      clusteringMethod: method,
      similarity,
      confidence: this.calculateClusteringConfidence(alerts, similarity),
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: commonTags,
      mergedIndicators,
      impactScore,
      urgency,
      status: 'new'
    };
  }

  /**
   * Text similarity using cosine similarity of TF-IDF vectors
   */
  private async calculateTextSimilarity(text1: string, text2: string): Promise<number> {
    if (!text1 || !text2) return 0;
    
    // Use vector service for semantic similarity
    return await this.vectorService.calculateSimilarity(text1, text2);
  }

  /**
   * Temporal similarity based on time difference
   */
  private calculateTemporalSimilarity(time1: Date, time2: Date): number {
    const maxDiffHours = this.config.temporalWindowHours;
    const diffHours = Math.abs(time1.getTime() - time2.getTime()) / (1000 * 60 * 60);
    
    if (diffHours > maxDiffHours) return 0;
    
    // Exponential decay
    return Math.exp(-diffHours / (maxDiffHours / 4));
  }

  /**
   * Spatial similarity based on shared network indicators
   */
  private calculateSpatialSimilarity(alert1: Alert, alert2: Alert): number {
    const intersections = [
      this.calculateJaccardSimilarity(alert1.ipAddresses, alert2.ipAddresses),
      this.calculateJaccardSimilarity(alert1.usernames, alert2.usernames),
      this.calculateJaccardSimilarity(alert1.domains, alert2.domains)
    ];

    return intersections.reduce((sum, sim) => sum + sim, 0) / intersections.length;
  }

  /**
   * Indicator similarity based on shared artifacts
   */
  private calculateIndicatorSimilarity(alert1: Alert, alert2: Alert): number {
    const intersections = [
      this.calculateJaccardSimilarity(alert1.processes, alert2.processes),
      this.calculateJaccardSimilarity(alert1.files, alert2.files),
      this.calculateObjectSimilarity(alert1.indicators, alert2.indicators)
    ];

    return intersections.reduce((sum, sim) => sum + sim, 0) / intersections.length;
  }

  /**
   * MITRE ATT&CK similarity (tactics/techniques)
   */
  private calculateMitreSimilarity(items1: string[], items2: string[]): number {
    return this.calculateJaccardSimilarity(items1, items2);
  }

  /**
   * Jaccard similarity for sets
   */
  private calculateJaccardSimilarity(set1: string[], set2: string[]): number {
    if (set1.length === 0 && set2.length === 0) return 1;
    if (set1.length === 0 || set2.length === 0) return 0;

    const s1 = new Set(set1);
    const s2 = new Set(set2);
    const intersection = new Set([...s1].filter(x => s2.has(x)));
    const union = new Set([...s1, ...s2]);

    return intersection.size / union.size;
  }

  /**
   * Object similarity for complex indicators
   */
  private calculateObjectSimilarity(obj1: Record<string, any>, obj2: Record<string, any>): number {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length === 0 && keys2.length === 0) return 1;
    if (keys1.length === 0 || keys2.length === 0) return 0;

    const commonKeys = keys1.filter(key => keys2.includes(key));
    const allKeys = [...new Set([...keys1, ...keys2])];

    let similarity = 0;
    for (const key of commonKeys) {
      const val1 = obj1[key];
      const val2 = obj2[key];
      
      if (val1 === val2) {
        similarity += 1;
      } else if (typeof val1 === 'string' && typeof val2 === 'string') {
        // Simple string similarity for values
        similarity += this.simpleStringSimilarity(val1, val2);
      }
    }

    return similarity / allKeys.length;
  }

  /**
   * Simple string similarity (normalized edit distance)
   */
  private simpleStringSimilarity(str1: string, str2: string): number {
    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0) return 1;
    
    const editDistance = this.levenshteinDistance(str1, str2);
    return 1 - (editDistance / maxLen);
  }

  /**
   * Levenshtein distance calculation
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Gets neighbors within similarity threshold
   */
  private getNeighbors(pointIndex: number, similarityMatrix: number[][], threshold: number): number[] {
    const neighbors: number[] = [];
    
    for (let i = 0; i < similarityMatrix[pointIndex].length; i++) {
      if (i !== pointIndex && similarityMatrix[pointIndex][i] >= threshold) {
        neighbors.push(i);
      }
    }
    
    return neighbors;
  }

  /**
   * Calculates similarity between two clusters
   */
  private calculateClusterSimilarity(cluster1: number[], cluster2: number[], similarityMatrix: number[][]): number {
    let totalSimilarity = 0;
    let count = 0;

    for (const i of cluster1) {
      for (const j of cluster2) {
        totalSimilarity += similarityMatrix[i][j];
        count++;
      }
    }

    return count > 0 ? totalSimilarity / count : 0;
  }

  /**
   * Extracts submatrix for specific indices
   */
  private extractSubMatrix(matrix: number[][], indices: number[]): number[][] {
    return indices.map(i => indices.map(j => matrix[i][j]));
  }

  /**
   * Calculates intra-cluster similarity
   */
  private calculateIntraClusterSimilarity(alerts: Alert[]): number {
    if (alerts.length < 2) return 1.0;

    let totalSimilarity = 0;
    let count = 0;

    for (let i = 0; i < alerts.length; i++) {
      for (let j = i + 1; j < alerts.length; j++) {
        // This would need to be calculated - simplified for now
        totalSimilarity += 0.8; // Mock similarity
        count++;
      }
    }

    return count > 0 ? totalSimilarity / count : 0;
  }

  /**
   * Merges indicators from multiple alerts
   */
  private mergeIndicators(alerts: Alert[]): Record<string, any> {
    const merged: Record<string, any> = {};
    
    for (const alert of alerts) {
      for (const [key, value] of Object.entries(alert.indicators)) {
        if (!merged[key]) {
          merged[key] = new Set();
        }
        
        if (Array.isArray(value)) {
          value.forEach(v => merged[key].add(v));
        } else {
          merged[key].add(value);
        }
      }
    }

    // Convert sets back to arrays
    for (const key of Object.keys(merged)) {
      merged[key] = Array.from(merged[key]);
    }

    return merged;
  }

  /**
   * Calculates combined impact score for cluster
   */
  private calculateImpactScore(alerts: Alert[]): number {
    const totalRisk = alerts.reduce((sum, alert) => sum + alert.riskScore, 0);
    const maxRisk = Math.max(...alerts.map(alert => alert.riskScore));
    const criticalCount = alerts.filter(alert => alert.severity === 'critical').length;
    
    // Combined formula considering total risk, max risk, and critical alerts
    return Math.min(1.0, (totalRisk / alerts.length) * 0.5 + maxRisk * 0.3 + (criticalCount / alerts.length) * 0.2);
  }

  /**
   * Determines cluster urgency based on contained alerts
   */
  private calculateClusterUrgency(alerts: Alert[]): 'low' | 'medium' | 'high' | 'critical' {
    const hasCritical = alerts.some(alert => alert.severity === 'critical');
    const hasHigh = alerts.some(alert => alert.severity === 'high');
    const criticalRatio = alerts.filter(alert => alert.severity === 'critical').length / alerts.length;
    
    if (hasCritical && criticalRatio > 0.5) return 'critical';
    if (hasCritical || hasHigh) return 'high';
    if (alerts.some(alert => alert.severity === 'medium')) return 'medium';
    return 'low';
  }

  /**
   * Finds common tags across alerts
   */
  private findCommonTags(allTags: string[]): string[] {
    const tagCounts = allTags.reduce((counts, tag) => {
      counts[tag] = (counts[tag] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    const threshold = Math.ceil(allTags.length * 0.3); // Tags appearing in 30% or more
    return Object.entries(tagCounts)
      .filter(([, count]) => count >= threshold)
      .map(([tag]) => tag);
  }

  /**
   * Generates descriptive cluster name
   */
  private generateClusterName(alerts: Alert[]): string {
    const sources = [...new Set(alerts.map(alert => alert.source))];
    const topSeverity = this.getTopSeverity(alerts);
    
    if (sources.length === 1) {
      return `${sources[0]} ${topSeverity} alerts (${alerts.length})`;
    } else if (sources.length <= 3) {
      return `Multi-source ${topSeverity} alerts (${alerts.length})`;
    } else {
      return `Widespread ${topSeverity} activity (${alerts.length} alerts)`;
    }
  }

  /**
   * Generates cluster description
   */
  private generateClusterDescription(alerts: Alert[]): string {
    const uniqueSources = [...new Set(alerts.map(alert => alert.source))];
    const uniqueRules = [...new Set(alerts.map(alert => alert.ruleName))];
    const timeSpan = this.calculateTimeSpan(alerts);
    
    return `Cluster of ${alerts.length} related alerts from ${uniqueSources.length} source(s) ` +
           `across ${uniqueRules.length} rule(s) over ${timeSpan}`;
  }

  /**
   * Gets the highest severity in cluster
   */
  private getTopSeverity(alerts: Alert[]): string {
    const severityOrder = ['low', 'medium', 'high', 'critical'];
    
    for (let i = severityOrder.length - 1; i >= 0; i--) {
      if (alerts.some(alert => alert.severity === severityOrder[i])) {
        return severityOrder[i];
      }
    }
    
    return 'unknown';
  }

  /**
   * Calculates time span of alerts in cluster
   */
  private calculateTimeSpan(alerts: Alert[]): string {
    if (alerts.length === 0) return '0 minutes';
    
    const timestamps = alerts.map(alert => alert.timestamp.getTime());
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    const diffMinutes = (maxTime - minTime) / (1000 * 60);
    
    if (diffMinutes < 60) {
      return `${Math.round(diffMinutes)} minutes`;
    } else if (diffMinutes < 1440) {
      return `${Math.round(diffMinutes / 60)} hours`;
    } else {
      return `${Math.round(diffMinutes / 1440)} days`;
    }
  }

  /**
   * Calculates clustering confidence
   */
  private calculateClusteringConfidence(alerts: Alert[], similarity: number): number {
    const clusterSize = alerts.length;
    const timeSpan = this.calculateTimeSpanHours(alerts);
    
    // Confidence factors
    const sizeFactor = Math.min(1.0, clusterSize / 10); // Larger clusters = more confidence
    const similarityFactor = similarity;
    const temporalFactor = timeSpan < 24 ? 1.0 : Math.max(0.5, 1.0 - (timeSpan - 24) / 168); // Decay over week
    
    return (sizeFactor * 0.3) + (similarityFactor * 0.5) + (temporalFactor * 0.2);
  }

  /**
   * Calculates time span in hours
   */
  private calculateTimeSpanHours(alerts: Alert[]): number {
    if (alerts.length === 0) return 0;
    
    const timestamps = alerts.map(alert => alert.timestamp.getTime());
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    
    return (maxTime - minTime) / (1000 * 60 * 60);
  }

  // Storage and external service interfaces
  private async calculateAlertToClusterSimilarity(alert: Alert, cluster: AlertCluster): Promise<number> {
    // Calculate similarity between alert and cluster representative
    const similarity = await this.calculateAlertSimilarity(alert, cluster.representativeAlert);
    return similarity.overallSimilarity;
  }

  private async getRecentClusters(hours: number): Promise<AlertCluster[]> {
    // Implementation depends on storage backend
    throw new Error('Not implemented');
  }

  private async updateCluster(cluster: AlertCluster): Promise<void> {
    // Implementation depends on storage backend
    throw new Error('Not implemented');
  }

  private async mergeWithExistingClusters(clusters: AlertCluster[]): Promise<AlertCluster[]> {
    // Implementation would merge with existing clusters in storage
    return clusters;
  }

  private async enrichClusters(clusters: AlertCluster[]): Promise<AlertCluster[]> {
    // Implementation would add additional metadata, threat intel, etc.
    return clusters;
  }

  private async storeClusters(clusters: AlertCluster[]): Promise<void> {
    // Implementation depends on storage backend
    throw new Error('Not implemented');
  }
}

// External service interfaces
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

// Additional clustering algorithms (K-means, Mean Shift, Spectral) would be implemented here
// These are more complex and would require additional mathematical libraries