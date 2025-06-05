"use client";

import React, { useState, useCallback, useMemo, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  LayoutDashboard, 
  Plus, 
  Settings, 
  Save, 
  RotateCcw, 
  GripVertical, 
  X, 
  BarChart3, 
  LineChart, 
  PieChart, 
  Activity, 
  Users, 
  Shield, 
  AlertTriangle,
  Globe,
  Clock,
  Database,
  Monitor
} from "lucide-react";

// Import our visualization components
import EventsOverTimeChart from './visualization/EventsOverTimeChart';
import TopEventIdsBarChart from './visualization/TopEventIdsBarChart';
import InteractiveHeatmap from './visualization/InteractiveHeatmap';
import NetworkCorrelationGraph from './visualization/NetworkCorrelationGraph';
import ThreatGeolocationMap from './visualization/ThreatGeolocationMap';

interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  size: 'small' | 'medium' | 'large' | 'full';
  position: { x: number; y: number };
  config: any;
  visible: boolean;
}

interface DashboardLayout {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  created: string;
  lastModified: string;
}

const WIDGET_TYPES = [
  {
    id: 'events-over-time',
    name: 'Events Over Time',
    description: 'Line chart showing event trends',
    icon: LineChart,
    component: EventsOverTimeChart,
    defaultSize: 'large' as const,
    category: 'Analytics'
  },
  {
    id: 'top-event-ids',
    name: 'Top Event IDs',
    description: 'Bar chart of most common events',
    icon: BarChart3,
    component: TopEventIdsBarChart,
    defaultSize: 'medium' as const,
    category: 'Analytics'
  },
  {
    id: 'security-heatmap',
    name: 'Security Heatmap',
    description: 'Interactive security event heatmap',
    icon: Activity,
    component: InteractiveHeatmap,
    defaultSize: 'large' as const,
    category: 'Security'
  },
  {
    id: 'network-correlation',
    name: 'Network Correlation',
    description: 'Graph showing entity relationships',
    icon: Shield,
    component: NetworkCorrelationGraph,
    defaultSize: 'full' as const,
    category: 'Investigation'
  },
  {
    id: 'threat-geolocation',
    name: 'Threat Geolocation',
    description: 'Global threat map visualization',
    icon: Globe,
    component: ThreatGeolocationMap,
    defaultSize: 'full' as const,
    category: 'Intelligence'
  },
  {
    id: 'kpi-metrics',
    name: 'KPI Metrics',
    description: 'Key performance indicators',
    icon: Monitor,
    component: () => <KPIMetricsWidget />,
    defaultSize: 'small' as const,
    category: 'Overview'
  },
  {
    id: 'recent-alerts',
    name: 'Recent Alerts',
    description: 'Latest security alerts',
    icon: AlertTriangle,
    component: () => <RecentAlertsWidget />,
    defaultSize: 'medium' as const,
    category: 'Security'
  },
  {
    id: 'system-health',
    name: 'System Health',
    description: 'Infrastructure monitoring',
    icon: Database,
    component: () => <SystemHealthWidget />,
    defaultSize: 'small' as const,
    category: 'System'
  },
  {
    id: 'query-results',
    name: 'Query Results',
    description: 'Live KQL query results table',
    icon: Database,
    component: (props: any) => <QueryResultsWidget query={props.query} />,
    defaultSize: 'large' as const,
    category: 'Analytics'
  }
];

const WIDGET_SIZES = {
  small: { width: 'col-span-1', height: 'h-64' },
  medium: { width: 'col-span-2', height: 'h-80' },
  large: { width: 'col-span-3', height: 'h-96' },
  full: { width: 'col-span-4', height: 'h-[500px]' }
};

// Simple KPI widget component
const KPIMetricsWidget = () => (
  <div className="p-4 space-y-4">
    <div className="text-center">
      <div className="text-3xl font-bold text-blue-400">2,847</div>
      <div className="text-sm text-gray-400">Total Events</div>
    </div>
    <div className="text-center">
      <div className="text-2xl font-bold text-red-400">23</div>
      <div className="text-sm text-gray-400">Critical Alerts</div>
    </div>
    <div className="text-center">
      <div className="text-2xl font-bold text-green-400">99.2%</div>
      <div className="text-sm text-gray-400">System Uptime</div>
    </div>
  </div>
);

// Recent alerts widget component
const RecentAlertsWidget = () => {
  const alerts = [
    { id: 1, title: 'Suspicious Login', severity: 'high', time: '5 min ago' },
    { id: 2, title: 'Malware Detected', severity: 'critical', time: '12 min ago' },
    { id: 3, title: 'Unusual Traffic', severity: 'medium', time: '18 min ago' }
  ];

  return (
    <div className="p-4 space-y-3">
      {alerts.map((alert) => (
        <div key={alert.id} className="flex items-center justify-between p-2 bg-gray-700 rounded">
          <div>
            <div className="font-medium text-sm">{alert.title}</div>
            <div className="text-xs text-gray-400">{alert.time}</div>
          </div>
          <Badge 
            variant="outline"
            className={
              alert.severity === 'critical' ? 'border-red-500 text-red-400' :
              alert.severity === 'high' ? 'border-orange-500 text-orange-400' :
              'border-yellow-500 text-yellow-400'
            }
          >
            {alert.severity}
          </Badge>
        </div>
      ))}
    </div>
  );
};

// System health widget component
const SystemHealthWidget = () => (
  <div className="p-4 space-y-3">
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-400">CPU</span>
      <span className="text-sm font-medium">67%</span>
    </div>
    <div className="w-full bg-gray-700 rounded-full h-2">
      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '67%' }}></div>
    </div>
    
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-400">Memory</span>
      <span className="text-sm font-medium">84%</span>
    </div>
    <div className="w-full bg-gray-700 rounded-full h-2">
      <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '84%' }}></div>
    </div>
    
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-400">Disk</span>
      <span className="text-sm font-medium">45%</span>
    </div>
    <div className="w-full bg-gray-700 rounded-full h-2">
      <div className="bg-green-500 h-2 rounded-full" style={{ width: '45%' }}></div>
    </div>
  </div>
);

// Query results widget component
const QueryResultsWidget = ({ query }: { query?: string }) => {
  const [results, setResults] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (query) {
      setLoading(true);
      // Simulate API call - in real implementation, this would call the search API
      setTimeout(() => {
        setResults([
          { timestamp: '2025-06-05 04:00:00', event_id: '4625', host: 'DC01', message: 'Failed login attempt' },
          { timestamp: '2025-06-05 03:59:45', event_id: '4624', host: 'WS001', message: 'Successful login' },
          { timestamp: '2025-06-05 03:59:30', event_id: '4688', host: 'SRV02', message: 'Process created' }
        ]);
        setLoading(false);
      }, 1000);
    }
  }, [query]);

  if (!query) {
    return (
      <div className="p-4 text-center text-gray-400">
        <Database className="w-8 h-8 mx-auto mb-2" />
        <p className="text-sm">No query configured</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-400">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400 mx-auto mb-2"></div>
        <p className="text-sm">Loading results...</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="text-xs text-gray-400 font-mono mb-2">{query}</div>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {results.map((result: any, index) => (
          <div key={index} className="text-xs bg-gray-700 p-2 rounded">
            <div className="flex justify-between items-start">
              <span className="text-blue-400">{result.timestamp}</span>
              <Badge variant="outline" className="text-xs">{result.event_id}</Badge>
            </div>
            <div className="text-gray-300 mt-1">{result.host}: {result.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

function CustomizableDashboard() {
  const [currentLayout, setCurrentLayout] = useState<DashboardLayout>({
    id: 'default',
    name: 'Default Security Dashboard',
    description: 'Comprehensive security monitoring layout',
    created: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    widgets: [
      {
        id: 'widget-1',
        type: 'kpi-metrics',
        title: 'Key Metrics',
        size: 'small',
        position: { x: 0, y: 0 },
        config: {},
        visible: true
      },
      {
        id: 'widget-2',
        type: 'recent-alerts',
        title: 'Recent Alerts',
        size: 'medium',
        position: { x: 1, y: 0 },
        config: {},
        visible: true
      },
      {
        id: 'widget-3',
        type: 'system-health',
        title: 'System Health',
        size: 'small',
        position: { x: 3, y: 0 },
        config: {},
        visible: true
      },
      {
        id: 'widget-4',
        type: 'events-over-time',
        title: 'Events Timeline',
        size: 'large',
        position: { x: 0, y: 1 },
        config: {},
        visible: true
      },
      {
        id: 'widget-5',
        type: 'top-event-ids',
        title: 'Top Events',
        size: 'small',
        position: { x: 3, y: 1 },
        config: {},
        visible: true
      }
    ]
  });

  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);
  const [isAddWidgetOpen, setIsAddWidgetOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const addWidget = useCallback((widgetType: typeof WIDGET_TYPES[0]) => {
    const newWidget: DashboardWidget = {
      id: `widget-${Date.now()}`,
      type: widgetType.id,
      title: widgetType.name,
      size: widgetType.defaultSize,
      position: { x: 0, y: Math.max(...currentLayout.widgets.map(w => w.position.y)) + 1 },
      config: {},
      visible: true
    };

    setCurrentLayout(prev => ({
      ...prev,
      widgets: [...prev.widgets, newWidget],
      lastModified: new Date().toISOString()
    }));
    setIsAddWidgetOpen(false);
  }, [currentLayout.widgets]);

  const removeWidget = useCallback((widgetId: string) => {
    setCurrentLayout(prev => ({
      ...prev,
      widgets: prev.widgets.filter(w => w.id !== widgetId),
      lastModified: new Date().toISOString()
    }));
  }, []);

  const updateWidgetSize = useCallback((widgetId: string, newSize: DashboardWidget['size']) => {
    setCurrentLayout(prev => ({
      ...prev,
      widgets: prev.widgets.map(w => 
        w.id === widgetId ? { ...w, size: newSize } : w
      ),
      lastModified: new Date().toISOString()
    }));
  }, []);

  const renderWidget = useCallback((widget: DashboardWidget) => {
    const widgetType = WIDGET_TYPES.find(t => t.id === widget.type);
    if (!widgetType) return null;

    const WidgetComponent = widgetType.component;
    const sizeClasses = WIDGET_SIZES[widget.size];

    return (
      <Card
        key={widget.id}
        className={`${sizeClasses.width} ${sizeClasses.height} ${
          editMode ? 'border-dashed border-blue-500' : ''
        } relative group transition-all duration-200`}
        draggable={editMode}
        onDragStart={() => setDraggedWidget(widget.id)}
        onDragEnd={() => setDraggedWidget(null)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <widgetType.icon className="w-5 h-5" />
              {widget.title}
            </CardTitle>
            {editMode && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                <Select
                  value={widget.size}
                  onValueChange={(size) => updateWidgetSize(widget.id, size as DashboardWidget['size'])}
                >
                  <SelectTrigger className="w-20 h-6 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                    <SelectItem value="full">Full</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-6 h-6"
                  onClick={() => removeWidget(widget.id)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0 h-full overflow-hidden">
          <WidgetComponent {...widget.config} />
        </CardContent>
      </Card>
    );
  }, [editMode, removeWidget, updateWidgetSize]);

  const groupedWidgetTypes = useMemo(() => {
    return WIDGET_TYPES.reduce((acc, widget) => {
      if (!acc[widget.category]) {
        acc[widget.category] = [];
      }
      acc[widget.category].push(widget);
      return acc;
    }, {} as Record<string, typeof WIDGET_TYPES>);
  }, []);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Dashboard Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-100 flex items-center gap-2">
              <LayoutDashboard className="w-8 h-8" />
              {currentLayout.name}
            </h1>
            <p className="text-gray-400 mt-1">{currentLayout.description}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span>Last modified: {new Date(currentLayout.lastModified).toLocaleString()}</span>
              <Badge variant="outline" className="text-green-400 border-green-400">
                {currentLayout.widgets.filter(w => w.visible).length} widgets
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Dialog open={isAddWidgetOpen} onOpenChange={setIsAddWidgetOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Widget
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Add Dashboard Widget</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {Object.entries(groupedWidgetTypes).map(([category, widgets]) => (
                    <div key={category}>
                      <h3 className="text-lg font-medium mb-3">{category}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {widgets.map((widget) => (
                          <Card
                            key={widget.id}
                            className="cursor-pointer hover:border-blue-500 transition-colors"
                            onClick={() => addWidget(widget)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                <widget.icon className="w-8 h-8 text-blue-400" />
                                <div>
                                  <div className="font-medium">{widget.name}</div>
                                  <div className="text-sm text-gray-400">{widget.description}</div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={editMode ? "default" : "outline"}
                  onClick={() => setEditMode(!editMode)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  {editMode ? 'Done' : 'Edit'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle edit mode to rearrange widgets</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">
                  <Save className="w-4 h-4 mr-2" />
                  Save Layout
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save current dashboard layout</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset to default layout</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {editMode && (
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-400">
              <Settings className="w-5 h-5" />
              <span className="font-medium">Edit Mode Active</span>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              Drag widgets to rearrange, resize using the dropdown, or remove unwanted widgets.
            </p>
          </div>
        )}

        {/* Dashboard Grid */}
        <div className="grid grid-cols-4 gap-6 auto-rows-min">
          {currentLayout.widgets
            .filter(widget => widget.visible)
            .sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x)
            .map(renderWidget)}
        </div>

        {currentLayout.widgets.filter(w => w.visible).length === 0 && (
          <div className="text-center py-12">
            <LayoutDashboard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-300 mb-2">No Widgets Added</h3>
            <p className="text-gray-500 mb-4">Start building your dashboard by adding some widgets</p>
            <Button onClick={() => setIsAddWidgetOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Widget
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export default memo(CustomizableDashboard);