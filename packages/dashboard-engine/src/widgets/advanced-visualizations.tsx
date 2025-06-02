import React, { useMemo } from 'react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, Cell, ReferenceLine
} from 'recharts';
import { BaseWidget, WidgetProps } from '../types/widget.types';

// Time Series Visualization Component
interface TimeSeriesWidgetProps extends WidgetProps {
  widget: BaseWidget;
}

export const TimeSeriesWidget: React.FC<TimeSeriesWidgetProps> = ({
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
  const timeSeriesData = useMemo(() => {
    if (!data || !data.data) return [];
    
    // Ensure data is properly formatted for time series
    return Array.isArray(data.data) ? data.data.map(item => ({
      ...item,
      timestamp: new Date(item.timestamp || item.time || item.x).getTime()
    })).sort((a, b) => a.timestamp - b.timestamp) : [];
  }, [data]);

  const { visualization } = widget;
  const { options } = visualization;

  // Detect anomalies in time series data
  const anomalies = useMemo(() => {
    if (!options.detectAnomalies || timeSeriesData.length < 10) return [];
    
    const values = timeSeriesData.map(d => d.value || d.y || 0);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const threshold = options.anomalyThreshold || 2;
    
    return timeSeriesData.filter((d, index) => {
      const value = d.value || d.y || 0;
      return Math.abs(value - mean) > threshold * stdDev;
    });
  }, [timeSeriesData, options.detectAnomalies, options.anomalyThreshold]);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    if (options.timeFormat === 'relative') {
      const now = Date.now();
      const diff = now - timestamp;
      if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
      return `${Math.floor(diff / 86400000)}d ago`;
    }
    return date.toLocaleTimeString();
  };

  if (loading) {
    return (
      <div className={`widget-container time-series-widget ${className}`}>
        <div className="widget-header">
          <h3 className="widget-title">{widget.title}</h3>
        </div>
        <div className="widget-content loading">
          <div className="spinner">Loading time series...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`widget-container time-series-widget error ${className}`}>
        <div className="widget-header">
          <h3 className="widget-title">{widget.title}</h3>
          {onRefresh && (
            <button onClick={onRefresh} className="widget-refresh-btn">🔄</button>
          )}
        </div>
        <div className="widget-content">
          <div className="error-message">❌ {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`widget-container time-series-widget ${className}`}>
      <div className="widget-header">
        <div className="widget-title-section">
          <h3 className="widget-title">{widget.title}</h3>
          {widget.description && (
            <p className="widget-description">{widget.description}</p>
          )}
        </div>
        <div className="widget-actions">
          {anomalies.length > 0 && (
            <span className="anomaly-indicator" title={`${anomalies.length} anomalies detected`}>
              ⚠️ {anomalies.length}
            </span>
          )}
          {onRefresh && (
            <button onClick={onRefresh} className="widget-action-btn refresh-btn">🔄</button>
          )}
          {editable && (
            <button onClick={onEdit} className="widget-action-btn edit-btn">⚙️</button>
          )}
        </div>
      </div>

      <div className="widget-content">
        {timeSeriesData.length === 0 ? (
          <div className="no-data">📈 No time series data available</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {options.chartType === 'area' ? (
              <AreaChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={formatTimestamp}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => formatTimestamp(value as number)}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.6}
                />
                {anomalies.map((anomaly, index) => (
                  <ReferenceLine
                    key={index}
                    x={anomaly.timestamp}
                    stroke="#ff0000"
                    strokeDasharray="2 2"
                    label="Anomaly"
                  />
                ))}
              </AreaChart>
            ) : (
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={formatTimestamp}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => formatTimestamp(value as number)}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#8884d8"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  connectNulls={false}
                />
                {/* Trend line if enabled */}
                {options.showTrend && (
                  <Line
                    type="linear"
                    dataKey="trend"
                    stroke="#ff7300"
                    strokeDasharray="5 5"
                    dot={false}
                    name="Trend"
                  />
                )}
                {anomalies.map((anomaly, index) => (
                  <ReferenceLine
                    key={index}
                    x={anomaly.timestamp}
                    stroke="#ff0000"
                    strokeDasharray="2 2"
                    label="Anomaly"
                  />
                ))}
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {data?.query && (
        <div className="widget-footer">
          <small className="query-info">
            {timeSeriesData.length} data points • {anomalies.length} anomalies
          </small>
        </div>
      )}
    </div>
  );
};

// Correlation Matrix Visualization Component
export const CorrelationMatrixWidget: React.FC<WidgetProps> = ({
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
  const correlationData = useMemo(() => {
    if (!data || !data.data) return { matrix: [], variables: [] };
    
    const rawData = Array.isArray(data.data) ? data.data : [data.data];
    if (rawData.length === 0) return { matrix: [], variables: [] };
    
    // Extract correlation matrix from data
    if (rawData[0].correlationMatrix) {
      return {
        matrix: rawData[0].correlationMatrix,
        variables: rawData[0].variables || []
      };
    }
    
    // Calculate correlation matrix from raw data
    const variables = Object.keys(rawData[0]).filter(key => 
      typeof rawData[0][key] === 'number'
    );
    
    const matrix = variables.map((var1, i) => 
      variables.map((var2, j) => {
        if (i === j) return 1; // Perfect correlation with self
        
        const values1 = rawData.map(item => item[var1]).filter(val => typeof val === 'number');
        const values2 = rawData.map(item => item[var2]).filter(val => typeof val === 'number');
        
        if (values1.length < 2 || values2.length < 2) return 0;
        
        return calculateCorrelation(values1, values2);
      })
    );
    
    return { matrix, variables };
  }, [data]);

  const getCorrelationColor = (value: number) => {
    const intensity = Math.abs(value);
    const hue = value >= 0 ? 120 : 0; // Green for positive, red for negative
    const saturation = 70;
    const lightness = 90 - (intensity * 40); // Darker for stronger correlation
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  const getCorrelationText = (value: number) => {
    const abs = Math.abs(value);
    if (abs >= 0.8) return 'Very Strong';
    if (abs >= 0.6) return 'Strong';
    if (abs >= 0.4) return 'Moderate';
    if (abs >= 0.2) return 'Weak';
    return 'Very Weak';
  };

  if (loading) {
    return (
      <div className={`widget-container correlation-matrix-widget ${className}`}>
        <div className="widget-header">
          <h3 className="widget-title">{widget.title}</h3>
        </div>
        <div className="widget-content loading">
          <div className="spinner">Calculating correlations...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`widget-container correlation-matrix-widget error ${className}`}>
        <div className="widget-header">
          <h3 className="widget-title">{widget.title}</h3>
          {onRefresh && (
            <button onClick={onRefresh} className="widget-refresh-btn">🔄</button>
          )}
        </div>
        <div className="widget-content">
          <div className="error-message">❌ {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`widget-container correlation-matrix-widget ${className}`}>
      <div className="widget-header">
        <div className="widget-title-section">
          <h3 className="widget-title">{widget.title}</h3>
          {widget.description && (
            <p className="widget-description">{widget.description}</p>
          )}
        </div>
        <div className="widget-actions">
          {onRefresh && (
            <button onClick={onRefresh} className="widget-action-btn refresh-btn">🔄</button>
          )}
          {editable && (
            <button onClick={onEdit} className="widget-action-btn edit-btn">⚙️</button>
          )}
        </div>
      </div>

      <div className="widget-content">
        {correlationData.variables.length === 0 ? (
          <div className="no-data">🔗 No correlation data available</div>
        ) : (
          <div className="correlation-matrix">
            <div className="matrix-container">
              <table className="correlation-table">
                <thead>
                  <tr>
                    <th></th>
                    {correlationData.variables.map(variable => (
                      <th key={variable} className="variable-header">
                        {variable}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {correlationData.variables.map((variable1, i) => (
                    <tr key={variable1}>
                      <td className="variable-label">{variable1}</td>
                      {correlationData.variables.map((variable2, j) => {
                        const correlation = correlationData.matrix[i][j];
                        return (
                          <td
                            key={`${i}-${j}`}
                            className="correlation-cell"
                            style={{ backgroundColor: getCorrelationColor(correlation) }}
                            title={`${variable1} vs ${variable2}: ${correlation.toFixed(3)} (${getCorrelationText(correlation)})`}
                            onClick={onDrilldown ? () => onDrilldown({ 
                              var1: variable1, 
                              var2: variable2, 
                              correlation 
                            }) : undefined}
                          >
                            {correlation.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="correlation-legend">
              <div className="legend-title">Correlation Strength</div>
              <div className="legend-items">
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: getCorrelationColor(1) }}></div>
                  <span>Strong Positive (0.8-1.0)</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: getCorrelationColor(0.5) }}></div>
                  <span>Moderate Positive (0.4-0.8)</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: getCorrelationColor(0) }}></div>
                  <span>No Correlation (~0)</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: getCorrelationColor(-0.5) }}></div>
                  <span>Moderate Negative (-0.4 to -0.8)</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: getCorrelationColor(-1) }}></div>
                  <span>Strong Negative (-0.8 to -1.0)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Heat Map Visualization Component
export const HeatMapWidget: React.FC<WidgetProps> = ({
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
  const heatMapData = useMemo(() => {
    if (!data || !data.data) return { grid: [], xLabels: [], yLabels: [], maxValue: 0, minValue: 0 };
    
    const rawData = Array.isArray(data.data) ? data.data : [data.data];
    
    // If data is already in heat map format
    if (rawData[0]?.grid) {
      return rawData[0];
    }
    
    // Transform data into heat map grid
    const xField = widget.visualization.options.xField || 'x';
    const yField = widget.visualization.options.yField || 'y';
    const valueField = widget.visualization.options.valueField || 'value';
    
    const xValues = [...new Set(rawData.map(item => item[xField]))].sort();
    const yValues = [...new Set(rawData.map(item => item[yField]))].sort();
    
    const grid = yValues.map(y =>
      xValues.map(x => {
        const item = rawData.find(d => d[xField] === x && d[yField] === y);
        return item ? (item[valueField] || 0) : 0;
      })
    );
    
    const allValues = grid.flat();
    const maxValue = Math.max(...allValues);
    const minValue = Math.min(...allValues);
    
    return {
      grid,
      xLabels: xValues,
      yLabels: yValues,
      maxValue,
      minValue
    };
  }, [data, widget.visualization.options]);

  const getHeatMapColor = (value: number) => {
    if (heatMapData.maxValue === heatMapData.minValue) return '#f3f4f6';
    
    const intensity = (value - heatMapData.minValue) / (heatMapData.maxValue - heatMapData.minValue);
    const colorScheme = widget.visualization.options.colorScheme || 'heat';
    
    switch (colorScheme) {
      case 'heat':
        return `rgba(239, 68, 68, ${intensity})`;
      case 'cool':
        return `rgba(59, 130, 246, ${intensity})`;
      case 'green':
        return `rgba(16, 185, 129, ${intensity})`;
      default:
        return `rgba(107, 114, 128, ${intensity})`;
    }
  };

  const formatValue = (value: number) => {
    const format = widget.visualization.options.valueFormat || 'number';
    
    switch (format) {
      case 'percentage':
        return `${(value * 100).toFixed(1)}%`;
      case 'currency':
        return `$${value.toLocaleString()}`;
      case 'compact':
        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
        if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
        return value.toString();
      default:
        return value.toLocaleString();
    }
  };

  if (loading) {
    return (
      <div className={`widget-container heat-map-widget ${className}`}>
        <div className="widget-header">
          <h3 className="widget-title">{widget.title}</h3>
        </div>
        <div className="widget-content loading">
          <div className="spinner">Generating heat map...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`widget-container heat-map-widget error ${className}`}>
        <div className="widget-header">
          <h3 className="widget-title">{widget.title}</h3>
          {onRefresh && (
            <button onClick={onRefresh} className="widget-refresh-btn">🔄</button>
          )}
        </div>
        <div className="widget-content">
          <div className="error-message">❌ {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`widget-container heat-map-widget ${className}`}>
      <div className="widget-header">
        <div className="widget-title-section">
          <h3 className="widget-title">{widget.title}</h3>
          {widget.description && (
            <p className="widget-description">{widget.description}</p>
          )}
        </div>
        <div className="widget-actions">
          {onRefresh && (
            <button onClick={onRefresh} className="widget-action-btn refresh-btn">🔄</button>
          )}
          {editable && (
            <button onClick={onEdit} className="widget-action-btn edit-btn">⚙️</button>
          )}
        </div>
      </div>

      <div className="widget-content">
        {heatMapData.grid.length === 0 ? (
          <div className="no-data">🔥 No heat map data available</div>
        ) : (
          <div className="heat-map">
            <div className="heat-map-container">
              <div className="heat-map-grid">
                {/* Y-axis labels */}
                <div className="y-axis-labels">
                  {heatMapData.yLabels.map(label => (
                    <div key={label} className="y-label">{label}</div>
                  ))}
                </div>
                
                {/* Heat map cells */}
                <div className="heat-map-cells">
                  {/* X-axis labels */}
                  <div className="x-axis-labels">
                    {heatMapData.xLabels.map(label => (
                      <div key={label} className="x-label">{label}</div>
                    ))}
                  </div>
                  
                  {/* Grid cells */}
                  <div className="grid-cells">
                    {heatMapData.grid.map((row, rowIndex) =>
                      row.map((value, colIndex) => (
                        <div
                          key={`${rowIndex}-${colIndex}`}
                          className="heat-map-cell"
                          style={{ backgroundColor: getHeatMapColor(value) }}
                          title={`${heatMapData.yLabels[rowIndex]} × ${heatMapData.xLabels[colIndex]}: ${formatValue(value)}`}
                          onClick={onDrilldown ? () => onDrilldown({
                            x: heatMapData.xLabels[colIndex],
                            y: heatMapData.yLabels[rowIndex],
                            value,
                            coordinates: [colIndex, rowIndex]
                          }) : undefined}
                        >
                          {widget.visualization.options.showValues && (
                            <span className="cell-value">
                              {formatValue(value)}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
              
              {/* Color scale legend */}
              <div className="color-scale">
                <div className="scale-title">Scale</div>
                <div className="scale-bar">
                  <div className="scale-gradient" style={{
                    background: `linear-gradient(to right, 
                      ${getHeatMapColor(heatMapData.minValue)}, 
                      ${getHeatMapColor(heatMapData.maxValue)})`
                  }}></div>
                </div>
                <div className="scale-labels">
                  <span>{formatValue(heatMapData.minValue)}</span>
                  <span>{formatValue(heatMapData.maxValue)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to calculate correlation coefficient
function calculateCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  
  const sumX = x.slice(0, n).reduce((sum, val) => sum + val, 0);
  const sumY = y.slice(0, n).reduce((sum, val) => sum + val, 0);
  const sumXY = x.slice(0, n).reduce((sum, val, i) => sum + val * y[i], 0);
  const sumXX = x.slice(0, n).reduce((sum, val) => sum + val * val, 0);
  const sumYY = y.slice(0, n).reduce((sum, val) => sum + val * val, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
  
  if (denominator === 0) return 0;
  
  return numerator / denominator;
}

export default {
  TimeSeriesWidget,
  CorrelationMatrixWidget,
  HeatMapWidget
};