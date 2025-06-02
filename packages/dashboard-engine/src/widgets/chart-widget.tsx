import React, { useMemo } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ScatterChart, Scatter, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { ChartWidget, WidgetProps, ThresholdConfig } from '../types/widget.types';

interface ChartWidgetProps extends WidgetProps {
  widget: ChartWidget;
}

export const ChartWidgetComponent: React.FC<ChartWidgetProps> = ({
  widget,
  data,
  loading,
  error,
  onRefresh,
  onDrilldown,
  onEdit,
  editable = false,
  className = ''
}) => {
  const chartData = useMemo(() => {
    if (!data || !data.data) return [];
    return Array.isArray(data.data) ? data.data : [];
  }, [data]);

  const { visualization } = widget;
  const { type, options } = visualization;

  const defaultColors = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00',
    '#0088fe', '#ff8042', '#ffbb28', '#8dd1e1', '#d084d0'
  ];

  const colors = options.colors || defaultColors;

  if (loading) {
    return (
      <div className={`widget-container ${className}`}>
        <div className="widget-header">
          <h3 className="widget-title">{widget.title}</h3>
          {editable && (
            <button onClick={onEdit} className="widget-edit-btn">
              ⚙️
            </button>
          )}
        </div>
        <div className="widget-content loading">
          <div className="spinner">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`widget-container error ${className}`}>
        <div className="widget-header">
          <h3 className="widget-title">{widget.title}</h3>
          {onRefresh && (
            <button onClick={onRefresh} className="widget-refresh-btn">
              🔄
            </button>
          )}
        </div>
        <div className="widget-content">
          <div className="error-message">
            ❌ {error}
          </div>
        </div>
      </div>
    );
  }

  const renderThresholds = (thresholds: ThresholdConfig[]) => {
    return thresholds.map((threshold, index) => (
      <Line
        key={`threshold-${index}`}
        type="monotone"
        dataKey={() => threshold.value}
        stroke={threshold.color}
        strokeDasharray="5 5"
        dot={false}
        name={threshold.label || `Threshold ${threshold.value}`}
      />
    ));
  };

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <LineChart data={chartData}>
            {options.showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis 
              dataKey={options.xAxis?.label || 'x'}
              type={options.xAxis?.type || 'category'}
              hide={options.xAxis?.hide}
              tickFormatter={options.xAxis?.tickFormatter ? eval(options.xAxis.tickFormatter) : undefined}
            />
            <YAxis 
              type={options.yAxis?.type || 'number'}
              domain={options.yAxis?.domain}
              hide={options.yAxis?.hide}
              tickFormatter={options.yAxis?.tickFormatter ? eval(options.yAxis.tickFormatter) : undefined}
            />
            {options.showTooltip !== false && <Tooltip />}
            {options.showLegend !== false && <Legend />}
            {chartData.length > 0 && Object.keys(chartData[0]).filter(key => key !== (options.xAxis?.label || 'x')).map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={options.showDataLabels}
                connectNulls={false}
              />
            ))}
            {options.threshold && renderThresholds(options.threshold)}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart data={chartData}>
            {options.showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey={options.xAxis?.label || 'x'} />
            <YAxis />
            {options.showTooltip !== false && <Tooltip />}
            {options.showLegend !== false && <Legend />}
            {chartData.length > 0 && Object.keys(chartData[0]).filter(key => key !== (options.xAxis?.label || 'x')).map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stackId={options.stacked ? '1' : undefined}
                stroke={colors[index % colors.length]}
                fill={colors[index % colors.length]}
                fillOpacity={0.6}
              />
            ))}
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart data={chartData}>
            {options.showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey={options.xAxis?.label || 'x'} />
            <YAxis />
            {options.showTooltip !== false && <Tooltip />}
            {options.showLegend !== false && <Legend />}
            {chartData.length > 0 && Object.keys(chartData[0]).filter(key => key !== (options.xAxis?.label || 'x')).map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={colors[index % colors.length]}
                onClick={onDrilldown ? (data) => onDrilldown({ key, data }) : undefined}
              />
            ))}
          </BarChart>
        );

      case 'pie':
      case 'donut':
        return (
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={type === 'donut' ? 60 : 0}
              outerRadius={80}
              paddingAngle={2}
              onClick={onDrilldown ? (data) => onDrilldown(data) : undefined}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            {options.showTooltip !== false && <Tooltip />}
            {options.showLegend !== false && <Legend />}
          </PieChart>
        );

      case 'scatter':
        return (
          <ScatterChart data={chartData}>
            {options.showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey={options.xAxis?.label || 'x'} type="number" />
            <YAxis dataKey={options.yAxis?.label || 'y'} type="number" />
            {options.showTooltip !== false && <Tooltip />}
            {options.showLegend !== false && <Legend />}
            <Scatter
              dataKey="z"
              fill={colors[0]}
              onClick={onDrilldown ? (data) => onDrilldown(data) : undefined}
            />
          </ScatterChart>
        );

      case 'radar':
        return (
          <RadarChart data={chartData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" />
            <PolarRadiusAxis />
            {options.showTooltip !== false && <Tooltip />}
            {options.showLegend !== false && <Legend />}
            {chartData.length > 0 && Object.keys(chartData[0]).filter(key => key !== 'subject').map((key, index) => (
              <Radar
                key={key}
                name={key}
                dataKey={key}
                stroke={colors[index % colors.length]}
                fill={colors[index % colors.length]}
                fillOpacity={0.6}
              />
            ))}
          </RadarChart>
        );

      default:
        return (
          <div className="unsupported-chart">
            Unsupported chart type: {type}
          </div>
        );
    }
  };

  return (
    <div className={`widget-container chart-widget ${className}`}>
      <div className="widget-header">
        <div className="widget-title-section">
          <h3 className="widget-title">{widget.title}</h3>
          {widget.description && (
            <p className="widget-description">{widget.description}</p>
          )}
        </div>
        <div className="widget-actions">
          {onRefresh && (
            <button 
              onClick={onRefresh} 
              className="widget-action-btn refresh-btn"
              title="Refresh"
            >
              🔄
            </button>
          )}
          {editable && (
            <button 
              onClick={onEdit} 
              className="widget-action-btn edit-btn"
              title="Edit"
            >
              ⚙️
            </button>
          )}
        </div>
      </div>
      <div className="widget-content">
        {chartData.length === 0 ? (
          <div className="no-data">
            📊 No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        )}
      </div>
      {data?.query && (
        <div className="widget-footer">
          <small className="query-info">
            Query executed in {data.executionTime}ms • {data.totalRows} rows
          </small>
        </div>
      )}
    </div>
  );
};

export default ChartWidgetComponent;