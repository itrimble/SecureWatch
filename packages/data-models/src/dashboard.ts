export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  layout: DashboardLayout;
  widgets: DashboardWidget[];
  isPublic: boolean;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardLayout {
  columns: number;
  rows: number;
  gaps: number;
}

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  config: WidgetConfig;
}

export type WidgetType = 'chart' | 'metric' | 'table' | 'map' | 'text' | 'alert-summary';

export interface WidgetConfig {
  query?: string;
  timeRange?: string;
  refreshInterval?: number;
  visualization?: {
    type: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
    colors?: string[];
    axes?: {
      x?: string;
      y?: string;
    };
  };
  [key: string]: any;
}