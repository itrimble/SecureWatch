'use client';

import React, { useState, useCallback, useMemo, memo } from 'react';
import { SplunkLayout } from '@/components/splunk-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard,
  Plus,
  Settings,
  Save,
  Share,
  Download,
  Edit,
  Move,
  Copy,
  Trash2,
  Play,
  Pause,
  RefreshCw,
  Clock,
  Filter,
  Search,
  BarChart3,
  LineChart,
  PieChart,
  Table,
  Activity,
  TrendingUp,
  Users,
  Shield,
  AlertTriangle,
  Globe,
  Database,
  Monitor,
  Target,
  ChevronDown,
  Calendar as CalendarIcon,
  GripVertical,
  X,
  Maximize2,
  Minimize2,
  ExternalLink,
  Eye,
  Code,
} from 'lucide-react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import { format, subHours, subDays, subWeeks } from 'date-fns';

// Import visualization components
import EventsOverTimeChart from '../visualization/EventsOverTimeChart';
import TopEventIdsBarChart from '../visualization/TopEventIdsBarChart';
import InteractiveHeatmap from '../visualization/InteractiveHeatmap';
import NetworkCorrelationGraph from '../visualization/NetworkCorrelationGraph';
import ThreatGeolocationMap from '../visualization/ThreatGeolocationMap';

// Import dashboard components
import { PanelEditor } from './panel-editor';
import { InputsEditor } from './inputs-editor';
import { DrilldownManager } from './drilldown-manager';
import { EnhancedInputControls } from './enhanced-input-controls';

const ResponsiveGridLayout = WidthProvider(Responsive);

// Dashboard panel types with KQL integration
interface DashboardPanel {
  id: string;
  title: string;
  type: 'chart' | 'table' | 'single-value' | 'map' | 'custom';
  visualization: string; // chart subtype
  query: string; // KQL query
  refreshInterval: number; // in seconds
  timespan: string;
  position: { x: number; y: number; w: number; h: number };
  config: {
    drilldown?: {
      enabled: boolean;
      target: string; // dashboard or search
      query?: string;
    };
    formatting?: Record<string, any>;
    colors?: Record<string, string>;
  };
  isRefreshing: boolean;
  lastUpdated?: string;
  data?: any[];
}

// Dashboard input types for token substitution
interface DashboardInput {
  id: string;
  label: string;
  type: 'text' | 'dropdown' | 'time' | 'multiselect' | 'checkbox';
  token: string; // $token_name$
  defaultValue: any;
  options?: { label: string; value: string }[];
  searchOnChange: boolean;
}

interface SplunkDashboardState {
  id: string;
  title: string;
  description: string;
  panels: DashboardPanel[];
  inputs: DashboardInput[];
  layout: Layout[];
  refreshInterval: number;
  globalTimeRange: {
    earliest: string;
    latest: string;
    preset?: string;
  };
  tokens: Record<string, any>;
  isEditMode: boolean;
  autoRefresh: boolean;
}

// Predefined panel templates
const PANEL_TEMPLATES = [
  {
    id: 'events-over-time',
    name: 'Events Over Time',
    description: 'Line chart showing event trends',
    type: 'chart' as const,
    visualization: 'line',
    icon: LineChart,
    defaultQuery:
      '* | bin timestamp as _time by 1h | stats count by _time | sort _time',
    defaultSize: { w: 6, h: 4 },
  },
  {
    id: 'top-sources',
    name: 'Top Event Sources',
    description: 'Bar chart of most active sources',
    type: 'chart' as const,
    visualization: 'bar',
    icon: BarChart3,
    defaultQuery: '* | stats count by source_type | sort count desc | head 10',
    defaultSize: { w: 4, h: 4 },
  },
  {
    id: 'security-events',
    name: 'Security Events Table',
    description: 'Table of security events',
    type: 'table' as const,
    visualization: 'table',
    icon: Table,
    defaultQuery:
      'event_type:security | head 100 | table timestamp, hostname, event_id, message',
    defaultSize: { w: 8, h: 6 },
  },
  {
    id: 'alert-count',
    name: 'Critical Alerts',
    description: 'Single value showing alert count',
    type: 'single-value' as const,
    visualization: 'single',
    icon: AlertTriangle,
    defaultQuery: 'severity:critical | stats count',
    defaultSize: { w: 3, h: 2 },
  },
  {
    id: 'threat-heatmap',
    name: 'Threat Activity Heatmap',
    description: 'Heat map of threat activity',
    type: 'chart' as const,
    visualization: 'heatmap',
    icon: Activity,
    defaultQuery:
      '* | bucket timestamp span=1h | stats count by timestamp, source_ip',
    defaultSize: { w: 8, h: 5 },
  },
  {
    id: 'geo-threats',
    name: 'Geographic Threats',
    description: 'World map showing threat origins',
    type: 'map' as const,
    visualization: 'geo',
    icon: Globe,
    defaultQuery:
      '* | iplocation source_ip | stats count by Country | geom geo_countries',
    defaultSize: { w: 6, h: 5 },
  },
];

// Time range presets
const TIME_PRESETS = [
  { label: 'Last 15 minutes', value: '15m', earliest: '-15m@m', latest: 'now' },
  { label: 'Last hour', value: '1h', earliest: '-1h@h', latest: 'now' },
  { label: 'Last 4 hours', value: '4h', earliest: '-4h@h', latest: 'now' },
  { label: 'Last 24 hours', value: '24h', earliest: '-24h@h', latest: 'now' },
  { label: 'Last 7 days', value: '7d', earliest: '-7d@d', latest: 'now' },
  { label: 'Last 30 days', value: '30d', earliest: '-30d@d', latest: 'now' },
];

function SplunkDashboard() {
  const [dashboardState, setDashboardState] = useState<SplunkDashboardState>({
    id: 'security-overview',
    title: 'Security Operations Dashboard',
    description: 'Real-time security monitoring and threat detection',
    panels: [],
    inputs: [
      {
        id: 'time-range',
        label: 'Time Range',
        type: 'time',
        token: 'timerange',
        defaultValue: '24h',
        searchOnChange: true,
      },
      {
        id: 'source-filter',
        label: 'Data Source',
        type: 'dropdown',
        token: 'source',
        defaultValue: '*',
        options: [
          { label: 'All Sources', value: '*' },
          { label: 'Windows Events', value: 'windows' },
          { label: 'Syslog', value: 'syslog' },
          { label: 'Network Logs', value: 'network' },
          { label: 'Application Logs', value: 'application' },
        ],
        searchOnChange: true,
      },
      {
        id: 'severity-filter',
        label: 'Severity',
        type: 'multiselect',
        token: 'severity',
        defaultValue: ['critical', 'high', 'medium'],
        options: [
          { label: 'Critical', value: 'critical' },
          { label: 'High', value: 'high' },
          { label: 'Medium', value: 'medium' },
          { label: 'Low', value: 'low' },
          { label: 'Information', value: 'info' },
        ],
        searchOnChange: false,
      },
    ],
    layout: [],
    refreshInterval: 30,
    globalTimeRange: {
      earliest: '-24h@h',
      latest: 'now',
      preset: '24h',
    },
    tokens: {
      timerange: '24h',
      source: '*',
      severity: ['critical', 'high', 'medium'],
    },
    isEditMode: false,
    autoRefresh: true,
  });

  const [selectedPanel, setSelectedPanel] = useState<string | null>(null);
  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);
  const [isPanelEditorOpen, setIsPanelEditorOpen] = useState(false);
  const [editingPanel, setEditingPanel] = useState<DashboardPanel | null>(null);
  const [isInputsEditorOpen, setIsInputsEditorOpen] = useState(false);
  const [isDrilldownOpen, setIsDrilldownOpen] = useState(false);
  const [drilldownContext, setDrilldownContext] = useState<any>(null);
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Token substitution function
  const substituteTokens = useCallback(
    (query: string, tokens: Record<string, any>) => {
      let substitutedQuery = query;
      Object.entries(tokens).forEach(([token, value]) => {
        const tokenPattern = new RegExp(`\\$${token}\\$`, 'g');
        if (Array.isArray(value)) {
          substitutedQuery = substitutedQuery.replace(
            tokenPattern,
            value.map((v) => `"${v}"`).join(' OR ')
          );
        } else {
          substitutedQuery = substitutedQuery.replace(
            tokenPattern,
            value.toString()
          );
        }
      });
      return substitutedQuery;
    },
    []
  );

  // Add new panel
  const addPanel = useCallback(
    (template: (typeof PANEL_TEMPLATES)[0]) => {
      const newPanel: DashboardPanel = {
        id: `panel-${Date.now()}`,
        title: template.name,
        type: template.type,
        visualization: template.visualization,
        query: template.defaultQuery,
        refreshInterval: 30,
        timespan: dashboardState.globalTimeRange.preset || '24h',
        position: {
          x: 0,
          y: Math.max(...(dashboardState.layout.map((l) => l.y + l.h) || [0])),
          w: template.defaultSize.w,
          h: template.defaultSize.h,
        },
        config: {
          drilldown: { enabled: false, target: 'search' },
          formatting: {},
          colors: {},
        },
        isRefreshing: false,
      };

      setDashboardState((prev) => ({
        ...prev,
        panels: [...prev.panels, newPanel],
        layout: [
          ...prev.layout,
          {
            i: newPanel.id,
            x: newPanel.position.x,
            y: newPanel.position.y,
            w: newPanel.position.w,
            h: newPanel.position.h,
            minW: 2,
            minH: 2,
          },
        ],
      }));
      setIsAddPanelOpen(false);
    },
    [dashboardState.layout, dashboardState.globalTimeRange.preset]
  );

  // Update panel
  const updatePanel = useCallback(
    (panelId: string, updates: Partial<DashboardPanel>) => {
      setDashboardState((prev) => ({
        ...prev,
        panels: prev.panels.map((panel) =>
          panel.id === panelId ? { ...panel, ...updates } : panel
        ),
      }));
    },
    []
  );

  // Remove panel
  const removePanel = useCallback((panelId: string) => {
    setDashboardState((prev) => ({
      ...prev,
      panels: prev.panels.filter((p) => p.id !== panelId),
      layout: prev.layout.filter((l) => l.i !== panelId),
    }));
  }, []);

  // Update layout when grid changes
  const onLayoutChange = useCallback((layout: Layout[]) => {
    setDashboardState((prev) => ({ ...prev, layout }));
  }, []);

  // Execute panel query
  const executePanel = useCallback(
    async (panel: DashboardPanel) => {
      updatePanel(panel.id, { isRefreshing: true });

      try {
        const substitutedQuery = substituteTokens(
          panel.query,
          dashboardState.tokens
        );

        // Call search API
        const response = await fetch('/api/v1/search/execute', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Organization-ID': 'c47e1c4e-4f23-4c6a-9c4a-f8b5d6c2e1a3',
          },
          body: JSON.stringify({
            query: substitutedQuery,
            limit: panel.type === 'single-value' ? 1 : 1000,
            organizationId: 'c47e1c4e-4f23-4c6a-9c4a-f8b5d6c2e1a3',
          }),
        });

        if (response.ok) {
          const data = await response.json();
          updatePanel(panel.id, {
            data: data.rows || [],
            lastUpdated: new Date().toISOString(),
            isRefreshing: false,
          });
        }
      } catch (error) {
        console.error('Panel query failed:', error);
        updatePanel(panel.id, { isRefreshing: false });
      }
    },
    [dashboardState.tokens, substituteTokens, updatePanel]
  );

  // Refresh all panels
  const refreshAllPanels = useCallback(() => {
    dashboardState.panels.forEach((panel) => {
      executePanel(panel);
    });
  }, [dashboardState.panels, executePanel]);

  // Update dashboard tokens
  const updateToken = useCallback(
    (token: string, value: any) => {
      setDashboardState((prev) => ({
        ...prev,
        tokens: { ...prev.tokens, [token]: value },
      }));
      // Auto-refresh panels if search on change is enabled
      if (
        dashboardState.inputs.find((input) => input.token === token)
          ?.searchOnChange
      ) {
        setTimeout(refreshAllPanels, 100);
      }
    },
    [dashboardState.inputs, refreshAllPanels]
  );

  // Enhanced panel drill-down handler
  const handlePanelDrilldown = useCallback(
    (panelId: string, drilldownData: any, event: React.MouseEvent) => {
      const panel = dashboardState.panels.find((p) => p.id === panelId);
      if (!panel?.config.drilldown?.enabled) return;

      // Extract context from the click event and data
      const context = {
        clickedValue: drilldownData.value || drilldownData,
        clickedField: drilldownData.field || 'value',
        rowData: drilldownData.rowData || {},
        panelId: panel.id,
        panelTitle: panel.title,
        timestamp: new Date().toISOString(),
        dashboardTokens: dashboardState.tokens,
      };

      setDrilldownContext(context);
      setIsDrilldownOpen(true);
    },
    [dashboardState.panels, dashboardState.tokens]
  );

  // Navigation handlers for drilldown
  const handleNavigateToSearch = useCallback((query: string) => {
    window.open(`/explorer?query=${encodeURIComponent(query)}`, '_blank');
  }, []);

  const handleNavigateToDashboard = useCallback(
    (dashboardId: string, tokens?: Record<string, any>) => {
      // In a real implementation, this would navigate to the specific dashboard
      // For now, we'll update current dashboard tokens and refresh
      if (tokens) {
        Object.entries(tokens).forEach(([token, value]) => {
          updateToken(token, value);
        });
      }
    },
    [updateToken]
  );

  const handleShowModal = useCallback((content: React.ReactNode) => {
    setModalContent(content);
    setIsModalOpen(true);
  }, []);

  // Render dashboard input
  const renderInput = useCallback(
    (input: DashboardInput) => {
      const currentValue = dashboardState.tokens[input.token];

      switch (input.type) {
        case 'text':
          return (
            <div key={input.id} className="flex items-center space-x-2">
              <Label className="text-sm text-muted-foreground whitespace-nowrap">
                {input.label}:
              </Label>
              <Input
                value={currentValue || ''}
                onChange={(e) => updateToken(input.token, e.target.value)}
                className="h-8 w-32 bg-background border-border text-foreground"
                placeholder="Enter value..."
              />
            </div>
          );

        case 'dropdown':
          return (
            <div key={input.id} className="flex items-center space-x-2">
              <Label className="text-sm text-muted-foreground whitespace-nowrap">
                {input.label}:
              </Label>
              <Select
                value={currentValue}
                onValueChange={(value) => updateToken(input.token, value)}
              >
                <SelectTrigger className="h-8 w-40 bg-background border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {input.options?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );

        case 'time':
          return (
            <div key={input.id} className="flex items-center space-x-2">
              <Label className="text-sm text-muted-foreground whitespace-nowrap">
                {input.label}:
              </Label>
              <Select
                value={dashboardState.globalTimeRange.preset || 'custom'}
                onValueChange={(value) => {
                  const preset = TIME_PRESETS.find((p) => p.value === value);
                  if (preset) {
                    setDashboardState((prev) => ({
                      ...prev,
                      globalTimeRange: {
                        earliest: preset.earliest,
                        latest: preset.latest,
                        preset: preset.value,
                      },
                    }));
                    updateToken(input.token, preset.value);
                  }
                }}
              >
                <SelectTrigger className="h-8 w-40 bg-background border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );

        default:
          return null;
      }
    },
    [dashboardState.tokens, dashboardState.globalTimeRange.preset, updateToken]
  );

  // Render panel based on type
  const renderPanelContent = useCallback((panel: DashboardPanel) => {
    if (panel.isRefreshing) {
      return (
        <div className="flex items-center justify-center h-full">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
          <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
        </div>
      );
    }

    switch (panel.visualization) {
      case 'line':
        return <EventsOverTimeChart data={panel.data || []} />;
      case 'bar':
        return <TopEventIdsBarChart data={panel.data || []} />;
      case 'heatmap':
        return <InteractiveHeatmap data={panel.data || []} />;
      case 'geo':
        return <ThreatGeolocationMap data={panel.data || []} />;
      case 'table':
        return (
          <div className="h-full overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted border-b border-border">
                <tr>
                  {Object.keys(panel.data?.[0] || {}).map((key) => (
                    <th key={key} className="text-left p-2 font-medium">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(panel.data || []).map((row, index) => (
                  <tr
                    key={index}
                    className="border-b border-border hover:bg-muted"
                  >
                    {Object.values(row).map((value: any, i) => (
                      <td key={i} className="p-2">
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'single':
        const singleValue = panel.data?.[0]?.count || panel.data?.length || 0;
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">
                {singleValue.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {panel.title}
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">Configure visualization</p>
            </div>
          </div>
        );
    }
  }, []);

  return (
    <SplunkLayout>
      <div className="p-6">
        {/* Dashboard Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <LayoutDashboard className="w-8 h-8" />
              {dashboardState.title}
            </h1>
            <p className="text-muted-foreground mt-1">
              {dashboardState.description}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAllPanels}
              disabled={dashboardState.panels.some((p) => p.isRefreshing)}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>

            <Dialog open={isAddPanelOpen} onOpenChange={setIsAddPanelOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Panel
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Add Dashboard Panel</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {PANEL_TEMPLATES.map((template) => (
                    <Card
                      key={template.id}
                      className="cursor-pointer hover:border-blue-500 transition-colors"
                      onClick={() => addPanel(template)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <template.icon className="w-8 h-8 text-primary mt-1" />
                          <div>
                            <div className="font-medium text-foreground">
                              {template.name}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {template.description}
                            </div>
                            <Badge variant="outline" className="mt-2 text-xs">
                              {template.type}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </DialogContent>
            </Dialog>

            <Button
              variant={dashboardState.isEditMode ? 'default' : 'outline'}
              size="sm"
              onClick={() =>
                setDashboardState((prev) => ({
                  ...prev,
                  isEditMode: !prev.isEditMode,
                }))
              }
            >
              <Settings className="w-4 h-4 mr-2" />
              {dashboardState.isEditMode ? 'Done' : 'Edit'}
            </Button>

            <Button variant="outline" size="sm">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>

            <Button variant="outline" size="sm">
              <Share className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>

        {/* Enhanced Dashboard Inputs */}
        {dashboardState.inputs.length > 0 && (
          <EnhancedInputControls
            inputs={dashboardState.inputs}
            tokens={dashboardState.tokens}
            onTokenChange={updateToken}
            onRefreshAll={refreshAllPanels}
            autoRefresh={dashboardState.autoRefresh}
            onAutoRefreshToggle={(enabled) =>
              setDashboardState((prev) => ({ ...prev, autoRefresh: enabled }))
            }
            refreshInterval={dashboardState.refreshInterval}
            onRefreshIntervalChange={(interval) =>
              setDashboardState((prev) => ({
                ...prev,
                refreshInterval: interval,
              }))
            }
            isRefreshing={dashboardState.panels.some((p) => p.isRefreshing)}
            className="mb-6"
          />
        )}

        {/* Edit Mode Notice */}
        {dashboardState.isEditMode && (
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-primary">
              <Settings className="w-5 h-5" />
              <span className="font-medium">Edit Mode Active</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Drag panels to rearrange, resize by dragging corners, or click
              panels to edit their configuration.
            </p>
          </div>
        )}

        {/* Dashboard Grid */}
        <div style={{ minHeight: '600px' }}>
          <ResponsiveGridLayout
            className="layout"
            layouts={{ lg: dashboardState.layout }}
            onLayoutChange={(layout) => onLayoutChange(layout)}
            isDraggable={dashboardState.isEditMode}
            isResizable={dashboardState.isEditMode}
            margin={[16, 16]}
            containerPadding={[0, 0]}
            rowHeight={60}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          >
            {dashboardState.panels.map((panel) => (
              <Card
                key={panel.id}
                className={`${
                  dashboardState.isEditMode
                    ? 'border-dashed border-primary cursor-move'
                    : 'border-border'
                } bg-card relative group transition-all duration-200`}
                onClick={() =>
                  dashboardState.isEditMode && setSelectedPanel(panel.id)
                }
              >
                <CardHeader className="pb-2 border-b border-border">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-foreground flex items-center gap-2">
                      {panel.title}
                      {panel.isRefreshing && (
                        <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                      )}
                    </CardTitle>
                    {dashboardState.isEditMode && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingPanel(panel);
                            setIsPanelEditorOpen(true);
                          }}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            executePanel(panel);
                          }}
                        >
                          <RefreshCw className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            removePanel(panel.id);
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {panel.lastUpdated && (
                    <div className="text-xs text-muted-foreground">
                      Last updated:{' '}
                      {format(new Date(panel.lastUpdated), 'HH:mm:ss')}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="pt-2 h-full overflow-hidden">
                  <div
                    className="h-full"
                    onClick={(e) => {
                      if (
                        !dashboardState.isEditMode &&
                        panel.config.drilldown?.enabled
                      ) {
                        // Create mock drilldown data - in real implementation this would come from the visualization
                        const mockDrilldownData = {
                          value:
                            panel.data?.[0]?.value ||
                            panel.data?.[0]?.count ||
                            'unknown',
                          field:
                            Object.keys(panel.data?.[0] || {})[0] || 'field',
                          rowData: panel.data?.[0] || {},
                        };
                        handlePanelDrilldown(panel.id, mockDrilldownData, e);
                      }
                    }}
                  >
                    {renderPanelContent(panel)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </ResponsiveGridLayout>
        </div>

        {/* Empty State */}
        {dashboardState.panels.length === 0 && (
          <div className="text-center py-12">
            <LayoutDashboard className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-medium text-foreground mb-2">
              No Panels Added
            </h3>
            <p className="text-muted-foreground mb-4">
              Start building your dashboard by adding some panels
            </p>
            <Button onClick={() => setIsAddPanelOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Panel
            </Button>
          </div>
        )}

        {/* Panel Editor Dialog */}
        <Dialog open={isPanelEditorOpen} onOpenChange={setIsPanelEditorOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
            <DialogHeader className="p-6 pb-2">
              <DialogTitle>
                {editingPanel
                  ? `Edit Panel: ${editingPanel.title}`
                  : 'Edit Panel'}
              </DialogTitle>
            </DialogHeader>
            {editingPanel && (
              <div className="px-6 pb-6">
                <PanelEditor
                  panel={editingPanel}
                  onSave={(updatedPanel) => {
                    updatePanel(editingPanel.id, updatedPanel);
                    setIsPanelEditorOpen(false);
                    setEditingPanel(null);
                  }}
                  onCancel={() => {
                    setIsPanelEditorOpen(false);
                    setEditingPanel(null);
                  }}
                  onTestQuery={async (query) => {
                    const substitutedQuery = substituteTokens(
                      query,
                      dashboardState.tokens
                    );
                    const response = await fetch('/api/v1/search/execute', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'X-Organization-ID':
                          'c47e1c4e-4f23-4c6a-9c4a-f8b5d6c2e1a3',
                      },
                      body: JSON.stringify({
                        query: substitutedQuery,
                        limit: 100,
                        organizationId: 'c47e1c4e-4f23-4c6a-9c4a-f8b5d6c2e1a3',
                      }),
                    });
                    return response.json();
                  }}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Inputs Editor Dialog */}
        <Dialog open={isInputsEditorOpen} onOpenChange={setIsInputsEditorOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
            <DialogHeader className="p-6 pb-2">
              <DialogTitle>Dashboard Inputs Configuration</DialogTitle>
            </DialogHeader>
            <div className="px-6 pb-6">
              <InputsEditor
                inputs={dashboardState.inputs}
                onSave={(updatedInputs) => {
                  setDashboardState((prev) => ({
                    ...prev,
                    inputs: updatedInputs,
                  }));
                  setIsInputsEditorOpen(false);
                }}
                onCancel={() => setIsInputsEditorOpen(false)}
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Enhanced Drilldown Manager */}
        <DrilldownManager
          isOpen={isDrilldownOpen}
          onClose={() => setIsDrilldownOpen(false)}
          context={drilldownContext}
          onNavigateToSearch={handleNavigateToSearch}
          onNavigateToDashboard={handleNavigateToDashboard}
          onShowModal={handleShowModal}
        />

        {/* Modal Dialog for Detail Views */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            {modalContent}
          </DialogContent>
        </Dialog>
      </div>
    </SplunkLayout>
  );
}

export default memo(SplunkDashboard);
