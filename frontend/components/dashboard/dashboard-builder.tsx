"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Save, 
  Eye, 
  Settings, 
  Plus, 
  Trash2, 
  Copy, 
  Grid3X3, 
  Layers, 
  Move,
  RotateCcw,
  Download,
  Upload,
  Palette,
  Clock,
  Filter,
  BarChart3,
  AlertTriangle,
  Info
} from "lucide-react";

import { DashboardConfig, DashboardLayout, WidgetInstance } from "@/lib/dashboard/dashboard-types";
import { WidgetLibrary, WIDGET_CATEGORIES, WidgetDefinition } from "@/lib/dashboard/widget-library";
import { DashboardEngine } from "@/lib/dashboard/dashboard-engine";

interface DashboardBuilderProps {
  initialDashboard?: DashboardConfig;
  onSave?: (dashboard: DashboardConfig) => void;
  onPreview?: (dashboard: DashboardConfig) => void;
  readOnly?: boolean;
}

interface DragState {
  isDragging: boolean;
  draggedWidget: WidgetDefinition | null;
  draggedInstance: WidgetInstance | null;
  dropTarget: { rowId: string; columnIndex: number } | null;
}

export function DashboardBuilder({ 
  initialDashboard, 
  onSave, 
  onPreview,
  readOnly = false 
}: DashboardBuilderProps) {
  const [dashboard, setDashboard] = useState<DashboardConfig>(
    initialDashboard || createEmptyDashboard()
  );
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedWidget: null,
    draggedInstance: null,
    dropTarget: null
  });
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [widgetLibrary] = useState(new WidgetLibrary());
  const [dashboardEngine] = useState(new DashboardEngine());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const builderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      dashboardEngine.destroy();
    };
  }, [dashboardEngine]);

  // Dashboard operations
  const createEmptyDashboard = (): DashboardConfig => ({
    id: `dashboard-${Date.now()}`,
    title: 'New Dashboard',
    description: 'A new security dashboard',
    version: '1.0.0',
    layout: {
      type: 'grid',
      rows: [
        {
          id: 'row-1',
          height: 'auto',
          columns: []
        }
      ],
      timeRange: {
        type: 'relative',
        value: '24h'
      }
    },
    settings: {
      theme: 'dark',
      autoRefresh: true,
      refreshInterval: 30000,
      showFilters: true,
      showTimeRange: true,
      fullScreenMode: false,
      density: 'comfortable'
    },
    permissions: {
      owner: 'current-user',
      isPublic: false,
      sharedWith: [],
      editableBy: [],
      viewableBy: []
    },
    metadata: {
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      version: '1.0.0',
      tags: [],
      category: 'security',
      isTemplate: false,
      usage: {
        views: 0,
        lastViewed: new Date().toISOString(),
        averageViewTime: 0,
        popularWidgets: [],
        errorRate: 0
      }
    }
  });

  const addRow = useCallback(() => {
    setDashboard(prev => ({
      ...prev,
      layout: {
        ...prev.layout,
        rows: [
          ...prev.layout.rows,
          {
            id: `row-${Date.now()}`,
            height: 'auto',
            columns: []
          }
        ]
      }
    }));
  }, []);

  const removeRow = useCallback((rowId: string) => {
    setDashboard(prev => ({
      ...prev,
      layout: {
        ...prev.layout,
        rows: prev.layout.rows.filter(row => row.id !== rowId)
      }
    }));
  }, []);

  const addWidget = useCallback((widgetDef: WidgetDefinition, rowId: string) => {
    const widgetInstance = widgetLibrary.createWidgetInstance(widgetDef.id);
    if (!widgetInstance) return;

    setDashboard(prev => ({
      ...prev,
      layout: {
        ...prev.layout,
        rows: prev.layout.rows.map(row => 
          row.id === rowId
            ? {
                ...row,
                columns: [
                  ...row.columns,
                  {
                    id: `col-${Date.now()}`,
                    width: getDefaultWidgetWidth(widgetDef.type),
                    widget: widgetInstance,
                    responsive: {
                      mobile: { width: 12, visible: true },
                      tablet: { width: 6, visible: true },
                      desktop: { width: getDefaultWidgetWidth(widgetDef.type), visible: true }
                    }
                  }
                ]
              }
            : row
        )
      }
    }));
  }, [widgetLibrary]);

  const removeWidget = useCallback((widgetId: string) => {
    setDashboard(prev => ({
      ...prev,
      layout: {
        ...prev.layout,
        rows: prev.layout.rows.map(row => ({
          ...row,
          columns: row.columns.filter(col => col.widget.id !== widgetId)
        }))
      }
    }));
  }, []);

  const updateWidget = useCallback((widgetId: string, updates: Partial<WidgetInstance>) => {
    setDashboard(prev => ({
      ...prev,
      layout: {
        ...prev.layout,
        rows: prev.layout.rows.map(row => ({
          ...row,
          columns: row.columns.map(col => 
            col.widget.id === widgetId
              ? { ...col, widget: { ...col.widget, ...updates } }
              : col
          )
        }))
      }
    }));
  }, []);

  const getDefaultWidgetWidth = (type: string): number => {
    const widthMap: Record<string, number> = {
      'metric_card': 3,
      'gauge': 3,
      'line_chart': 6,
      'bar_chart': 6,
      'pie_chart': 4,
      'table': 12,
      'heatmap': 8,
      'network_graph': 12,
      'geolocation_map': 12,
      'timeline': 12
    };
    return widthMap[type] || 6;
  };

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, widget: WidgetDefinition) => {
    setDragState(prev => ({
      ...prev,
      isDragging: true,
      draggedWidget: widget
    }));
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, rowId: string, columnIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    
    setDragState(prev => ({
      ...prev,
      dropTarget: { rowId, columnIndex }
    }));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, rowId: string) => {
    e.preventDefault();
    
    if (dragState.draggedWidget) {
      addWidget(dragState.draggedWidget, rowId);
    }
    
    setDragState({
      isDragging: false,
      draggedWidget: null,
      draggedInstance: null,
      dropTarget: null
    });
  }, [dragState.draggedWidget, addWidget]);

  const handleDragEnd = useCallback(() => {
    setDragState({
      isDragging: false,
      draggedWidget: null,
      draggedInstance: null,
      dropTarget: null
    });
  }, []);

  // Filter widgets
  const filteredWidgets = widgetLibrary.getAllWidgets().filter(widget => {
    const matchesSearch = !searchQuery || 
      widget.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      widget.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      widget.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || 
      widget.category.toLowerCase() === selectedCategory.toLowerCase();
    
    return matchesSearch && matchesCategory;
  });

  const handleSave = useCallback(() => {
    dashboard.metadata.lastModified = new Date().toISOString();
    onSave?.(dashboard);
  }, [dashboard, onSave]);

  const handlePreview = useCallback(() => {
    setPreviewMode(!previewMode);
    onPreview?.(dashboard);
  }, [dashboard, onPreview, previewMode]);

  return (
    <div className="flex h-screen bg-background">
      {/* Widget Library Sidebar */}
      {!previewMode && (
        <div className="w-80 border-r bg-card p-4 flex flex-col">
          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-2">Widget Library</h2>
            
            {/* Search */}
            <Input
              placeholder="Search widgets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-3"
            />
            
            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {WIDGET_CATEGORIES.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Widget Grid */}
          <ScrollArea className="flex-1">
            <div className="space-y-2">
              {filteredWidgets.map((widget) => (
                <Card
                  key={widget.id}
                  className="cursor-grab hover:shadow-md transition-shadow border-2 border-transparent hover:border-primary/20"
                  draggable={!readOnly}
                  onDragStart={(e) => handleDragStart(e, widget)}
                  onDragEnd={handleDragEnd}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <widget.icon className="w-6 h-6 text-primary mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm mb-1">{widget.name}</h3>
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                          {widget.description}
                        </p>
                        <div className="flex items-center gap-1 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {widget.category}
                          </Badge>
                          <Badge 
                            variant={widget.complexity === 'beginner' ? 'default' : 'secondary'} 
                            className="text-xs"
                          >
                            {widget.complexity}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {widget.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="text-xs bg-muted px-1 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Main Dashboard Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        {!previewMode && (
          <div className="border-b p-4 bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <Input
                    value={dashboard.title}
                    onChange={(e) => setDashboard(prev => ({ ...prev, title: e.target.value }))}
                    className="text-lg font-semibold bg-transparent border-none p-0 h-auto"
                    disabled={readOnly}
                  />
                  <Input
                    value={dashboard.description}
                    onChange={(e) => setDashboard(prev => ({ ...prev, description: e.target.value }))}
                    className="text-sm text-muted-foreground bg-transparent border-none p-0 h-auto mt-1"
                    disabled={readOnly}
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addRow}
                  disabled={readOnly}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Row
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreview}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
                
                {!readOnly && (
                  <Button size="sm" onClick={handleSave}>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Canvas */}
        <div 
          ref={builderRef}
          className="flex-1 p-4 overflow-auto bg-muted/20"
        >
          {dashboard.layout.rows.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Grid3X3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Empty Dashboard</h3>
                <p className="text-muted-foreground mb-4">
                  Start building by adding rows and dragging widgets from the sidebar.
                </p>
                <Button onClick={addRow} disabled={readOnly}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Row
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {dashboard.layout.rows.map((row, rowIndex) => (
                <Card
                  key={row.id}
                  className={`min-h-[200px] ${
                    dragState.dropTarget?.rowId === row.id 
                      ? 'ring-2 ring-primary ring-offset-2' 
                      : ''
                  }`}
                  onDragOver={(e) => handleDragOver(e, row.id, 0)}
                  onDrop={(e) => handleDrop(e, row.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Layers className="w-4 h-4" />
                        Row {rowIndex + 1}
                      </CardTitle>
                      {!readOnly && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeRow(row.id)}
                            disabled={dashboard.layout.rows.length === 1}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    {row.columns.length === 0 ? (
                      <div className="h-32 border-2 border-dashed border-muted-foreground/20 rounded-lg flex items-center justify-center">
                        <div className="text-center text-muted-foreground">
                          <BarChart3 className="w-8 h-8 mx-auto mb-2" />
                          <p className="text-sm">Drag widgets here</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-12 gap-4">
                        {row.columns.map((column) => (
                          <div
                            key={column.id}
                            className={`col-span-${column.width} min-h-[150px]`}
                          >
                            <Card className="h-full relative group">
                              <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-sm">
                                    {column.widget.title}
                                  </CardTitle>
                                  {!readOnly && (
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedWidget(column.widget.id)}
                                      >
                                        <Settings className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeWidget(column.widget.id)}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </CardHeader>
                              
                              <CardContent>
                                <div className="h-24 bg-muted/50 rounded flex items-center justify-center">
                                  <span className="text-sm text-muted-foreground">
                                    {column.widget.widgetId} Preview
                                  </span>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Widget Configuration Dialog */}
      <Dialog open={!!selectedWidget} onOpenChange={() => setSelectedWidget(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Widget Configuration</DialogTitle>
          </DialogHeader>
          
          {selectedWidget && (
            <WidgetConfigPanel
              widget={findWidgetById(dashboard, selectedWidget)}
              onUpdate={(updates) => updateWidget(selectedWidget, updates)}
              onClose={() => setSelectedWidget(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper component for widget configuration
function WidgetConfigPanel({ 
  widget, 
  onUpdate, 
  onClose 
}: { 
  widget?: WidgetInstance; 
  onUpdate: (updates: Partial<WidgetInstance>) => void;
  onClose: () => void;
}) {
  if (!widget) return null;

  return (
    <Tabs defaultValue="general" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="data">Data</TabsTrigger>
        <TabsTrigger value="visualization">Visual</TabsTrigger>
        <TabsTrigger value="refresh">Refresh</TabsTrigger>
      </TabsList>
      
      <TabsContent value="general" className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={widget.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={widget.description || ''}
            onChange={(e) => onUpdate({ description: e.target.value })}
          />
        </div>
      </TabsContent>
      
      <TabsContent value="data" className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Data source configuration will be implemented in the next iteration.
          </AlertDescription>
        </Alert>
      </TabsContent>
      
      <TabsContent value="visualization" className="space-y-4">
        <Alert>
          <Palette className="h-4 w-4" />
          <AlertDescription>
            Visualization options will be implemented in the next iteration.
          </AlertDescription>
        </Alert>
      </TabsContent>
      
      <TabsContent value="refresh" className="space-y-4">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="autoRefresh"
              checked={widget.refresh.autoRefresh}
              onChange={(e) => onUpdate({
                refresh: { ...widget.refresh, autoRefresh: e.target.checked }
              })}
            />
            <Label htmlFor="autoRefresh">Auto Refresh</Label>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="interval">Refresh Interval (seconds)</Label>
            <Input
              id="interval"
              type="number"
              value={widget.refresh.interval / 1000}
              onChange={(e) => onUpdate({
                refresh: { ...widget.refresh, interval: parseInt(e.target.value) * 1000 }
              })}
            />
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}

// Helper function to find widget by ID
function findWidgetById(dashboard: DashboardConfig, widgetId: string): WidgetInstance | undefined {
  for (const row of dashboard.layout.rows) {
    for (const column of row.columns) {
      if (column.widget.id === widgetId) {
        return column.widget;
      }
    }
  }
  return undefined;
}

export default DashboardBuilder;