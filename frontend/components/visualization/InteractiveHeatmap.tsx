"use client";

import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Thermometer, Calendar, Clock, Activity, AlertTriangle, Users } from "lucide-react";

interface HeatmapDataPoint {
  x: number;
  y: number;
  value: number;
  label: string;
  metadata?: any;
}

interface HeatmapProps {
  title: string;
  data?: HeatmapDataPoint[];
  xAxisLabel?: string;
  yAxisLabel?: string;
  colorScheme?: 'security' | 'activity' | 'performance';
}

const HEATMAP_TYPES = [
  {
    id: 'user-activity',
    name: 'User Activity',
    description: 'Login patterns by hour and day',
    icon: Users,
    xAxisLabel: 'Hour of Day',
    yAxisLabel: 'Day of Week'
  },
  {
    id: 'security-events',
    name: 'Security Events',
    description: 'Threat detection patterns',
    icon: AlertTriangle,
    xAxisLabel: 'Hour of Day',
    yAxisLabel: 'Event Severity'
  },
  {
    id: 'system-performance',
    name: 'System Performance',
    description: 'Resource utilization patterns',
    icon: Activity,
    xAxisLabel: 'Time Period',
    yAxisLabel: 'System Component'
  },
  {
    id: 'temporal-analysis',
    name: 'Temporal Analysis',
    description: 'Event frequency over time',
    icon: Clock,
    xAxisLabel: 'Time of Day',
    yAxisLabel: 'Event Volume'
  }
];

const COLOR_SCHEMES = {
  security: {
    low: '#10b981',     // Green
    medium: '#f59e0b',  // Amber
    high: '#ef4444',    // Red
    critical: '#dc2626' // Dark red
  },
  activity: {
    low: '#1e40af',     // Blue
    medium: '#3b82f6',  // Light blue
    high: '#60a5fa',    // Lighter blue
    critical: '#93c5fd' // Lightest blue
  },
  performance: {
    low: '#059669',     // Emerald
    medium: '#0891b2',  // Cyan
    high: '#7c3aed',    // Violet
    critical: '#c026d3'  // Fuchsia
  }
};

// Generate mock heatmap data
const generateMockData = (type: string): HeatmapDataPoint[] => {
  const data: HeatmapDataPoint[] = [];
  
  switch (type) {
    case 'user-activity':
      // User login activity by hour (0-23) and day of week (0-6)
      for (let day = 0; day < 7; day++) {
        for (let hour = 0; hour < 24; hour++) {
          const workingHours = hour >= 8 && hour <= 18;
          const weekday = day >= 1 && day <= 5;
          let baseValue = Math.random() * 20;
          
          if (workingHours && weekday) {
            baseValue *= 3; // Higher activity during work hours
          }
          
          data.push({
            x: hour,
            y: day,
            value: Math.round(baseValue),
            label: `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]} ${hour}:00`,
            metadata: {
              dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day],
              timeSlot: `${hour}:00-${hour + 1}:00`,
              logins: Math.round(baseValue)
            }
          });
        }
      }
      break;
      
    case 'security-events':
      // Security events by hour and severity level
      const severityLevels = ['Info', 'Low', 'Medium', 'High', 'Critical'];
      for (let hour = 0; hour < 24; hour++) {
        severityLevels.forEach((severity, index) => {
          let baseValue = Math.random() * 15;
          
          // More security events during off-hours (potential attacks)
          if (hour < 6 || hour > 22) {
            baseValue *= 1.5;
          }
          
          // Critical events are rarer
          if (severity === 'Critical') {
            baseValue *= 0.3;
          }
          
          data.push({
            x: hour,
            y: index,
            value: Math.round(baseValue),
            label: `${severity} at ${hour}:00`,
            metadata: {
              severity,
              hour,
              eventCount: Math.round(baseValue),
              riskLevel: index >= 3 ? 'High' : index >= 2 ? 'Medium' : 'Low'
            }
          });
        });
      }
      break;
      
    case 'system-performance':
      // System performance metrics
      const components = ['CPU', 'Memory', 'Disk', 'Network', 'Database'];
      for (let time = 0; time < 24; time++) {
        components.forEach((component, index) => {
          let utilization = 30 + Math.random() * 40; // Base 30-70%
          
          // Higher utilization during business hours
          if (time >= 8 && time <= 18) {
            utilization += 15;
          }
          
          data.push({
            x: time,
            y: index,
            value: Math.round(utilization),
            label: `${component} at ${time}:00`,
            metadata: {
              component,
              utilizationPercent: Math.round(utilization),
              status: utilization > 80 ? 'Critical' : utilization > 60 ? 'Warning' : 'Normal'
            }
          });
        });
      }
      break;
      
    case 'temporal-analysis':
      // Event volume analysis
      for (let hour = 0; hour < 24; hour++) {
        for (let intensity = 0; intensity < 5; intensity++) {
          const volume = Math.random() * 100 * (intensity + 1);
          data.push({
            x: hour,
            y: intensity,
            value: Math.round(volume),
            label: `Volume Level ${intensity + 1} at ${hour}:00`,
            metadata: {
              hour,
              intensityLevel: intensity + 1,
              eventVolume: Math.round(volume)
            }
          });
        }
      }
      break;
  }
  
  return data;
};

const getColorForValue = (value: number, maxValue: number, scheme: keyof typeof COLOR_SCHEMES): string => {
  const intensity = value / maxValue;
  const colors = COLOR_SCHEMES[scheme];
  
  if (intensity < 0.25) return colors.low;
  if (intensity < 0.5) return colors.medium;
  if (intensity < 0.75) return colors.high;
  return colors.critical;
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
        <p className="text-gray-200 font-medium">{data.label}</p>
        <p className="text-blue-400">Value: {data.value}</p>
        {data.metadata && (
          <div className="mt-2 space-y-1">
            {Object.entries(data.metadata).map(([key, value]) => (
              <p key={key} className="text-gray-400 text-sm">
                {key}: {String(value)}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function InteractiveHeatmap({ 
  title, 
  data: externalData, 
  xAxisLabel, 
  yAxisLabel, 
  colorScheme = 'security' 
}: HeatmapProps) {
  const [selectedType, setSelectedType] = useState('user-activity');
  
  const currentHeatmapConfig = HEATMAP_TYPES.find(type => type.id === selectedType);
  
  const heatmapData = useMemo(() => {
    return externalData || generateMockData(selectedType);
  }, [externalData, selectedType]);
  
  const maxValue = useMemo(() => {
    return Math.max(...heatmapData.map(d => d.value));
  }, [heatmapData]);

  const getYAxisTicks = () => {
    switch (selectedType) {
      case 'user-activity':
        return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      case 'security-events':
        return ['Info', 'Low', 'Medium', 'High', 'Critical'];
      case 'system-performance':
        return ['CPU', 'Memory', 'Disk', 'Network', 'Database'];
      case 'temporal-analysis':
        return ['L1', 'L2', 'L3', 'L4', 'L5'];
      default:
        return [];
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Thermometer className="w-5 h-5" />
            {title || 'Interactive Heatmap Analysis'}
          </CardTitle>
          <div className="flex items-center gap-4">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HEATMAP_TYPES.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    <div className="flex items-center gap-2">
                      <type.icon className="w-4 h-4" />
                      {type.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {currentHeatmapConfig && (
          <p className="text-gray-400 text-sm">{currentHeatmapConfig.description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Legend */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">Intensity:</span>
              <div className="flex items-center gap-2">
                {Object.entries(COLOR_SCHEMES[colorScheme]).map(([level, color]) => (
                  <div key={level} className="flex items-center gap-1">
                    <div 
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs text-gray-400 capitalize">{level}</span>
                  </div>
                ))}
              </div>
            </div>
            <Badge variant="outline" className="text-blue-400 border-blue-400">
              {heatmapData.length} data points
            </Badge>
          </div>

          {/* Heatmap Chart */}
          <div className="w-full h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart
                data={heatmapData}
                margin={{ top: 20, right: 20, bottom: 60, left: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  domain={['dataMin', 'dataMax']}
                  tick={{ fill: '#d1d5db', fontSize: 12 }}
                  label={{ 
                    value: xAxisLabel || currentHeatmapConfig?.xAxisLabel || 'X Axis', 
                    position: 'insideBottom', 
                    offset: -10,
                    style: { fill: '#d1d5db', fontSize: '12px' }
                  }}
                />
                <YAxis 
                  type="number" 
                  dataKey="y"
                  domain={['dataMin', 'dataMax']}
                  tick={{ fill: '#d1d5db', fontSize: 12 }}
                  tickFormatter={(value) => {
                    const ticks = getYAxisTicks();
                    return ticks[value] || String(value);
                  }}
                  label={{ 
                    value: yAxisLabel || currentHeatmapConfig?.yAxisLabel || 'Y Axis', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { fill: '#d1d5db', fontSize: '12px' }
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Scatter dataKey="value">
                  {heatmapData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getColorForValue(entry.value, maxValue, colorScheme)}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center p-3 bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-blue-400">{maxValue}</div>
              <div className="text-sm text-gray-400">Max Value</div>
            </div>
            <div className="text-center p-3 bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-green-400">
                {Math.round(heatmapData.reduce((sum, d) => sum + d.value, 0) / heatmapData.length)}
              </div>
              <div className="text-sm text-gray-400">Average</div>
            </div>
            <div className="text-center p-3 bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-yellow-400">
                {heatmapData.filter(d => d.value > maxValue * 0.75).length}
              </div>
              <div className="text-sm text-gray-400">High Activity</div>
            </div>
            <div className="text-center p-3 bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-purple-400">{heatmapData.length}</div>
              <div className="text-sm text-gray-400">Total Points</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}