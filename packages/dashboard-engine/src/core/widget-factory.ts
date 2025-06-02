import { 
  BaseWidget, 
  WidgetFactory,
  ChartWidget,
  TableWidget,
  MetricWidget,
  TimelineWidget,
  MapWidget,
  TextWidget,
  AlertSummaryWidget
} from '../types/widget.types';

export class DefaultWidgetFactory implements WidgetFactory {
  private widgetTypes: Map<string, any> = new Map();
  private schemas: Map<string, any> = new Map();

  constructor() {
    this.registerDefaultWidgets();
  }

  createWidget(type: string, config: Partial<BaseWidget>): BaseWidget {
    const WidgetClass = this.widgetTypes.get(type);
    if (!WidgetClass) {
      throw new Error(`Unknown widget type: ${type}`);
    }

    const defaults = this.getDefaultConfig(type);
    const widget = { ...defaults, ...config, type };

    const validation = this.validateConfig(widget);
    if (!validation.valid) {
      throw new Error(`Invalid widget configuration: ${validation.errors.join(', ')}`);
    }

    return widget as BaseWidget;
  }

  getAvailableTypes(): string[] {
    return Array.from(this.widgetTypes.keys());
  }

  getWidgetSchema(type: string): object {
    const schema = this.schemas.get(type);
    if (!schema) {
      throw new Error(`No schema found for widget type: ${type}`);
    }
    return schema;
  }

  validateConfig(config: Partial<BaseWidget>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic validation
    if (!config.type) {
      errors.push('Widget type is required');
    } else if (!this.widgetTypes.has(config.type)) {
      errors.push(`Unknown widget type: ${config.type}`);
    }

    if (!config.title || config.title.trim() === '') {
      errors.push('Widget title is required');
    }

    if (!config.dataSource) {
      errors.push('Data source is required');
    } else {
      const dsErrors = this.validateDataSource(config.dataSource);
      errors.push(...dsErrors);
    }

    if (!config.visualization) {
      errors.push('Visualization configuration is required');
    } else {
      const vizErrors = this.validateVisualization(config.type!, config.visualization);
      errors.push(...vizErrors);
    }

    // Type-specific validation
    if (config.type && this.widgetTypes.has(config.type)) {
      const typeErrors = this.validateTypeSpecific(config);
      errors.push(...typeErrors);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  getDefaultConfig(type: string): Partial<BaseWidget> {
    switch (type) {
      case 'chart':
        return {
          type: 'chart',
          title: 'New Chart',
          dataSource: {
            type: 'query',
            value: ''
          },
          visualization: {
            type: 'bar',
            options: {
              responsive: true,
              animation: true,
              showGrid: true,
              showLegend: true
            }
          }
        };

      case 'table':
        return {
          type: 'table',
          title: 'New Table',
          dataSource: {
            type: 'query',
            value: ''
          },
          visualization: {
            type: 'table',
            options: {
              columns: [],
              pagination: {
                enabled: true,
                pageSize: 10,
                pageSizeOptions: [10, 25, 50, 100],
                showSizeChanger: true,
                showQuickJumper: false,
                showTotal: true
              },
              sorting: {
                enabled: true,
                multiple: false
              },
              filtering: {
                enabled: true,
                quickFilter: true,
                columnFilters: true,
                globalSearch: true
              }
            }
          }
        };

      case 'metric':
        return {
          type: 'metric',
          title: 'New Metric',
          dataSource: {
            type: 'query',
            value: ''
          },
          visualization: {
            type: 'metric',
            options: {
              format: 'number',
              precision: 0,
              showTrend: false,
              sparkline: {
                enabled: false,
                type: 'line',
                height: 30
              }
            }
          }
        };

      case 'timeline':
        return {
          type: 'timeline',
          title: 'New Timeline',
          dataSource: {
            type: 'query',
            value: ''
          },
          visualization: {
            type: 'timeline',
            options: {
              timeField: 'timestamp',
              eventField: 'event',
              showMinimap: true,
              showZoom: true,
              maxEvents: 1000,
              clustering: true
            }
          }
        };

      case 'map':
        return {
          type: 'map',
          title: 'New Map',
          dataSource: {
            type: 'query',
            value: ''
          },
          visualization: {
            type: 'world',
            options: {
              showLegend: true,
              showTooltip: true,
              clustering: false,
              heatmap: false,
              zoom: {
                enabled: true,
                min: 1,
                max: 10
              }
            }
          }
        };

      case 'text':
        return {
          type: 'text',
          title: 'New Text Widget',
          dataSource: {
            type: 'static',
            value: {}
          },
          visualization: {
            type: 'text',
            options: {
              content: 'Enter your text here...',
              format: 'markdown',
              fontSize: '14px',
              textAlign: 'left'
            }
          }
        };

      case 'alert-summary':
        return {
          type: 'alert-summary',
          title: 'Alert Summary',
          dataSource: {
            type: 'query',
            value: ''
          },
          visualization: {
            type: 'alert-summary',
            options: {
              severityField: 'severity',
              statusField: 'status',
              timeField: 'timestamp',
              showTrend: true,
              maxAlerts: 100,
              severityColors: {
                critical: '#dc3545',
                high: '#fd7e14',
                medium: '#ffc107',
                low: '#28a745',
                info: '#17a2b8'
              },
              statusColors: {
                open: '#dc3545',
                investigating: '#ffc107',
                resolved: '#28a745',
                closed: '#6c757d'
              }
            }
          }
        };

      default:
        return {
          type,
          title: 'New Widget',
          dataSource: {
            type: 'static',
            value: {}
          },
          visualization: {
            type: 'text',
            options: {}
          }
        };
    }
  }

  registerWidget(type: string, widgetClass: any, schema: any): void {
    this.widgetTypes.set(type, widgetClass);
    this.schemas.set(type, schema);
  }

  private registerDefaultWidgets(): void {
    // Register built-in widget types
    this.registerWidget('chart', ChartWidget, this.getChartSchema());
    this.registerWidget('table', TableWidget, this.getTableSchema());
    this.registerWidget('metric', MetricWidget, this.getMetricSchema());
    this.registerWidget('timeline', TimelineWidget, this.getTimelineSchema());
    this.registerWidget('map', MapWidget, this.getMapSchema());
    this.registerWidget('text', TextWidget, this.getTextSchema());
    this.registerWidget('alert-summary', AlertSummaryWidget, this.getAlertSummarySchema());
  }

  private validateDataSource(dataSource: any): string[] {
    const errors: string[] = [];

    if (!dataSource.type) {
      errors.push('Data source type is required');
    } else if (!['query', 'api', 'static', 'streaming'].includes(dataSource.type)) {
      errors.push('Invalid data source type');
    }

    if (!dataSource.value) {
      errors.push('Data source value is required');
    }

    if (dataSource.timeout && (typeof dataSource.timeout !== 'number' || dataSource.timeout <= 0)) {
      errors.push('Data source timeout must be a positive number');
    }

    return errors;
  }

  private validateVisualization(type: string, visualization: any): string[] {
    const errors: string[] = [];

    if (!visualization.type) {
      errors.push('Visualization type is required');
    }

    if (!visualization.options) {
      errors.push('Visualization options are required');
    }

    // Type-specific visualization validation
    switch (type) {
      case 'chart':
        if (!['line', 'bar', 'area', 'pie', 'donut', 'scatter', 'radar', 'gauge'].includes(visualization.type)) {
          errors.push('Invalid chart visualization type');
        }
        break;
      case 'table':
        if (visualization.type !== 'table') {
          errors.push('Table widget must use table visualization');
        }
        if (!visualization.options.columns || !Array.isArray(visualization.options.columns)) {
          errors.push('Table widget requires columns configuration');
        }
        break;
      case 'metric':
        if (visualization.type !== 'metric') {
          errors.push('Metric widget must use metric visualization');
        }
        if (visualization.options.format && !['number', 'percentage', 'currency', 'bytes', 'duration'].includes(visualization.options.format)) {
          errors.push('Invalid metric format');
        }
        break;
    }

    return errors;
  }

  private validateTypeSpecific(config: Partial<BaseWidget>): string[] {
    const errors: string[] = [];

    switch (config.type) {
      case 'chart':
        // Chart-specific validation
        break;
      case 'table':
        // Table-specific validation
        break;
      case 'metric':
        // Metric-specific validation
        break;
      // Add more type-specific validation as needed
    }

    return errors;
  }

  // Schema definitions for each widget type
  private getChartSchema(): any {
    return {
      type: 'object',
      properties: {
        type: { const: 'chart' },
        title: { type: 'string', minLength: 1 },
        description: { type: 'string' },
        dataSource: { $ref: '#/definitions/dataSource' },
        visualization: {
          type: 'object',
          properties: {
            type: { enum: ['line', 'bar', 'area', 'pie', 'donut', 'scatter', 'radar', 'gauge'] },
            options: { type: 'object' }
          },
          required: ['type', 'options']
        }
      },
      required: ['type', 'title', 'dataSource', 'visualization']
    };
  }

  private getTableSchema(): any {
    return {
      type: 'object',
      properties: {
        type: { const: 'table' },
        title: { type: 'string', minLength: 1 },
        description: { type: 'string' },
        dataSource: { $ref: '#/definitions/dataSource' },
        visualization: {
          type: 'object',
          properties: {
            type: { const: 'table' },
            options: {
              type: 'object',
              properties: {
                columns: { type: 'array', items: { type: 'object' } }
              },
              required: ['columns']
            }
          },
          required: ['type', 'options']
        }
      },
      required: ['type', 'title', 'dataSource', 'visualization']
    };
  }

  private getMetricSchema(): any {
    return {
      type: 'object',
      properties: {
        type: { const: 'metric' },
        title: { type: 'string', minLength: 1 },
        description: { type: 'string' },
        dataSource: { $ref: '#/definitions/dataSource' },
        visualization: {
          type: 'object',
          properties: {
            type: { const: 'metric' },
            options: { type: 'object' }
          },
          required: ['type', 'options']
        }
      },
      required: ['type', 'title', 'dataSource', 'visualization']
    };
  }

  private getTimelineSchema(): any {
    return {
      type: 'object',
      properties: {
        type: { const: 'timeline' },
        title: { type: 'string', minLength: 1 },
        description: { type: 'string' },
        dataSource: { $ref: '#/definitions/dataSource' },
        visualization: {
          type: 'object',
          properties: {
            type: { const: 'timeline' },
            options: {
              type: 'object',
              properties: {
                timeField: { type: 'string' },
                eventField: { type: 'string' }
              },
              required: ['timeField', 'eventField']
            }
          },
          required: ['type', 'options']
        }
      },
      required: ['type', 'title', 'dataSource', 'visualization']
    };
  }

  private getMapSchema(): any {
    return {
      type: 'object',
      properties: {
        type: { const: 'map' },
        title: { type: 'string', minLength: 1 },
        description: { type: 'string' },
        dataSource: { $ref: '#/definitions/dataSource' },
        visualization: {
          type: 'object',
          properties: {
            type: { enum: ['world', 'country', 'region', 'network'] },
            options: { type: 'object' }
          },
          required: ['type', 'options']
        }
      },
      required: ['type', 'title', 'dataSource', 'visualization']
    };
  }

  private getTextSchema(): any {
    return {
      type: 'object',
      properties: {
        type: { const: 'text' },
        title: { type: 'string', minLength: 1 },
        description: { type: 'string' },
        dataSource: { $ref: '#/definitions/dataSource' },
        visualization: {
          type: 'object',
          properties: {
            type: { const: 'text' },
            options: {
              type: 'object',
              properties: {
                content: { type: 'string' },
                format: { enum: ['plain', 'markdown', 'html'] }
              },
              required: ['content', 'format']
            }
          },
          required: ['type', 'options']
        }
      },
      required: ['type', 'title', 'dataSource', 'visualization']
    };
  }

  private getAlertSummarySchema(): any {
    return {
      type: 'object',
      properties: {
        type: { const: 'alert-summary' },
        title: { type: 'string', minLength: 1 },
        description: { type: 'string' },
        dataSource: { $ref: '#/definitions/dataSource' },
        visualization: {
          type: 'object',
          properties: {
            type: { const: 'alert-summary' },
            options: {
              type: 'object',
              properties: {
                severityField: { type: 'string' },
                statusField: { type: 'string' },
                timeField: { type: 'string' }
              },
              required: ['severityField', 'statusField', 'timeField']
            }
          },
          required: ['type', 'options']
        }
      },
      required: ['type', 'title', 'dataSource', 'visualization']
    };
  }
}