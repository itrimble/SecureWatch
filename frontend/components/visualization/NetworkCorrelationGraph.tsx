"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Network, 
  Users, 
  Server, 
  AlertTriangle, 
  Eye, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Settings,
  Download
} from "lucide-react";

interface NetworkNode {
  id: string;
  label: string;
  type: 'user' | 'device' | 'server' | 'threat' | 'process';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  size: number;
  metadata: Record<string, unknown>;
}

interface NetworkEdge {
  source: string;
  target: string;
  type: 'connection' | 'communication' | 'attack' | 'data_flow';
  weight: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  metadata: Record<string, unknown>;
}

interface NetworkGraphData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

const NODE_TYPES = {
  user: { color: '#3b82f6', icon: Users, label: 'User' },
  device: { color: '#10b981', icon: Server, label: 'Device' },
  server: { color: '#8b5cf6', icon: Server, label: 'Server' },
  threat: { color: '#ef4444', icon: AlertTriangle, label: 'Threat' },
  process: { color: '#f59e0b', icon: Settings, label: 'Process' }
};

const RISK_COLORS = {
  low: '#10b981',      // Green
  medium: '#f59e0b',   // Amber
  high: '#ef4444',     // Red
  critical: '#dc2626'  // Dark red
};

const EDGE_TYPES = {
  connection: { color: '#6b7280', strokeWidth: 2, label: 'Connection' },
  communication: { color: '#3b82f6', strokeWidth: 3, label: 'Communication' },
  attack: { color: '#ef4444', strokeWidth: 4, label: 'Attack Vector' },
  data_flow: { color: '#10b981', strokeWidth: 2, label: 'Data Flow' }
};

// Generate mock network data
const generateMockNetworkData = (scenario: string): NetworkGraphData => {
  const nodes: NetworkNode[] = [];
  const edges: NetworkEdge[] = [];

  switch (scenario) {
    case 'lateral-movement':
      // Simulated lateral movement attack scenario
      nodes.push(
        { id: 'user1', label: 'john.doe', type: 'user', riskLevel: 'critical', size: 30, 
          metadata: { department: 'IT', lastLogin: '2024-06-03T10:30:00Z', compromised: true }},
        { id: 'workstation1', label: 'WS-IT-001', type: 'device', riskLevel: 'high', size: 25,
          metadata: { os: 'Windows 11', ip: '192.168.1.101', infected: true }},
        { id: 'server1', label: 'FILE-SRV-01', type: 'server', riskLevel: 'medium', size: 35,
          metadata: { role: 'File Server', ip: '192.168.1.10', accessed: true }},
        { id: 'server2', label: 'DC-01', type: 'server', riskLevel: 'critical', size: 40,
          metadata: { role: 'Domain Controller', ip: '192.168.1.5', targeted: true }},
        { id: 'threat1', label: 'APT-29', type: 'threat', riskLevel: 'critical', size: 20,
          metadata: { threatType: 'Advanced Persistent Threat', firstSeen: '2024-06-03T09:15:00Z' }}
      );

      edges.push(
        { source: 'threat1', target: 'user1', type: 'attack', weight: 10, riskLevel: 'critical',
          metadata: { method: 'Phishing Email', timestamp: '2024-06-03T09:15:00Z' }},
        { source: 'user1', target: 'workstation1', type: 'connection', weight: 8, riskLevel: 'high',
          metadata: { loginType: 'Interactive', timestamp: '2024-06-03T10:30:00Z' }},
        { source: 'workstation1', target: 'server1', type: 'attack', weight: 7, riskLevel: 'high',
          metadata: { method: 'SMB Exploitation', timestamp: '2024-06-03T11:45:00Z' }},
        { source: 'server1', target: 'server2', type: 'attack', weight: 9, riskLevel: 'critical',
          metadata: { method: 'Credential Theft', timestamp: '2024-06-03T12:30:00Z' }}
      );
      break;

    case 'data-exfiltration':
      nodes.push(
        { id: 'user2', label: 'alice.smith', type: 'user', riskLevel: 'medium', size: 25,
          metadata: { department: 'Finance', clearanceLevel: 'High', activity: 'Suspicious' }},
        { id: 'database1', label: 'PAYROLL-DB', type: 'server', riskLevel: 'high', size: 35,
          metadata: { type: 'Database Server', dataClassification: 'Confidential' }},
        { id: 'external1', label: 'External Site', type: 'threat', riskLevel: 'high', size: 30,
          metadata: { domain: 'suspicious-site.com', country: 'Unknown' }},
        { id: 'process1', label: 'PowerShell', type: 'process', riskLevel: 'high', size: 20,
          metadata: { cmdline: 'Invoke-WebRequest', suspicious: true }}
      );

      edges.push(
        { source: 'user2', target: 'database1', type: 'data_flow', weight: 6, riskLevel: 'medium',
          metadata: { queryType: 'SELECT *', recordCount: 50000 }},
        { source: 'database1', target: 'process1', type: 'data_flow', weight: 8, riskLevel: 'high',
          metadata: { dataVolume: '500MB', compressionType: 'ZIP' }},
        { source: 'process1', target: 'external1', type: 'communication', weight: 9, riskLevel: 'critical',
          metadata: { protocol: 'HTTPS', dataTransferred: '500MB' }}
      );
      break;

    case 'insider-threat':
      nodes.push(
        { id: 'user3', label: 'bob.wilson', type: 'user', riskLevel: 'high', size: 30,
          metadata: { department: 'Engineering', accessLevel: 'Admin', behaviorScore: 8.5 }},
        { id: 'workstation2', label: 'ENG-WS-042', type: 'device', riskLevel: 'medium', size: 25,
          metadata: { afterHoursAccess: true, unusualActivity: true }},
        { id: 'codeRepo', label: 'GIT-REPO-01', type: 'server', riskLevel: 'high', size: 35,
          metadata: { repository: 'core-product', commits: 'Unusual pattern' }},
        { id: 'cloudStorage', label: 'Personal Cloud', type: 'threat', riskLevel: 'high', size: 25,
          metadata: { service: 'Dropbox', uploadVolume: 'High' }}
      );

      edges.push(
        { source: 'user3', target: 'workstation2', type: 'connection', weight: 5, riskLevel: 'medium',
          metadata: { timeFrame: 'After Hours', frequency: 'Daily' }},
        { source: 'workstation2', target: 'codeRepo', type: 'data_flow', weight: 7, riskLevel: 'high',
          metadata: { action: 'Bulk Download', filesCount: 1250 }},
        { source: 'workstation2', target: 'cloudStorage', type: 'communication', weight: 8, riskLevel: 'critical',
          metadata: { uploadSize: '2.5GB', fileTypes: ['source', 'documentation'] }}
      );
      break;

    case 'network-topology':
      // Basic network topology view
      nodes.push(
        { id: 'fw1', label: 'Firewall', type: 'device', riskLevel: 'low', size: 30,
          metadata: { role: 'Perimeter Defense', rules: 2847 }},
        { id: 'sw1', label: 'Core Switch', type: 'device', riskLevel: 'low', size: 25,
          metadata: { vlanCount: 15, portUtilization: '67%' }},
        { id: 'web1', label: 'Web Server', type: 'server', riskLevel: 'medium', size: 30,
          metadata: { service: 'Apache', requests: '15K/hour' }},
        { id: 'app1', label: 'App Server', type: 'server', riskLevel: 'low', size: 35,
          metadata: { service: 'Node.js', connections: 450 }},
        { id: 'db1', label: 'Database', type: 'server', riskLevel: 'medium', size: 40,
          metadata: { type: 'PostgreSQL', size: '2.5TB' }}
      );

      edges.push(
        { source: 'fw1', target: 'sw1', type: 'connection', weight: 5, riskLevel: 'low',
          metadata: { bandwidth: '1Gbps', utilization: '25%' }},
        { source: 'sw1', target: 'web1', type: 'connection', weight: 6, riskLevel: 'low',
          metadata: { vlan: 'DMZ', port: 'Gi0/1' }},
        { source: 'web1', target: 'app1', type: 'communication', weight: 7, riskLevel: 'medium',
          metadata: { protocol: 'HTTP', requests: '12K/hour' }},
        { source: 'app1', target: 'db1', type: 'data_flow', weight: 8, riskLevel: 'medium',
          metadata: { protocol: 'PostgreSQL', queries: '5K/hour' }}
      );
      break;
  }

  return { nodes, edges };
};

const SCENARIOS = [
  { id: 'lateral-movement', name: 'Lateral Movement Attack', description: 'APT-style attack progression' },
  { id: 'data-exfiltration', name: 'Data Exfiltration', description: 'Unauthorized data theft scenario' },
  { id: 'insider-threat', name: 'Insider Threat', description: 'Malicious insider activity' },
  { id: 'network-topology', name: 'Network Topology', description: 'Basic network infrastructure' }
];

export default function NetworkCorrelationGraph() {
  const [selectedScenario, setSelectedScenario] = useState('lateral-movement');
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showNodeLabels, setShowNodeLabels] = useState(true);
  const [filterRiskLevel, setFilterRiskLevel] = useState<string>('all');

  const networkData = useMemo(() => {
    return generateMockNetworkData(selectedScenario);
  }, [selectedScenario]);

  const filteredData = useMemo(() => {
    if (filterRiskLevel === 'all') return networkData;
    
    const filteredNodes = networkData.nodes.filter(node => node.riskLevel === filterRiskLevel);
    const nodeIds = new Set(filteredNodes.map(node => node.id));
    const filteredEdges = networkData.edges.filter(edge => 
      nodeIds.has(edge.source) && nodeIds.has(edge.target)
    );
    
    return { nodes: filteredNodes, edges: filteredEdges };
  }, [networkData, filterRiskLevel]);

  const handleNodeClick = useCallback((node: NetworkNode) => {
    setSelectedNode(node);
  }, []);

  const resetView = () => {
    setZoomLevel(1);
    setSelectedNode(null);
  };

  // Calculate node positions using a simple force-directed layout simulation
  const nodePositions = useMemo(() => {
    const positions: { [key: string]: { x: number; y: number } } = {};
    const width = 800;
    const height = 400;
    
    filteredData.nodes.forEach((node, index) => {
      const angle = (index / filteredData.nodes.length) * 2 * Math.PI;
      const radius = Math.min(width, height) * 0.3;
      positions[node.id] = {
        x: width / 2 + radius * Math.cos(angle),
        y: height / 2 + radius * Math.sin(angle)
      };
    });
    
    return positions;
  }, [filteredData]);

  const riskStats = useMemo(() => {
    const stats = { critical: 0, high: 0, medium: 0, low: 0 };
    filteredData.nodes.forEach(node => {
      stats[node.riskLevel]++;
    });
    return stats;
  }, [filteredData]);

  return (
    <TooltipProvider>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Network className="w-5 h-5" />
              Network Correlation Analysis
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={selectedScenario} onValueChange={setSelectedScenario}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCENARIOS.map((scenario) => (
                    <SelectItem key={scenario.id} value={scenario.id}>
                      {scenario.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterRiskLevel} onValueChange={setFilterRiskLevel}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risk</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm">
              {SCENARIOS.find(s => s.id === selectedScenario)?.description}
            </p>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={() => setZoomLevel(prev => Math.min(prev * 1.2, 3))}>
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom In</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={() => setZoomLevel(prev => Math.max(prev / 1.2, 0.5))}>
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom Out</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={resetView}>
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reset View</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Download className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export Graph</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {/* Risk Level Statistics */}
            <div className="flex items-center gap-4 mb-4">
              {Object.entries(riskStats).map(([level, count]) => (
                <Badge 
                  key={level} 
                  variant="outline" 
                  className="capitalize"
                  style={{ borderColor: RISK_COLORS[level as keyof typeof RISK_COLORS] }}
                >
                  <div 
                    className="w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: RISK_COLORS[level as keyof typeof RISK_COLORS] }}
                  />
                  {level}: {count}
                </Badge>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Network Graph Visualization */}
              <div className="lg:col-span-3">
                <div 
                  className="relative bg-gray-900 rounded-lg border border-gray-600"
                  style={{ height: '500px', overflow: 'hidden' }}
                >
                  <svg 
                    width="100%" 
                    height="100%" 
                    style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center' }}
                  >
                    {/* Render edges */}
                    {filteredData.edges.map((edge, index) => {
                      const sourcePos = nodePositions[edge.source];
                      const targetPos = nodePositions[edge.target];
                      if (!sourcePos || !targetPos) return null;
                      
                      const edgeStyle = EDGE_TYPES[edge.type];
                      
                      return (
                        <g key={`edge-${index}`}>
                          <line
                            x1={sourcePos.x}
                            y1={sourcePos.y}
                            x2={targetPos.x}
                            y2={targetPos.y}
                            stroke={RISK_COLORS[edge.riskLevel]}
                            strokeWidth={edgeStyle.strokeWidth}
                            strokeOpacity={0.7}
                            markerEnd="url(#arrowhead)"
                          />
                          {/* Edge label */}
                          <text
                            x={(sourcePos.x + targetPos.x) / 2}
                            y={(sourcePos.y + targetPos.y) / 2}
                            fill="#9ca3af"
                            fontSize="10"
                            textAnchor="middle"
                            className="pointer-events-none"
                          >
                            {edge.type}
                          </text>
                        </g>
                      );
                    })}
                    
                    {/* Arrow marker definition */}
                    <defs>
                      <marker
                        id="arrowhead"
                        markerWidth="10"
                        markerHeight="7"
                        refX="9"
                        refY="3.5"
                        orient="auto"
                      >
                        <polygon
                          points="0 0, 10 3.5, 0 7"
                          fill="#9ca3af"
                        />
                      </marker>
                    </defs>
                    
                    {/* Render nodes */}
                    {filteredData.nodes.map((node) => {
                      const pos = nodePositions[node.id];
                      if (!pos) return null;
                      
                      const nodeType = NODE_TYPES[node.type];
                      const isSelected = selectedNode?.id === node.id;
                      
                      return (
                        <g 
                          key={node.id}
                          className="cursor-pointer"
                          onClick={() => handleNodeClick(node)}
                        >
                          <circle
                            cx={pos.x}
                            cy={pos.y}
                            r={node.size / 2}
                            fill={RISK_COLORS[node.riskLevel]}
                            stroke={isSelected ? '#ffffff' : nodeType.color}
                            strokeWidth={isSelected ? 3 : 2}
                            opacity={0.8}
                          />
                          {showNodeLabels && (
                            <text
                              x={pos.x}
                              y={pos.y + node.size / 2 + 15}
                              fill="#e5e7eb"
                              fontSize="12"
                              textAnchor="middle"
                              className="pointer-events-none"
                            >
                              {node.label}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/* Node Details Panel */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {selectedNode ? 'Node Details' : 'Select a Node'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedNode ? (
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm text-gray-400">Name</div>
                          <div className="font-medium">{selectedNode.label}</div>
                        </div>
                        
                        <div>
                          <div className="text-sm text-gray-400">Type</div>
                          <Badge variant="outline" className="capitalize">
                            {selectedNode.type}
                          </Badge>
                        </div>
                        
                        <div>
                          <div className="text-sm text-gray-400">Risk Level</div>
                          <Badge 
                            variant="outline"
                            style={{ borderColor: RISK_COLORS[selectedNode.riskLevel] }}
                            className="capitalize"
                          >
                            <div 
                              className="w-2 h-2 rounded-full mr-2"
                              style={{ backgroundColor: RISK_COLORS[selectedNode.riskLevel] }}
                            />
                            {selectedNode.riskLevel}
                          </Badge>
                        </div>
                        
                        <div>
                          <div className="text-sm text-gray-400 mb-2">Metadata</div>
                          <div className="space-y-1">
                            {Object.entries(selectedNode.metadata).map(([key, value]) => (
                              <div key={key} className="text-xs">
                                <span className="text-gray-400">{key}:</span>{' '}
                                <span className="text-gray-200">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <Button className="w-full mt-4" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          Investigate
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center text-gray-400 py-8">
                        <Network className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Click on a node to view details</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Legend */}
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-lg">Legend</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="text-sm text-gray-400 mb-2">Node Types</div>
                      {Object.entries(NODE_TYPES).map(([type, config]) => (
                        <div key={type} className="flex items-center gap-2 mb-1">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: config.color }}
                          />
                          <span className="text-xs text-gray-300 capitalize">{config.label}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-400 mb-2">Edge Types</div>
                      {Object.entries(EDGE_TYPES).map(([type, config]) => (
                        <div key={type} className="flex items-center gap-2 mb-1">
                          <div 
                            className="w-4 h-0.5"
                            style={{ backgroundColor: config.color }}
                          />
                          <span className="text-xs text-gray-300">{config.label}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}