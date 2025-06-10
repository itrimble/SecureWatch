import { WidgetInstance, VisualizationType } from './dashboard-types';
import { 
  BarChart3, 
  LineChart, 
  PieChart, 
  Activity, 
  Target, 
  Table, 
  Clock, 
  Globe, 
  GitBranch,
  TrendingUp,
  Gauge,
  Map,
  Image,
  Type,
  Monitor,
  AlertTriangle,
  Shield,
  Users,
  Database,
  Network,
  FileText,
  Search
} from 'lucide-react';

export interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: any;
  type: VisualizationType;
  defaultConfig: Partial<WidgetInstance>;
  configSchema: any;
  requiredFields: string[];
  supportedDataSources: string[];
  complexity: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
}

export const WIDGET_LIBRARY: WidgetDefinition[] = [
  // Chart Widgets
  {
    id: 'line_chart',
    name: 'Line Chart',
    description: 'Time series and trend visualization',
    category: 'Charts',
    icon: LineChart,
    type: 'line_chart',
    defaultConfig: {
      config: {
        visualization: {
          type: 'line_chart',
          options: {
            smooth: true,
            showPoints: true,
            gridLines: true,
            legend: true,
            tooltip: true,
            colors: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'],
            xAxis: { title: 'Time', format: 'datetime' },
            yAxis: { title: 'Value', format: 'number' }
          }
        }
      }
    },
    configSchema: {
      smooth: { type: 'boolean', default: true },
      showPoints: { type: 'boolean', default: true },
      colors: { type: 'array', items: { type: 'string' } }
    },
    requiredFields: ['timestamp', 'value'],
    supportedDataSources: ['kql', 'api', 'realtime'],
    complexity: 'beginner',
    tags: ['time-series', 'trends', 'analytics']
  },
  {
    id: 'bar_chart',
    name: 'Bar Chart',
    description: 'Categorical data comparison',
    category: 'Charts',
    icon: BarChart3,
    type: 'bar_chart',
    defaultConfig: {
      config: {
        visualization: {
          type: 'bar_chart',
          options: {
            orientation: 'vertical',
            stacked: false,
            showValues: true,
            gridLines: true,
            legend: true,
            colors: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b']
          }
        }
      }
    },
    configSchema: {
      orientation: { type: 'string', enum: ['vertical', 'horizontal'] },
      stacked: { type: 'boolean', default: false },
      showValues: { type: 'boolean', default: true }
    },
    requiredFields: ['category', 'value'],
    supportedDataSources: ['kql', 'api', 'static'],
    complexity: 'beginner',
    tags: ['comparison', 'categorical', 'analytics']
  },
  {
    id: 'pie_chart',
    name: 'Pie Chart',
    description: 'Part-to-whole relationships',
    category: 'Charts',
    icon: PieChart,
    type: 'pie_chart',
    defaultConfig: {
      config: {
        visualization: {
          type: 'pie_chart',
          options: {
            donut: false,
            showLabels: true,
            showPercentages: true,
            legend: true,
            colors: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6']
          }
        }
      }
    },
    configSchema: {
      donut: { type: 'boolean', default: false },
      showLabels: { type: 'boolean', default: true },
      showPercentages: { type: 'boolean', default: true }
    },
    requiredFields: ['category', 'value'],
    supportedDataSources: ['kql', 'api', 'static'],
    complexity: 'beginner',
    tags: ['distribution', 'proportions', 'categorical']
  },
  {
    id: 'area_chart',
    name: 'Area Chart',
    description: 'Cumulative values over time',
    category: 'Charts',
    icon: Activity,
    type: 'area_chart',
    defaultConfig: {
      config: {
        visualization: {
          type: 'area_chart',
          options: {
            stacked: false,
            filled: true,
            opacity: 0.7,
            gridLines: true,
            legend: true,
            colors: ['#3b82f6', '#ef4444', '#10b981']
          }
        }
      }
    },
    configSchema: {
      stacked: { type: 'boolean', default: false },
      filled: { type: 'boolean', default: true },
      opacity: { type: 'number', min: 0, max: 1, default: 0.7 }
    },
    requiredFields: ['timestamp', 'value'],
    supportedDataSources: ['kql', 'api', 'realtime'],
    complexity: 'intermediate',
    tags: ['time-series', 'cumulative', 'trends']
  },
  
  // Security-Specific Widgets
  {
    id: 'security_heatmap',
    name: 'Security Heatmap',
    description: 'Risk and activity intensity visualization',
    category: 'Security',
    icon: Target,
    type: 'heatmap',
    defaultConfig: {
      config: {
        visualization: {
          type: 'heatmap',
          options: {
            colorScheme: 'security',
            showLabels: true,
            intensity: 'logarithmic',
            gridSize: 'auto',
            tooltip: true
          }
        }
      }
    },
    configSchema: {
      colorScheme: { type: 'string', enum: ['security', 'blue', 'red', 'green'] },
      intensity: { type: 'string', enum: ['linear', 'logarithmic'] },
      gridSize: { type: 'string', enum: ['auto', 'small', 'medium', 'large'] }
    },
    requiredFields: ['x_value', 'y_value', 'intensity'],
    supportedDataSources: ['kql', 'api'],
    complexity: 'advanced',
    tags: ['security', 'risk', 'intensity', 'correlation']
  },
  {
    id: 'threat_timeline',
    name: 'Threat Timeline',
    description: 'Chronological security events',
    category: 'Security',
    icon: Clock,
    type: 'timeline',
    defaultConfig: {
      config: {
        visualization: {
          type: 'timeline',
          options: {
            groupBy: 'severity',
            showDetails: true,
            colorBySeverity: true,
            zoomable: true,
            interactive: true
          }
        }
      }
    },
    configSchema: {
      groupBy: { type: 'string', enum: ['severity', 'source', 'type'] },
      showDetails: { type: 'boolean', default: true },
      colorBySeverity: { type: 'boolean', default: true }
    },
    requiredFields: ['timestamp', 'event', 'severity'],
    supportedDataSources: ['kql', 'api', 'realtime'],
    complexity: 'intermediate',
    tags: ['security', 'timeline', 'events', 'chronological']
  },
  {
    id: 'geolocation_map',
    name: 'Geolocation Map',
    description: 'Global threat and activity mapping',
    category: 'Security',
    icon: Globe,
    type: 'geolocation_map',
    defaultConfig: {
      config: {
        visualization: {
          type: 'geolocation_map',
          options: {
            mapType: 'world',
            heatmapMode: true,
            showMarkers: true,
            clustering: true,
            colorScheme: 'threat'
          }
        }
      }
    },
    configSchema: {
      mapType: { type: 'string', enum: ['world', 'country', 'region'] },
      heatmapMode: { type: 'boolean', default: true },
      showMarkers: { type: 'boolean', default: true },
      clustering: { type: 'boolean', default: true }
    },
    requiredFields: ['latitude', 'longitude', 'value'],
    supportedDataSources: ['kql', 'api'],
    complexity: 'advanced',
    tags: ['geolocation', 'mapping', 'global', 'threats']
  },
  {
    id: 'network_graph',
    name: 'Network Graph',
    description: 'Entity relationships and connections',
    category: 'Investigation',
    icon: GitBranch,
    type: 'network_graph',
    defaultConfig: {
      config: {
        visualization: {
          type: 'network_graph',
          options: {
            layout: 'force',
            showLabels: true,
            nodeSize: 'degree',
            edgeWeight: true,
            interactive: true
          }
        }
      }
    },
    configSchema: {
      layout: { type: 'string', enum: ['force', 'circular', 'hierarchical'] },
      showLabels: { type: 'boolean', default: true },
      nodeSize: { type: 'string', enum: ['fixed', 'degree', 'centrality'] }
    },
    requiredFields: ['source', 'target', 'relationship'],
    supportedDataSources: ['kql', 'api'],
    complexity: 'advanced',
    tags: ['network', 'relationships', 'investigation', 'entities']
  },

  // KPI and Metrics Widgets
  {
    id: 'metric_card',
    name: 'Metric Card',
    description: 'Single value with trend indicator',
    category: 'KPI',
    icon: TrendingUp,
    type: 'metric_card',
    defaultConfig: {
      config: {
        visualization: {
          type: 'metric_card',
          options: {
            showTrend: true,
            trendPeriod: '24h',
            format: 'number',
            threshold: { warning: 75, critical: 90 },
            sparkline: true
          }
        }
      }
    },
    configSchema: {
      showTrend: { type: 'boolean', default: true },
      trendPeriod: { type: 'string', enum: ['1h', '24h', '7d', '30d'] },
      format: { type: 'string', enum: ['number', 'percentage', 'currency', 'bytes'] }
    },
    requiredFields: ['value'],
    supportedDataSources: ['kql', 'api', 'realtime'],
    complexity: 'beginner',
    tags: ['kpi', 'metrics', 'single-value', 'trends']
  },
  {
    id: 'gauge_chart',
    name: 'Gauge Chart',
    description: 'Progress and performance indicators',
    category: 'KPI',
    icon: Gauge,
    type: 'gauge',
    defaultConfig: {
      config: {
        visualization: {
          type: 'gauge',
          options: {
            min: 0,
            max: 100,
            thresholds: [{ value: 75, color: 'yellow' }, { value: 90, color: 'red' }],
            showValue: true,
            showLabel: true
          }
        }
      }
    },
    configSchema: {
      min: { type: 'number', default: 0 },
      max: { type: 'number', default: 100 },
      thresholds: { type: 'array', items: { type: 'object' } }
    },
    requiredFields: ['value'],
    supportedDataSources: ['kql', 'api', 'realtime'],
    complexity: 'beginner',
    tags: ['gauge', 'progress', 'performance', 'thresholds']
  },

  // Data Display Widgets
  {
    id: 'data_table',
    name: 'Data Table',
    description: 'Structured data with sorting and filtering',
    category: 'Data',
    icon: Table,
    type: 'table',
    defaultConfig: {
      config: {
        visualization: {
          type: 'table',
          options: {
            sortable: true,
            filterable: true,
            pagination: true,
            pageSize: 10,
            rowNumbers: true,
            export: true
          }
        }
      }
    },
    configSchema: {
      sortable: { type: 'boolean', default: true },
      filterable: { type: 'boolean', default: true },
      pagination: { type: 'boolean', default: true },
      pageSize: { type: 'number', default: 10 }
    },
    requiredFields: [],
    supportedDataSources: ['kql', 'api', 'static'],
    complexity: 'beginner',
    tags: ['table', 'data', 'structured', 'sorting', 'filtering']
  },

  // Advanced Analytics Widgets
  {
    id: 'correlation_matrix',
    name: 'Correlation Matrix',
    description: 'Statistical correlations between variables',
    category: 'Analytics',
    icon: Target,
    type: 'correlation_matrix',
    defaultConfig: {
      config: {
        visualization: {
          type: 'correlation_matrix',
          options: {
            method: 'pearson',
            showValues: true,
            colorScheme: 'correlation',
            symmetric: true
          }
        }
      }
    },
    configSchema: {
      method: { type: 'string', enum: ['pearson', 'spearman', 'kendall'] },
      showValues: { type: 'boolean', default: true },
      symmetric: { type: 'boolean', default: true }
    },
    requiredFields: ['variables'],
    supportedDataSources: ['kql', 'api'],
    complexity: 'advanced',
    tags: ['correlation', 'statistics', 'analytics', 'matrix']
  },
  {
    id: 'sankey_diagram',
    name: 'Sankey Diagram',
    description: 'Flow and process visualization',
    category: 'Analytics',
    icon: GitBranch,
    type: 'sankey_diagram',
    defaultConfig: {
      config: {
        visualization: {
          type: 'sankey_diagram',
          options: {
            nodeAlignment: 'justify',
            linkSort: 'ascending',
            showValues: true,
            interactive: true
          }
        }
      }
    },
    configSchema: {
      nodeAlignment: { type: 'string', enum: ['left', 'right', 'center', 'justify'] },
      linkSort: { type: 'string', enum: ['ascending', 'descending', 'none'] }
    },
    requiredFields: ['source', 'target', 'value'],
    supportedDataSources: ['kql', 'api'],
    complexity: 'advanced',
    tags: ['flow', 'process', 'sankey', 'relationships']
  },

  // Utility Widgets
  {
    id: 'text_widget',
    name: 'Text Widget',
    description: 'Rich text and markdown content',
    category: 'Utility',
    icon: Type,
    type: 'text_widget',
    defaultConfig: {
      config: {
        visualization: {
          type: 'text_widget',
          options: {
            content: '# Title\nYour content here...',
            format: 'markdown',
            theme: 'default'
          }
        }
      }
    },
    configSchema: {
      content: { type: 'string', default: '' },
      format: { type: 'string', enum: ['markdown', 'html', 'plain'] },
      theme: { type: 'string', enum: ['default', 'dark', 'minimal'] }
    },
    requiredFields: [],
    supportedDataSources: ['static'],
    complexity: 'beginner',
    tags: ['text', 'markdown', 'content', 'documentation']
  },
  {
    id: 'image_widget',
    name: 'Image Widget',
    description: 'Static or dynamic image display',
    category: 'Utility',
    icon: Image,
    type: 'image_widget',
    defaultConfig: {
      config: {
        visualization: {
          type: 'image_widget',
          options: {
            src: '',
            alt: '',
            fit: 'contain',
            caption: ''
          }
        }
      }
    },
    configSchema: {
      src: { type: 'string', required: true },
      alt: { type: 'string', default: '' },
      fit: { type: 'string', enum: ['contain', 'cover', 'fill', 'scale-down'] }
    },
    requiredFields: [],
    supportedDataSources: ['static', 'api'],
    complexity: 'beginner',
    tags: ['image', 'media', 'visual', 'static']
  }
];

export const WIDGET_CATEGORIES = [
  { id: 'charts', name: 'Charts', icon: BarChart3, description: 'Standard chart visualizations' },
  { id: 'security', name: 'Security', icon: Shield, description: 'Security-focused widgets' },
  { id: 'investigation', name: 'Investigation', icon: Search, description: 'Investigation and analysis tools' },
  { id: 'kpi', name: 'KPI', icon: Target, description: 'Key performance indicators' },
  { id: 'data', name: 'Data', icon: Database, description: 'Data display and tables' },
  { id: 'analytics', name: 'Analytics', icon: TrendingUp, description: 'Advanced analytics widgets' },
  { id: 'utility', name: 'Utility', icon: Monitor, description: 'Utility and content widgets' }
];

export class WidgetLibrary {
  private widgets: Map<string, WidgetDefinition> = new Map();
  
  constructor() {
    this.loadWidgets();
  }

  private loadWidgets(): void {
    WIDGET_LIBRARY.forEach(widget => {
      this.widgets.set(widget.id, widget);
    });
  }

  /**
   * Get widget definition by ID
   */
  getWidget(id: string): WidgetDefinition | undefined {
    return this.widgets.get(id);
  }

  /**
   * Get all widgets
   */
  getAllWidgets(): WidgetDefinition[] {
    return Array.from(this.widgets.values());
  }

  /**
   * Get widgets by category
   */
  getWidgetsByCategory(category: string): WidgetDefinition[] {
    return this.getAllWidgets().filter(widget => widget.category === category);
  }

  /**
   * Search widgets by name, description, or tags
   */
  searchWidgets(query: string): WidgetDefinition[] {
    const lowercaseQuery = query.toLowerCase();
    return this.getAllWidgets().filter(widget => 
      widget.name.toLowerCase().includes(lowercaseQuery) ||
      widget.description.toLowerCase().includes(lowercaseQuery) ||
      widget.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }

  /**
   * Get widgets by complexity level
   */
  getWidgetsByComplexity(complexity: 'beginner' | 'intermediate' | 'advanced'): WidgetDefinition[] {
    return this.getAllWidgets().filter(widget => widget.complexity === complexity);
  }

  /**
   * Get widgets that support a specific data source
   */
  getWidgetsByDataSource(dataSource: string): WidgetDefinition[] {
    return this.getAllWidgets().filter(widget => 
      widget.supportedDataSources.includes(dataSource)
    );
  }

  /**
   * Create a widget instance from definition
   */
  createWidgetInstance(widgetId: string, customConfig?: Partial<WidgetInstance>): WidgetInstance | null {
    const definition = this.getWidget(widgetId);
    if (!definition) {
      return null;
    }

    const instance: WidgetInstance = {
      id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      widgetId: definition.id,
      title: definition.name,
      description: definition.description,
      config: {
        dataSource: {
          type: 'static',
          data: []
        },
        visualization: definition.defaultConfig.config?.visualization || {
          type: definition.type,
          options: {}
        }
      },
      refresh: {
        enabled: false,
        interval: 30000,
        autoRefresh: false,
        refreshOnVisible: true
      },
      visible: true,
      ...definition.defaultConfig,
      ...customConfig
    };

    return instance;
  }

  /**
   * Validate widget configuration against schema
   */
  validateWidgetConfig(widgetId: string, config: any): { valid: boolean; errors: string[] } {
    const definition = this.getWidget(widgetId);
    if (!definition) {
      return { valid: false, errors: ['Widget definition not found'] };
    }

    // Basic validation - in a real implementation, you'd use a JSON schema validator
    const errors: string[] = [];

    // Check required fields
    definition.requiredFields.forEach(field => {
      if (!config.dataSource || !config.dataSource.data || 
          !config.dataSource.data.some((item: any) => field in item)) {
        errors.push(`Required field '${field}' is missing from data source`);
      }
    });

    return { valid: errors.length === 0, errors };
  }

  /**
   * Get recommended widgets based on data structure
   */
  getRecommendedWidgets(dataStructure: any): WidgetDefinition[] {
    // Analyze data structure and recommend appropriate widgets
    const recommendations: WidgetDefinition[] = [];

    if (dataStructure.hasTimestamp) {
      recommendations.push(
        this.getWidget('line_chart')!,
        this.getWidget('area_chart')!,
        this.getWidget('threat_timeline')!
      );
    }

    if (dataStructure.hasCategorical) {
      recommendations.push(
        this.getWidget('bar_chart')!,
        this.getWidget('pie_chart')!
      );
    }

    if (dataStructure.hasGeolocation) {
      recommendations.push(this.getWidget('geolocation_map')!);
    }

    if (dataStructure.hasRelationships) {
      recommendations.push(this.getWidget('network_graph')!);
    }

    return recommendations.filter(Boolean);
  }
}

export const widgetLibrary = new WidgetLibrary();