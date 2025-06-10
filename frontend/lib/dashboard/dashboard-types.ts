// Dashboard Configuration Types
export interface DashboardConfig {
  id: string;
  title: string;
  description: string;
  version: string;
  layout: DashboardLayout;
  settings: DashboardSettings;
  permissions: DashboardPermissions;
  metadata: DashboardMetadata;
}

export interface DashboardLayout {
  type: 'grid' | 'flex' | 'responsive';
  rows: DashboardRow[];
  globalFilters?: Filter[];
  timeRange: TimeRange;
}

export interface DashboardRow {
  id: string;
  height: number | 'auto';
  columns: DashboardColumn[];
  conditions?: DisplayCondition[];
}

export interface DashboardColumn {
  id: string;
  width: number; // 1-12 for grid system
  widget: WidgetInstance;
  responsive?: ResponsiveConfig;
}

export interface WidgetInstance {
  id: string;
  widgetId: string;
  title: string;
  description?: string;
  config: WidgetConfig;
  drilldown?: DrilldownConfig;
  refresh: RefreshConfig;
  visible: boolean;
  interactions?: WidgetInteraction[];
}

export interface WidgetConfig {
  dataSource: DataSourceConfig;
  visualization: VisualizationConfig;
  filters?: Filter[];
  aggregations?: Aggregation[];
  sorting?: SortConfig[];
  formatting?: FormattingConfig;
  alerts?: AlertConfig[];
}

export interface DataSourceConfig {
  type: 'kql' | 'api' | 'static' | 'realtime';
  query?: string;
  endpoint?: string;
  data?: any[];
  parameters?: Record<string, any>;
  cache?: CacheConfig;
}

export interface VisualizationConfig {
  type: VisualizationType;
  options: Record<string, any>;
  theme?: ThemeConfig;
  interactions?: InteractionConfig;
}

export type VisualizationType = 
  | 'line_chart'
  | 'bar_chart'
  | 'pie_chart'
  | 'donut_chart'
  | 'area_chart'
  | 'scatter_plot'
  | 'heatmap'
  | 'treemap'
  | 'gauge'
  | 'metric_card'
  | 'table'
  | 'timeline'
  | 'network_graph'
  | 'geolocation_map'
  | 'sankey_diagram'
  | 'funnel_chart'
  | 'radar_chart'
  | 'waterfall_chart'
  | 'correlation_matrix'
  | 'text_widget'
  | 'image_widget'
  | 'iframe_widget';

export interface DrilldownConfig {
  enabled: boolean;
  type: 'dashboard' | 'query' | 'modal' | 'sidebar';
  target?: string;
  parameters?: Record<string, string>;
  passFilters?: boolean;
}

export interface RefreshConfig {
  enabled: boolean;
  interval: number; // in milliseconds
  autoRefresh: boolean;
  refreshOnVisible: boolean;
  lastRefresh?: string;
}

export interface WidgetInteraction {
  event: 'click' | 'hover' | 'select';
  action: InteractionAction;
}

export interface InteractionAction {
  type: 'filter' | 'navigate' | 'highlight' | 'modal' | 'alert';
  target?: string;
  parameters?: Record<string, any>;
}

export interface Filter {
  id: string;
  field: string;
  operator: FilterOperator;
  value: any;
  label?: string;
  required?: boolean;
}

export type FilterOperator = 
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'greater_equal'
  | 'less_equal'
  | 'in'
  | 'not_in'
  | 'between'
  | 'is_null'
  | 'is_not_null'
  | 'regex_match';

export interface Aggregation {
  field: string;
  function: AggregationFunction;
  alias?: string;
  groupBy?: string[];
}

export type AggregationFunction = 
  | 'count'
  | 'sum'
  | 'avg'
  | 'min'
  | 'max'
  | 'median'
  | 'mode'
  | 'stddev'
  | 'variance'
  | 'percentile'
  | 'distinct_count'
  | 'first'
  | 'last';

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
  priority: number;
}

export interface FormattingConfig {
  numberFormat?: NumberFormat;
  dateFormat?: string;
  colorScheme?: ColorScheme;
  customColors?: Record<string, string>;
}

export interface NumberFormat {
  decimals?: number;
  thousands?: string;
  prefix?: string;
  suffix?: string;
  scale?: 'none' | 'thousands' | 'millions' | 'billions';
}

export interface ColorScheme {
  type: 'categorical' | 'sequential' | 'diverging' | 'custom';
  name: string;
  colors?: string[];
}

export interface AlertConfig {
  id: string;
  condition: AlertCondition;
  notification: NotificationConfig;
  enabled: boolean;
}

export interface AlertCondition {
  metric: string;
  operator: FilterOperator;
  threshold: number;
  timeWindow?: number;
}

export interface NotificationConfig {
  type: 'toast' | 'email' | 'webhook' | 'dashboard';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  recipients?: string[];
}

export interface TimeRange {
  type: 'relative' | 'absolute';
  value: string | { start: string; end: string };
  timezone?: string;
}

export interface DashboardSettings {
  theme: 'light' | 'dark' | 'auto';
  autoRefresh: boolean;
  refreshInterval: number;
  showFilters: boolean;
  showTimeRange: boolean;
  fullScreenMode: boolean;
  density: 'compact' | 'comfortable' | 'spacious';
}

export interface DashboardPermissions {
  owner: string;
  isPublic: boolean;
  sharedWith: SharedPermission[];
  editableBy: string[];
  viewableBy: string[];
}

export interface SharedPermission {
  type: 'user' | 'role' | 'team' | 'organization';
  id: string;
  permission: 'view' | 'edit' | 'admin';
  grantedBy: string;
  grantedAt: string;
  expiresAt?: string;
}

export interface DashboardMetadata {
  created: string;
  lastModified: string;
  version: string;
  tags: string[];
  category: string;
  isTemplate: boolean;
  templateId?: string;
  usage: UsageMetrics;
}

export interface UsageMetrics {
  views: number;
  lastViewed: string;
  averageViewTime: number;
  popularWidgets: string[];
  errorRate: number;
}

export interface ResponsiveConfig {
  mobile: {
    width: number;
    height?: number;
    visible: boolean;
  };
  tablet: {
    width: number;
    height?: number;
    visible: boolean;
  };
  desktop: {
    width: number;
    height?: number;
    visible: boolean;
  };
}

export interface DisplayCondition {
  field: string;
  operator: FilterOperator;
  value: any;
  action: 'show' | 'hide';
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number; // time to live in seconds
  refreshOnFocus: boolean;
  staleWhileRevalidate: boolean;
}

export interface ThemeConfig {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    border: string;
  };
  fonts: {
    title: string;
    body: string;
    mono: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
}

export interface InteractionConfig {
  hover: boolean;
  click: boolean;
  zoom: boolean;
  pan: boolean;
  select: boolean;
  brush: boolean;
}

// Pre-built Dashboard Templates
export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  preview: string; // URL to preview image
  config: DashboardConfig;
  requiredDataSources: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedSetupTime: number; // in minutes
}

// Dashboard Export/Import Types
export interface DashboardExport {
  version: string;
  exportedAt: string;
  dashboard: DashboardConfig;
  dependencies: string[];
  metadata: ExportMetadata;
}

export interface ExportMetadata {
  format: 'json' | 'yaml' | 'xml';
  includeData: boolean;
  includeDependencies: boolean;
  compression?: 'gzip' | 'zip';
}