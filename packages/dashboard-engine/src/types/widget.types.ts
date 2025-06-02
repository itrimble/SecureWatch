import { ReactNode } from 'react';
import { DataSource, VisualizationConfig, DrilldownConfig } from './dashboard.types';

export interface BaseWidget {
  id: string;
  type: string;
  title: string;
  description?: string;
  dataSource: DataSource;
  visualization: VisualizationConfig;
  drilldown?: DrilldownConfig;
  refreshInterval?: number;
  loading?: boolean;
  error?: string;
}

export interface WidgetProps {
  widget: BaseWidget;
  data?: any;
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
  onDrilldown?: (params: any) => void;
  onEdit?: () => void;
  editable?: boolean;
  className?: string;
}

export interface ChartWidget extends BaseWidget {
  type: 'chart';
  visualization: ChartVisualizationConfig;
}

export interface ChartVisualizationConfig extends VisualizationConfig {
  type: 'line' | 'bar' | 'area' | 'pie' | 'donut' | 'scatter' | 'radar' | 'gauge';
  options: {
    xAxis?: AxisConfig;
    yAxis?: AxisConfig;
    legend?: LegendConfig;
    tooltip?: TooltipConfig;
    colors?: string[];
    stacked?: boolean;
    normalized?: boolean;
    showDataLabels?: boolean;
    showGrid?: boolean;
    showZoom?: boolean;
    showBrush?: boolean;
    responsive?: boolean;
    animation?: boolean;
    threshold?: ThresholdConfig[];
  };
}

export interface AxisConfig {
  label?: string;
  type?: 'number' | 'category' | 'time';
  domain?: [number, number] | string[];
  tickCount?: number;
  tickFormatter?: string;
  hide?: boolean;
}

export interface LegendConfig {
  show: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
}

export interface TooltipConfig {
  show: boolean;
  formatter?: string;
  labelFormatter?: string;
}

export interface ThresholdConfig {
  value: number;
  color: string;
  label?: string;
  style?: 'line' | 'area';
}

export interface TableWidget extends BaseWidget {
  type: 'table';
  visualization: TableVisualizationConfig;
}

export interface TableVisualizationConfig extends VisualizationConfig {
  type: 'table';
  options: {
    columns: TableColumn[];
    pagination?: PaginationConfig;
    sorting?: SortingConfig;
    filtering?: FilteringConfig;
    rowSelection?: RowSelectionConfig;
    virtualization?: boolean;
    density?: 'compact' | 'standard' | 'comfortable';
    striped?: boolean;
    bordered?: boolean;
    hoverable?: boolean;
  };
}

export interface TableColumn {
  key: string;
  title: string;
  dataType: 'string' | 'number' | 'date' | 'boolean' | 'ip' | 'user' | 'host';
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  sortable?: boolean;
  filterable?: boolean;
  formatter?: string;
  render?: string; // function string for custom rendering
  align?: 'left' | 'center' | 'right';
  fixed?: 'left' | 'right';
  ellipsis?: boolean;
}

export interface PaginationConfig {
  enabled: boolean;
  pageSize: number;
  pageSizeOptions: number[];
  showSizeChanger: boolean;
  showQuickJumper: boolean;
  showTotal: boolean;
}

export interface SortingConfig {
  enabled: boolean;
  multiple: boolean;
  defaultSort?: {
    column: string;
    direction: 'asc' | 'desc';
  };
}

export interface FilteringConfig {
  enabled: boolean;
  quickFilter: boolean;
  columnFilters: boolean;
  globalSearch: boolean;
}

export interface RowSelectionConfig {
  enabled: boolean;
  type: 'checkbox' | 'radio';
  selectedRowKeys?: string[];
  onSelectionChange?: string;
}

export interface MetricWidget extends BaseWidget {
  type: 'metric';
  visualization: MetricVisualizationConfig;
}

export interface MetricVisualizationConfig extends VisualizationConfig {
  type: 'metric';
  options: {
    format: 'number' | 'percentage' | 'currency' | 'bytes' | 'duration';
    precision?: number;
    prefix?: string;
    suffix?: string;
    showTrend?: boolean;
    trendPeriod?: string;
    thresholds?: MetricThreshold[];
    comparison?: MetricComparison;
    sparkline?: SparklineConfig;
  };
}

export interface MetricThreshold {
  min?: number;
  max?: number;
  color: string;
  label?: string;
  icon?: string;
}

export interface MetricComparison {
  enabled: boolean;
  period: string;
  format: 'absolute' | 'percentage';
  showIndicator: boolean;
}

export interface SparklineConfig {
  enabled: boolean;
  type: 'line' | 'bar' | 'area';
  color?: string;
  height?: number;
}

export interface TimelineWidget extends BaseWidget {
  type: 'timeline';
  visualization: TimelineVisualizationConfig;
}

export interface TimelineVisualizationConfig extends VisualizationConfig {
  type: 'timeline';
  options: {
    timeField: string;
    eventField: string;
    categoryField?: string;
    severityField?: string;
    descriptionField?: string;
    groupBy?: string;
    showMinimap?: boolean;
    showZoom?: boolean;
    showBrush?: boolean;
    colorMapping?: Record<string, string>;
    iconMapping?: Record<string, string>;
    maxEvents?: number;
    clustering?: boolean;
  };
}

export interface MapWidget extends BaseWidget {
  type: 'map';
  visualization: MapVisualizationConfig;
}

export interface MapVisualizationConfig extends VisualizationConfig {
  type: 'world' | 'country' | 'region' | 'network';
  options: {
    latitudeField?: string;
    longitudeField?: string;
    valueField?: string;
    categoryField?: string;
    showLegend?: boolean;
    showTooltip?: boolean;
    colorScale?: string[];
    markerSize?: number;
    clustering?: boolean;
    heatmap?: boolean;
    projection?: string;
    zoom?: {
      enabled: boolean;
      min: number;
      max: number;
    };
  };
}

export interface TextWidget extends BaseWidget {
  type: 'text';
  visualization: TextVisualizationConfig;
}

export interface TextVisualizationConfig extends VisualizationConfig {
  type: 'text';
  options: {
    content: string;
    format: 'plain' | 'markdown' | 'html';
    variables?: Record<string, string>;
    fontSize?: string;
    textAlign?: 'left' | 'center' | 'right';
    backgroundColor?: string;
    textColor?: string;
    padding?: string;
  };
}

export interface AlertSummaryWidget extends BaseWidget {
  type: 'alert-summary';
  visualization: AlertSummaryVisualizationConfig;
}

export interface AlertSummaryVisualizationConfig extends VisualizationConfig {
  type: 'alert-summary';
  options: {
    severityField: string;
    statusField: string;
    timeField: string;
    showTrend?: boolean;
    groupBy?: string;
    maxAlerts?: number;
    severityColors?: Record<string, string>;
    statusColors?: Record<string, string>;
  };
}

export interface WidgetFactory {
  createWidget: (type: string, config: Partial<BaseWidget>) => BaseWidget;
  getAvailableTypes: () => string[];
  getWidgetSchema: (type: string) => object;
  validateConfig: (config: Partial<BaseWidget>) => { valid: boolean; errors: string[] };
}

export interface WidgetRenderer {
  render: (widget: BaseWidget, data: any, props: WidgetProps) => ReactNode;
  canRender: (type: string) => boolean;
  getDefaultConfig: (type: string) => Partial<BaseWidget>;
}

export interface WidgetDataProvider {
  fetchData: (dataSource: DataSource, params?: any) => Promise<any>;
  subscribeToUpdates: (dataSource: DataSource, callback: (data: any) => void) => () => void;
  getCachedData: (dataSource: DataSource) => any | null;
  invalidateCache: (dataSource: DataSource) => void;
}