/**
 * SecureWatch Data Lineage Tracker
 * Tracks data flow, transformations, and relationships across the system
 */

import { EventEmitter } from 'events';
import { Pool } from 'pg';
import { createHash } from 'crypto';

// Lineage Node Types
export enum LineageNodeType {
  SOURCE = 'source',
  DATASET = 'dataset',
  TRANSFORMATION = 'transformation',
  DESTINATION = 'destination',
  REPORT = 'report',
  API_ENDPOINT = 'api_endpoint',
  USER = 'user',
  SYSTEM = 'system'
}

// Lineage Relationship Types
export enum LineageRelationType {
  DERIVES_FROM = 'derives_from',
  TRANSFORMS_TO = 'transforms_to',
  COPIES_TO = 'copies_to',
  MERGES_WITH = 'merges_with',
  FILTERS_FROM = 'filters_from',
  AGGREGATES_FROM = 'aggregates_from',
  JOINS_WITH = 'joins_with',
  REFERENCES = 'references'
}

// Data Lineage Node
export interface LineageNode {
  id: string;
  type: LineageNodeType;
  name: string;
  description?: string;
  metadata: {
    dataType?: string;
    schema?: Record<string, any>;
    location?: string;
    size?: number;
    recordCount?: number;
    classification?: string;
    tags?: string[];
    version?: string;
    checksum?: string;
  };
  attributes: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  tenantId?: string;
}

// Data Lineage Edge (Relationship)
export interface LineageEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationType: LineageRelationType;
  metadata: {
    transformationQuery?: string;
    transformationLogic?: string;
    fieldMappings?: Array<{
      sourceField: string;
      targetField: string;
      transformation?: string;
    }>;
    executionTime?: Date;
    executionDuration?: number;
    recordsProcessed?: number;
    dataVolume?: number;
  };
  properties: Record<string, any>;
  createdAt: Date;
  createdBy?: string;
  tenantId?: string;
}

// Lineage Graph
export interface LineageGraph {
  nodes: LineageNode[];
  edges: LineageEdge[];
  metadata: {
    generatedAt: Date;
    rootNodeId?: string;
    depth: number;
    direction: 'upstream' | 'downstream' | 'both';
    totalNodes: number;
    totalEdges: number;
  };
}

// Lineage Query Options
export interface LineageQueryOptions {
  nodeId: string;
  direction: 'upstream' | 'downstream' | 'both';
  maxDepth?: number;
  includeTypes?: LineageNodeType[];
  excludeTypes?: LineageNodeType[];
  includeRelations?: LineageRelationType[];
  excludeRelations?: LineageRelationType[];
  timeRange?: {
    start: Date;
    end: Date;
  };
  includeMetadata?: boolean;
}

// Data Impact Analysis
export interface DataImpactAnalysis {
  sourceNode: LineageNode;
  impactedNodes: Array<{
    node: LineageNode;
    impactLevel: 'direct' | 'indirect';
    distance: number;
    path: string[];
    estimatedRecords: number;
    businessCriticality: 'low' | 'medium' | 'high' | 'critical';
  }>;
  summary: {
    totalImpacted: number;
    directlyImpacted: number;
    indirectlyImpacted: number;
    criticalSystems: number;
    estimatedDowntime: number; // minutes
  };
}

// Lineage Event
export interface LineageEvent {
  id: string;
  eventType: 'data_created' | 'data_transformed' | 'data_copied' | 'data_deleted' | 'schema_changed';
  sourceNodeId?: string;
  targetNodeId?: string;
  edgeId?: string;
  metadata: {
    operation?: string;
    query?: string;
    recordCount?: number;
    dataVolume?: number;
    duration?: number;
    user?: string;
    application?: string;
    jobId?: string;
  };
  timestamp: Date;
  tenantId?: string;
}

export class DataLineageTracker extends EventEmitter {
  private database: Pool;
  private nodes: Map<string, LineageNode> = new Map();
  private edges: Map<string, LineageEdge> = new Map();
  private nodeCache: Map<string, LineageGraph> = new Map();
  private maxCacheSize: number = 1000;

  constructor(database: Pool) {
    super();
    this.database = database;
    this.loadExistingLineage();
  }

  /**
   * Create lineage node
   */
  async createNode(node: Omit<LineageNode, 'id' | 'createdAt' | 'updatedAt'>): Promise<LineageNode> {
    const lineageNode: LineageNode = {
      ...node,
      id: this.generateNodeId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store in database
    await this.storeNode(lineageNode);

    // Cache node
    this.nodes.set(lineageNode.id, lineageNode);

    // Clear related caches
    this.clearCacheForNode(lineageNode.id);

    this.emit('nodeCreated', lineageNode);

    return lineageNode;
  }

  /**
   * Create lineage edge
   */
  async createEdge(edge: Omit<LineageEdge, 'id' | 'createdAt'>): Promise<LineageEdge> {
    // Validate that nodes exist
    if (!this.nodes.has(edge.sourceNodeId)) {
      throw new Error(`Source node not found: ${edge.sourceNodeId}`);
    }
    if (!this.nodes.has(edge.targetNodeId)) {
      throw new Error(`Target node not found: ${edge.targetNodeId}`);
    }

    const lineageEdge: LineageEdge = {
      ...edge,
      id: this.generateEdgeId(),
      createdAt: new Date(),
    };

    // Store in database
    await this.storeEdge(lineageEdge);

    // Cache edge
    this.edges.set(lineageEdge.id, lineageEdge);

    // Clear related caches
    this.clearCacheForNode(edge.sourceNodeId);
    this.clearCacheForNode(edge.targetNodeId);

    this.emit('edgeCreated', lineageEdge);

    return lineageEdge;
  }

  /**
   * Update lineage node
   */
  async updateNode(nodeId: string, updates: Partial<LineageNode>): Promise<LineageNode> {
    const existingNode = this.nodes.get(nodeId);
    if (!existingNode) {
      throw new Error(`Node not found: ${nodeId}`);
    }

    const updatedNode: LineageNode = {
      ...existingNode,
      ...updates,
      id: nodeId,
      updatedAt: new Date(),
    };

    // Update in database
    await this.updateNodeInDatabase(updatedNode);

    // Update cache
    this.nodes.set(nodeId, updatedNode);

    // Clear related caches
    this.clearCacheForNode(nodeId);

    this.emit('nodeUpdated', { old: existingNode, new: updatedNode });

    return updatedNode;
  }

  /**
   * Track data transformation
   */
  async trackTransformation(
    sourceNodeIds: string[],
    targetNodeId: string,
    transformation: {
      type: LineageRelationType;
      query?: string;
      logic?: string;
      fieldMappings?: LineageEdge['metadata']['fieldMappings'];
      metadata?: Record<string, any>;
    },
    executionInfo?: {
      executionTime?: Date;
      duration?: number;
      recordsProcessed?: number;
      dataVolume?: number;
      user?: string;
      jobId?: string;
    }
  ): Promise<LineageEdge[]> {
    const edges: LineageEdge[] = [];

    for (const sourceNodeId of sourceNodeIds) {
      const edge = await this.createEdge({
        sourceNodeId,
        targetNodeId,
        relationType: transformation.type,
        metadata: {
          transformationQuery: transformation.query,
          transformationLogic: transformation.logic,
          fieldMappings: transformation.fieldMappings,
          executionTime: executionInfo?.executionTime,
          executionDuration: executionInfo?.duration,
          recordsProcessed: executionInfo?.recordsProcessed,
          dataVolume: executionInfo?.dataVolume,
        },
        properties: transformation.metadata || {},
        createdBy: executionInfo?.user,
      });

      edges.push(edge);
    }

    // Record lineage event
    await this.recordLineageEvent({
      eventType: 'data_transformed',
      sourceNodeId: sourceNodeIds[0], // Primary source
      targetNodeId,
      metadata: {
        operation: transformation.type,
        query: transformation.query,
        recordCount: executionInfo?.recordsProcessed,
        dataVolume: executionInfo?.dataVolume,
        duration: executionInfo?.duration,
        user: executionInfo?.user,
        jobId: executionInfo?.jobId,
      },
    });

    this.emit('transformationTracked', { sourceNodeIds, targetNodeId, edges, transformation });

    return edges;
  }

  /**
   * Get lineage graph
   */
  async getLineageGraph(options: LineageQueryOptions): Promise<LineageGraph> {
    // Check cache first
    const cacheKey = this.generateCacheKey(options);
    const cached = this.nodeCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const graph = await this.buildLineageGraph(options);

    // Cache result
    this.cacheLineageGraph(cacheKey, graph);

    return graph;
  }

  /**
   * Build lineage graph
   */
  private async buildLineageGraph(options: LineageQueryOptions): Promise<LineageGraph> {
    const visitedNodes = new Set<string>();
    const visitedEdges = new Set<string>();
    const nodes: LineageNode[] = [];
    const edges: LineageEdge[] = [];

    // Start with root node
    const rootNode = this.nodes.get(options.nodeId);
    if (!rootNode) {
      throw new Error(`Root node not found: ${options.nodeId}`);
    }

    nodes.push(rootNode);
    visitedNodes.add(rootNode.id);

    // Traverse lineage
    await this.traverseLineage(
      options.nodeId,
      options.direction,
      0,
      options.maxDepth || 10,
      visitedNodes,
      visitedEdges,
      nodes,
      edges,
      options
    );

    const graph: LineageGraph = {
      nodes,
      edges,
      metadata: {
        generatedAt: new Date(),
        rootNodeId: options.nodeId,
        depth: options.maxDepth || 10,
        direction: options.direction,
        totalNodes: nodes.length,
        totalEdges: edges.length,
      },
    };

    return graph;
  }

  /**
   * Traverse lineage recursively
   */
  private async traverseLineage(
    nodeId: string,
    direction: 'upstream' | 'downstream' | 'both',
    currentDepth: number,
    maxDepth: number,
    visitedNodes: Set<string>,
    visitedEdges: Set<string>,
    nodes: LineageNode[],
    edges: LineageEdge[],
    options: LineageQueryOptions
  ): Promise<void> {
    if (currentDepth >= maxDepth) {
      return;
    }

    // Get connected edges
    const connectedEdges = this.getConnectedEdges(nodeId, direction);

    for (const edge of connectedEdges) {
      // Skip if already visited
      if (visitedEdges.has(edge.id)) {
        continue;
      }

      // Apply filters
      if (!this.edgeMatchesFilters(edge, options)) {
        continue;
      }

      // Add edge to result
      edges.push(edge);
      visitedEdges.add(edge.id);

      // Get connected node
      const connectedNodeId = direction === 'upstream' ? edge.sourceNodeId : edge.targetNodeId;
      const connectedNode = this.nodes.get(connectedNodeId);

      if (connectedNode && !visitedNodes.has(connectedNode.id)) {
        // Apply node filters
        if (this.nodeMatchesFilters(connectedNode, options)) {
          nodes.push(connectedNode);
          visitedNodes.add(connectedNode.id);

          // Continue traversal
          await this.traverseLineage(
            connectedNode.id,
            direction,
            currentDepth + 1,
            maxDepth,
            visitedNodes,
            visitedEdges,
            nodes,
            edges,
            options
          );
        }
      }
    }

    // Handle 'both' direction
    if (direction === 'both' && currentDepth === 0) {
      await this.traverseLineage(
        nodeId,
        'upstream',
        currentDepth + 1,
        maxDepth,
        visitedNodes,
        visitedEdges,
        nodes,
        edges,
        options
      );
      await this.traverseLineage(
        nodeId,
        'downstream',
        currentDepth + 1,
        maxDepth,
        visitedNodes,
        visitedEdges,
        nodes,
        edges,
        options
      );
    }
  }

  /**
   * Analyze data impact
   */
  async analyzeDataImpact(nodeId: string, maxDepth: number = 5): Promise<DataImpactAnalysis> {
    const sourceNode = this.nodes.get(nodeId);
    if (!sourceNode) {
      throw new Error(`Node not found: ${nodeId}`);
    }

    // Get downstream lineage
    const lineageGraph = await this.getLineageGraph({
      nodeId,
      direction: 'downstream',
      maxDepth,
      includeMetadata: true,
    });

    const impactedNodes: DataImpactAnalysis['impactedNodes'] = [];
    let criticalSystems = 0;

    // Analyze each impacted node
    for (const node of lineageGraph.nodes) {
      if (node.id === nodeId) continue; // Skip source node

      const distance = this.calculateDistance(nodeId, node.id, lineageGraph);
      const path = this.findShortestPath(nodeId, node.id, lineageGraph);
      const businessCriticality = this.assessBusinessCriticality(node);
      
      if (businessCriticality === 'critical') {
        criticalSystems++;
      }

      impactedNodes.push({
        node,
        impactLevel: distance === 1 ? 'direct' : 'indirect',
        distance,
        path,
        estimatedRecords: node.metadata.recordCount || 0,
        businessCriticality,
      });
    }

    const summary = {
      totalImpacted: impactedNodes.length,
      directlyImpacted: impactedNodes.filter(n => n.impactLevel === 'direct').length,
      indirectlyImpacted: impactedNodes.filter(n => n.impactLevel === 'indirect').length,
      criticalSystems,
      estimatedDowntime: this.estimateDowntime(impactedNodes),
    };

    return {
      sourceNode,
      impactedNodes,
      summary,
    };
  }

  /**
   * Find data sources for a node
   */
  async findDataSources(nodeId: string, maxDepth: number = 10): Promise<LineageNode[]> {
    const lineageGraph = await this.getLineageGraph({
      nodeId,
      direction: 'upstream',
      maxDepth,
    });

    // Find leaf nodes (sources with no incoming edges)
    const sources: LineageNode[] = [];
    
    for (const node of lineageGraph.nodes) {
      const incomingEdges = lineageGraph.edges.filter(edge => edge.targetNodeId === node.id);
      if (incomingEdges.length === 0 && node.id !== nodeId) {
        sources.push(node);
      }
    }

    return sources;
  }

  /**
   * Find data consumers for a node
   */
  async findDataConsumers(nodeId: string, maxDepth: number = 10): Promise<LineageNode[]> {
    const lineageGraph = await this.getLineageGraph({
      nodeId,
      direction: 'downstream',
      maxDepth,
    });

    // Find leaf nodes (consumers with no outgoing edges)
    const consumers: LineageNode[] = [];
    
    for (const node of lineageGraph.nodes) {
      const outgoingEdges = lineageGraph.edges.filter(edge => edge.sourceNodeId === node.id);
      if (outgoingEdges.length === 0 && node.id !== nodeId) {
        consumers.push(node);
      }
    }

    return consumers;
  }

  /**
   * Record lineage event
   */
  async recordLineageEvent(event: Omit<LineageEvent, 'id' | 'timestamp'>): Promise<LineageEvent> {
    const lineageEvent: LineageEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date(),
    };

    // Store in database
    await this.storeLineageEvent(lineageEvent);

    this.emit('lineageEventRecorded', lineageEvent);

    return lineageEvent;
  }

  /**
   * Get lineage events for a node
   */
  async getLineageEvents(
    nodeId: string,
    eventTypes?: LineageEvent['eventType'][],
    timeRange?: { start: Date; end: Date },
    limit: number = 100
  ): Promise<LineageEvent[]> {
    return await this.queryLineageEvents(nodeId, eventTypes, timeRange, limit);
  }

  /**
   * Delete node and related edges
   */
  async deleteNode(nodeId: string): Promise<void> {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }

    // Find and delete related edges
    const relatedEdges = [...this.edges.values()].filter(
      edge => edge.sourceNodeId === nodeId || edge.targetNodeId === nodeId
    );

    for (const edge of relatedEdges) {
      await this.deleteEdge(edge.id);
    }

    // Delete node
    await this.deleteNodeFromDatabase(nodeId);
    this.nodes.delete(nodeId);

    // Clear caches
    this.clearCacheForNode(nodeId);

    // Record event
    await this.recordLineageEvent({
      eventType: 'data_deleted',
      sourceNodeId: nodeId,
      metadata: {
        operation: 'delete_node',
      },
    });

    this.emit('nodeDeleted', node);
  }

  /**
   * Delete edge
   */
  async deleteEdge(edgeId: string): Promise<void> {
    const edge = this.edges.get(edgeId);
    if (!edge) {
      throw new Error(`Edge not found: ${edgeId}`);
    }

    // Delete from database
    await this.deleteEdgeFromDatabase(edgeId);
    this.edges.delete(edgeId);

    // Clear caches
    this.clearCacheForNode(edge.sourceNodeId);
    this.clearCacheForNode(edge.targetNodeId);

    this.emit('edgeDeleted', edge);
  }

  /**
   * Helper methods
   */
  private getConnectedEdges(nodeId: string, direction: 'upstream' | 'downstream'): LineageEdge[] {
    return [...this.edges.values()].filter(edge => {
      if (direction === 'upstream') {
        return edge.targetNodeId === nodeId;
      } else {
        return edge.sourceNodeId === nodeId;
      }
    });
  }

  private nodeMatchesFilters(node: LineageNode, options: LineageQueryOptions): boolean {
    if (options.includeTypes && !options.includeTypes.includes(node.type)) {
      return false;
    }
    if (options.excludeTypes && options.excludeTypes.includes(node.type)) {
      return false;
    }
    return true;
  }

  private edgeMatchesFilters(edge: LineageEdge, options: LineageQueryOptions): boolean {
    if (options.includeRelations && !options.includeRelations.includes(edge.relationType)) {
      return false;
    }
    if (options.excludeRelations && options.excludeRelations.includes(edge.relationType)) {
      return false;
    }
    if (options.timeRange) {
      if (edge.createdAt < options.timeRange.start || edge.createdAt > options.timeRange.end) {
        return false;
      }
    }
    return true;
  }

  private calculateDistance(sourceId: string, targetId: string, graph: LineageGraph): number {
    // BFS to find shortest path distance
    const queue: Array<{ nodeId: string; distance: number }> = [{ nodeId: sourceId, distance: 0 }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { nodeId, distance } = queue.shift()!;
      
      if (nodeId === targetId) {
        return distance;
      }
      
      if (visited.has(nodeId)) {
        continue;
      }
      
      visited.add(nodeId);
      
      // Find connected nodes
      const connectedEdges = graph.edges.filter(edge => edge.sourceNodeId === nodeId);
      for (const edge of connectedEdges) {
        if (!visited.has(edge.targetNodeId)) {
          queue.push({ nodeId: edge.targetNodeId, distance: distance + 1 });
        }
      }
    }
    
    return -1; // Not connected
  }

  private findShortestPath(sourceId: string, targetId: string, graph: LineageGraph): string[] {
    const queue: Array<{ nodeId: string; path: string[] }> = [{ nodeId: sourceId, path: [sourceId] }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { nodeId, path } = queue.shift()!;
      
      if (nodeId === targetId) {
        return path;
      }
      
      if (visited.has(nodeId)) {
        continue;
      }
      
      visited.add(nodeId);
      
      // Find connected nodes
      const connectedEdges = graph.edges.filter(edge => edge.sourceNodeId === nodeId);
      for (const edge of connectedEdges) {
        if (!visited.has(edge.targetNodeId)) {
          queue.push({ 
            nodeId: edge.targetNodeId, 
            path: [...path, edge.targetNodeId] 
          });
        }
      }
    }
    
    return [];
  }

  private assessBusinessCriticality(node: LineageNode): 'low' | 'medium' | 'high' | 'critical' {
    // Simple heuristic based on node type and metadata
    if (node.type === LineageNodeType.REPORT && node.metadata.tags?.includes('executive')) {
      return 'critical';
    }
    if (node.type === LineageNodeType.API_ENDPOINT && node.metadata.tags?.includes('production')) {
      return 'high';
    }
    if (node.metadata.classification === 'restricted' || node.metadata.classification === 'top_secret') {
      return 'high';
    }
    if (node.type === LineageNodeType.SYSTEM) {
      return 'medium';
    }
    return 'low';
  }

  private estimateDowntime(impactedNodes: DataImpactAnalysis['impactedNodes']): number {
    // Simple estimation based on node types and criticality
    let totalDowntime = 0;
    
    for (const impact of impactedNodes) {
      let nodeDowntime = 0;
      
      switch (impact.businessCriticality) {
        case 'critical':
          nodeDowntime = 60; // 1 hour
          break;
        case 'high':
          nodeDowntime = 30; // 30 minutes
          break;
        case 'medium':
          nodeDowntime = 15; // 15 minutes
          break;
        case 'low':
          nodeDowntime = 5; // 5 minutes
          break;
      }
      
      // Reduce downtime for indirect impacts
      if (impact.impactLevel === 'indirect') {
        nodeDowntime = nodeDowntime / 2;
      }
      
      totalDowntime = Math.max(totalDowntime, nodeDowntime);
    }
    
    return totalDowntime;
  }

  private generateCacheKey(options: LineageQueryOptions): string {
    return createHash('md5').update(JSON.stringify(options)).digest('hex');
  }

  private cacheLineageGraph(key: string, graph: LineageGraph): void {
    // Simple LRU cache implementation
    if (this.nodeCache.size >= this.maxCacheSize) {
      const firstKey = this.nodeCache.keys().next().value;
      this.nodeCache.delete(firstKey);
    }
    this.nodeCache.set(key, graph);
  }

  private clearCacheForNode(nodeId: string): void {
    // Clear all cache entries that might contain this node
    for (const [key, graph] of this.nodeCache.entries()) {
      if (graph.nodes.some(node => node.id === nodeId)) {
        this.nodeCache.delete(key);
      }
    }
  }

  // ID generators
  private generateNodeId(): string {
    return `node_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateEdgeId(): string {
    return `edge_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  // Database operation stubs - would be implemented with actual SQL
  private async loadExistingLineage(): Promise<void> {
    // Implementation would load nodes and edges from database
  }

  private async storeNode(node: LineageNode): Promise<void> {
    // Implementation would insert into lineage_nodes table
  }

  private async storeEdge(edge: LineageEdge): Promise<void> {
    // Implementation would insert into lineage_edges table
  }

  private async updateNodeInDatabase(node: LineageNode): Promise<void> {
    // Implementation would update lineage_nodes table
  }

  private async deleteNodeFromDatabase(nodeId: string): Promise<void> {
    // Implementation would delete from lineage_nodes table
  }

  private async deleteEdgeFromDatabase(edgeId: string): Promise<void> {
    // Implementation would delete from lineage_edges table
  }

  private async storeLineageEvent(event: LineageEvent): Promise<void> {
    // Implementation would insert into lineage_events table
  }

  private async queryLineageEvents(
    nodeId: string,
    eventTypes?: LineageEvent['eventType'][],
    timeRange?: { start: Date; end: Date },
    limit: number = 100
  ): Promise<LineageEvent[]> {
    // Implementation would query lineage_events table
    return [];
  }
}

// Export factory function
export const createDataLineageTracker = (database: Pool) =>
  new DataLineageTracker(database);