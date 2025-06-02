// Core exports
export { DashboardEngine } from './core/dashboard-engine';
export { DefaultWidgetFactory } from './core/widget-factory';
export { DefaultDataProvider } from './core/data-provider';
export { DefaultWidgetRenderer } from './widgets/widget-renderer';

// Component exports
export { DashboardBuilder } from './components/dashboard-builder';
export { WidgetLibrary } from './components/widget-library';
export { RealTimeDashboard } from './components/real-time-dashboard';

// Widget components
export { default as ChartWidgetComponent } from './widgets/chart-widget';
export { default as TableWidgetComponent } from './widgets/table-widget';
export { default as MetricWidgetComponent } from './widgets/metric-widget';
export { default as AlertSummaryWidgetComponent } from './widgets/alert-summary-widget';

// Hooks
export { useRealTimeData, useMultipleRealTimeData, useConnectionStatus } from './hooks/use-real-time-data';

// Templates
export { 
  DASHBOARD_TEMPLATES,
  getDashboardTemplate,
  getDashboardTemplatesByCategory,
  searchDashboardTemplates,
  createDashboardFromTemplate
} from './templates/dashboard-templates';

// Type exports
export type {
  DashboardConfig,
  DashboardState,
  DashboardRow,
  DashboardColumn,
  DashboardLayout,
  DashboardPermissions,
  DashboardShare,
  DashboardTemplate,
  DashboardTheme,
  WidgetData,
  DashboardMetrics,
  TimeRange,
  TimeRangeQuickSelection,
  Filter,
  FilterOperator,
  FilterType,
  VisualizationConfig,
  DrilldownConfig,
  DataSource
} from './types/dashboard.types';

export type {
  BaseWidget,
  WidgetProps,
  WidgetFactory,
  WidgetRenderer,
  WidgetDataProvider,
  ChartWidget,
  ChartVisualizationConfig,
  TableWidget,
  TableVisualizationConfig,
  TableColumn,
  MetricWidget,
  MetricVisualizationConfig,
  TimelineWidget,
  TimelineVisualizationConfig,
  MapWidget,
  MapVisualizationConfig,
  TextWidget,
  TextVisualizationConfig,
  AlertSummaryWidget,
  AlertSummaryVisualizationConfig,
  AxisConfig,
  LegendConfig,
  TooltipConfig,
  ThresholdConfig,
  PaginationConfig,
  SortingConfig,
  FilteringConfig,
  RowSelectionConfig,
  MetricThreshold,
  MetricComparison,
  SparklineConfig
} from './types/widget.types';