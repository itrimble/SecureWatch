import React, { useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { MetricWidget, WidgetProps, MetricThreshold } from '../types/widget.types';

interface MetricWidgetProps extends WidgetProps {
  widget: MetricWidget;
}

export const MetricWidgetComponent: React.FC<MetricWidgetProps> = ({
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
  const { visualization } = widget;
  const { options } = visualization;

  const metricData = useMemo(() => {
    if (!data || !data.data) return null;
    
    // Handle different data formats
    if (Array.isArray(data.data)) {
      // If array, take the first item or sum values
      if (data.data.length === 0) return null;
      
      const firstItem = data.data[0];
      if (typeof firstItem === 'number') {
        return firstItem;
      } else if (typeof firstItem === 'object') {
        // Use the first numeric value found
        const numericValue = Object.values(firstItem).find(val => typeof val === 'number');
        return numericValue || 0;
      }
    } else if (typeof data.data === 'number') {
      return data.data;
    } else if (typeof data.data === 'object' && data.data.value !== undefined) {
      return data.data.value;
    }
    
    return null;
  }, [data]);

  const trendData = useMemo(() => {
    if (!data || !data.data || !options.showTrend) return [];
    
    if (Array.isArray(data.data) && data.data.length > 1) {
      return data.data.map((item, index) => ({
        index,
        value: typeof item === 'number' ? item : (item.value || 0)
      }));
    }
    
    return [];
  }, [data, options.showTrend]);

  const comparison = useMemo(() => {
    if (!data || !data.data || !options.comparison?.enabled) return null;
    
    // This would typically come from a separate API call for comparison data
    // For now, simulate with a percentage change
    const changePercent = Math.floor(Math.random() * 20) - 10; // -10% to +10%
    
    return {
      value: changePercent,
      direction: changePercent >= 0 ? 'up' : 'down',
      period: options.comparison.period || 'previous period'
    };
  }, [data, options.comparison]);

  const formatValue = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    
    const { format, precision = 0, prefix = '', suffix = '' } = options;
    
    let formattedValue: string;
    
    switch (format) {
      case 'percentage':
        formattedValue = `${(value * 100).toFixed(precision)}%`;
        break;
      case 'currency':
        formattedValue = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: precision,
          maximumFractionDigits: precision
        }).format(value);
        break;
      case 'bytes':
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let unitIndex = 0;
        let size = value;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
          size /= 1024;
          unitIndex++;
        }
        
        formattedValue = `${size.toFixed(precision)} ${units[unitIndex]}`;
        break;
      case 'duration':
        const hours = Math.floor(value / 3600);
        const minutes = Math.floor((value % 3600) / 60);
        const seconds = Math.floor(value % 60);
        
        if (hours > 0) {
          formattedValue = `${hours}h ${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
          formattedValue = `${minutes}m ${seconds}s`;
        } else {
          formattedValue = `${seconds}s`;
        }
        break;
      case 'number':
      default:
        formattedValue = value.toLocaleString(undefined, {
          minimumFractionDigits: precision,
          maximumFractionDigits: precision
        });
        break;
    }
    
    return `${prefix}${formattedValue}${suffix}`;
  };

  const getThresholdInfo = (value: number | null) => {
    if (value === null || !options.thresholds) return null;
    
    for (const threshold of options.thresholds) {
      const withinRange = 
        (threshold.min === undefined || value >= threshold.min) &&
        (threshold.max === undefined || value <= threshold.max);
      
      if (withinRange) {
        return threshold;
      }
    }
    
    return null;
  };

  const thresholdInfo = getThresholdInfo(metricData);
  const thresholdColor = thresholdInfo?.color || '#6b7280';

  if (loading) {
    return (
      <div className={`widget-container ${className}`}>
        <div className="widget-header">
          <h3 className="widget-title">{widget.title}</h3>
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
          <div className="error-message">❌ {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`widget-container metric-widget ${className}`}
      onClick={onDrilldown ? () => onDrilldown({ value: metricData, threshold: thresholdInfo }) : undefined}
      style={{ cursor: onDrilldown ? 'pointer' : 'default' }}
    >
      <div className="widget-header">
        <div className="widget-title-section">
          <h3 className="widget-title">{widget.title}</h3>
          {widget.description && (
            <p className="widget-description">{widget.description}</p>
          )}
        </div>
        <div className="widget-actions">
          {onRefresh && (
            <button onClick={onRefresh} className="widget-action-btn refresh-btn">
              🔄
            </button>
          )}
          {editable && (
            <button onClick={onEdit} className="widget-action-btn edit-btn">
              ⚙️
            </button>
          )}
        </div>
      </div>

      <div className="widget-content">
        <div className="metric-display">
          <div className="metric-main">
            <div 
              className="metric-value"
              style={{ color: thresholdColor }}
            >
              {formatValue(metricData)}
            </div>
            
            {thresholdInfo && (
              <div className="metric-status">
                {thresholdInfo.icon && <span className="status-icon">{thresholdInfo.icon}</span>}
                {thresholdInfo.label && <span className="status-label">{thresholdInfo.label}</span>}
              </div>
            )}
          </div>

          {comparison && (
            <div className="metric-comparison">
              <span 
                className={`comparison-value ${comparison.direction}`}
                style={{
                  color: comparison.direction === 'up' ? '#10b981' : '#ef4444'
                }}
              >
                {comparison.direction === 'up' ? '↗️' : '↘️'}
                {Math.abs(comparison.value)}%
              </span>
              <span className="comparison-period">vs {comparison.period}</span>
            </div>
          )}

          {options.sparkline?.enabled && trendData.length > 0 && (
            <div className="metric-sparkline">
              <ResponsiveContainer width="100%" height={options.sparkline.height || 30}>
                <LineChart data={trendData}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={options.sparkline.color || thresholdColor}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {options.thresholds && options.thresholds.length > 0 && (
          <div className="threshold-indicators">
            {options.thresholds.map((threshold, index) => (
              <div
                key={index}
                className="threshold-indicator"
                style={{ backgroundColor: threshold.color }}
                title={threshold.label || `${threshold.min || 0} - ${threshold.max || '∞'}`}
              />
            ))}
          </div>
        )}
      </div>

      {data?.query && (
        <div className="widget-footer">
          <small className="query-info">
            Query executed in {data.executionTime}ms
          </small>
        </div>
      )}
    </div>
  );
};

export default MetricWidgetComponent;