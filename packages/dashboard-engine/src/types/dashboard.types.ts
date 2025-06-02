export interface DashboardConfig {
  id: string;
  title: string;
  description: string;
  layout: DashboardLayout;
  refreshInterval: number; // in seconds
  timeRange: TimeRange;
  filters: Filter[];
  permissions: DashboardPermissions;
  theme?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  version: number;
}

export interface DashboardLayout {
  rows: DashboardRow[];
  breakpoints: {
    lg: number;
    md: number;
    sm: number;
    xs: number;
  };
}

export interface DashboardRow {
  id: string;
  height: number;
  columns: DashboardColumn[];
  collapsed?: boolean;
  collapsible?: boolean;
}

export interface DashboardColumn {
  id: string;
  width: number; // 1-12 grid system
  widgetId: string;
  widgetConfig: WidgetConfig;
  minWidth?: number;
  maxWidth?: number;
}

export interface WidgetConfig {
  type: WidgetType;
  title: string;
  description?: string;
  dataSource: DataSource;
  visualization: VisualizationConfig;
  drilldown?: DrilldownConfig;
  refreshInterval?: number;
  errorBoundary?: boolean;
  loading?: boolean;
  cacheEnabled?: boolean;
  cacheTTL?: number;
}

export type WidgetType = 
  | 'chart' 
  | 'table' 
  | 'metric' 
  | 'timeline' 
  | 'map' 
  | 'text' 
  | 'alert-summary'
  | 'threat-feed'
  | 'log-volume'
  | 'performance-stats'
  | 'security-score'
  | 'event-timeline'
  | 'geo-map'
  | 'network-graph'
  | 'heat-map'
  | 'correlation-matrix';

export interface DataSource {
  type: 'query' | 'api' | 'static' | 'streaming';
  value: string | object;
  params?: Record<string, any>;
  refreshInterval?: number;
  timeout?: number;
}

export interface VisualizationConfig {
  type: string; // 'bar', 'line', 'pie', 'area', 'scatter', etc.
  options: Record<string, any>;
  colors?: string[];
  responsive?: boolean;
  animation?: boolean;
  interactive?: boolean;
}

export interface DrilldownConfig {
  enabled: boolean;
  target: {
    type: 'dashboard' | 'page' | 'modal' | 'external';
    value: string;
  };
  params?: Record<string, any>;
  filters?: Filter[];
}

export interface TimeRange {
  type: 'relative' | 'absolute';
  value: string | { start: string; end: string };
  quickSelections?: TimeRangeQuickSelection[];
}

export interface TimeRangeQuickSelection {
  label: string;
  value: string;
  relative: boolean;
}

export interface Filter {
  id: string;
  field: string;
  operator: FilterOperator;
  value: any;
  type: FilterType;
  enabled: boolean;
  locked?: boolean;
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
  | 'is_null'
  | 'is_not_null'
  | 'between';

export type FilterType = 
  | 'string'
  | 'number'
  | 'date'
  | 'boolean'
  | 'array'
  | 'ip'
  | 'user'
  | 'host';

export interface DashboardPermissions {
  owner: string;
  isPublic: boolean;
  sharedWith: DashboardShare[];
  allowedRoles?: string[];
  restrictedFields?: string[];
}

export interface DashboardShare {
  type: 'user' | 'role' | 'team' | 'organization';
  id: string;
  permission: 'view' | 'edit' | 'admin';
  expiresAt?: string;
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  config: Omit<DashboardConfig, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>;
  previewImage?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedSetupTime: number; // in minutes
}

export interface DashboardTheme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      small: string;
      medium: string;
      large: string;
      xlarge: string;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: string;
  shadow: string;
}

export interface DashboardState {
  config: DashboardConfig;
  isEditing: boolean;
  selectedWidget?: string;
  draggedWidget?: string;
  timeRange: TimeRange;
  filters: Filter[];
  refreshing: boolean;
  lastRefresh: string;
  errors: Record<string, string>;
}

export interface WidgetData {
  widgetId: string;
  data: any;
  loading: boolean;
  error?: string;
  lastUpdated: string;
  cacheHit?: boolean;
}

export interface DashboardMetrics {
  loadTime: number;
  renderTime: number;
  widgetCount: number;
  dataSourceCount: number;
  errorCount: number;
  cacheHitRate: number;
  refreshCount: number;
  userInteractions: number;
}