import React, { useState, useCallback, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Responsive, WidthProvider, Layout as GridLayout } from 'react-grid-layout';
import { DashboardConfig, DashboardRow, DashboardColumn } from '../types/dashboard.types';
import { BaseWidget, WidgetFactory } from '../types/widget.types';
import DefaultWidgetRenderer from '../widgets/widget-renderer';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DashboardBuilderProps {
  dashboard: DashboardConfig;
  onDashboardChange: (dashboard: DashboardConfig) => void;
  widgetFactory: WidgetFactory;
  isEditing: boolean;
  onToggleEdit: () => void;
  widgetData?: Record<string, any>;
  onWidgetRefresh?: (widgetId: string) => void;
  onWidgetEdit?: (widget: BaseWidget) => void;
  onAddWidget?: () => void;
  className?: string;
}

export const DashboardBuilder: React.FC<DashboardBuilderProps> = ({
  dashboard,
  onDashboardChange,
  widgetFactory,
  isEditing,
  onToggleEdit,
  widgetData = {},
  onWidgetRefresh,
  onWidgetEdit,
  onAddWidget,
  className = ''
}) => {
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);
  const widgetRenderer = useMemo(() => new DefaultWidgetRenderer(), []);

  // Convert dashboard layout to react-grid-layout format
  const gridLayouts = useMemo(() => {
    const layouts: Record<string, GridLayout[]> = {
      lg: [],
      md: [],
      sm: [],
      xs: []
    };

    let yPosition = 0;
    dashboard.layout.rows.forEach((row, rowIndex) => {
      let xPosition = 0;
      
      row.columns.forEach((column, colIndex) => {
        const layoutItem = {
          i: column.widgetId,
          x: xPosition,
          y: yPosition,
          w: column.width,
          h: row.height,
          minW: column.minWidth || 1,
          maxW: column.maxWidth || 12,
          isDraggable: isEditing,
          isResizable: isEditing
        };

        layouts.lg.push(layoutItem);
        
        // Responsive breakpoints
        layouts.md.push({ ...layoutItem, w: Math.min(column.width, 8) });
        layouts.sm.push({ ...layoutItem, w: Math.min(column.width, 6), x: colIndex % 2 === 0 ? 0 : 6 });
        layouts.xs.push({ ...layoutItem, w: 12, x: 0, y: rowIndex * 6 + colIndex });

        xPosition += column.width;
      });
      
      yPosition += row.height;
    });

    return layouts;
  }, [dashboard.layout, isEditing]);

  const handleLayoutChange = useCallback((layout: GridLayout[], layouts: Record<string, GridLayout[]>) => {
    if (!isEditing) return;

    // Convert grid layout back to dashboard format
    const newRows: DashboardRow[] = [];
    const processedWidgets = new Set<string>();

    // Group items by Y position (row)
    const rowMap = new Map<number, GridLayout[]>();
    layout.forEach(item => {
      if (!rowMap.has(item.y)) {
        rowMap.set(item.y, []);
      }
      rowMap.get(item.y)!.push(item);
    });

    // Sort rows by Y position
    const sortedRows = Array.from(rowMap.entries()).sort(([a], [b]) => a - b);

    sortedRows.forEach(([y, items], rowIndex) => {
      // Sort items by X position within the row
      const sortedItems = items.sort((a, b) => a.x - b.x);
      
      const columns: DashboardColumn[] = sortedItems.map(item => {
        const originalColumn = dashboard.layout.rows
          .flatMap(r => r.columns)
          .find(c => c.widgetId === item.i);

        return {
          id: originalColumn?.id || `col-${item.i}`,
          width: item.w,
          widgetId: item.i,
          widgetConfig: originalColumn?.widgetConfig || ({} as BaseWidget),
          minWidth: item.minW,
          maxWidth: item.maxW
        };
      });

      newRows.push({
        id: `row-${rowIndex}`,
        height: Math.max(...sortedItems.map(item => item.h)),
        columns
      });
    });

    const updatedDashboard: DashboardConfig = {
      ...dashboard,
      layout: {
        ...dashboard.layout,
        rows: newRows
      },
      updatedAt: new Date().toISOString(),
      version: dashboard.version + 1
    };

    onDashboardChange(updatedDashboard);
  }, [dashboard, onDashboardChange, isEditing]);

  const handleWidgetSelect = useCallback((widgetId: string) => {
    setSelectedWidget(selectedWidget === widgetId ? null : widgetId);
  }, [selectedWidget]);

  const handleWidgetDelete = useCallback((widgetId: string) => {
    const newRows = dashboard.layout.rows.map(row => ({
      ...row,
      columns: row.columns.filter(col => col.widgetId !== widgetId)
    })).filter(row => row.columns.length > 0);

    const updatedDashboard: DashboardConfig = {
      ...dashboard,
      layout: {
        ...dashboard.layout,
        rows: newRows
      },
      updatedAt: new Date().toISOString(),
      version: dashboard.version + 1
    };

    onDashboardChange(updatedDashboard);
    setSelectedWidget(null);
  }, [dashboard, onDashboardChange]);

  const handleWidgetDuplicate = useCallback((widgetId: string) => {
    const originalWidget = dashboard.layout.rows
      .flatMap(r => r.columns)
      .find(c => c.widgetId === widgetId);

    if (!originalWidget) return;

    const newWidgetId = `${widgetId}-copy-${Date.now()}`;
    const newColumn: DashboardColumn = {
      ...originalWidget,
      id: `col-${newWidgetId}`,
      widgetId: newWidgetId,
      widgetConfig: {
        ...originalWidget.widgetConfig,
        id: newWidgetId,
        title: `${originalWidget.widgetConfig.title} (Copy)`
      }
    };

    // Add to the first row or create a new row
    const newRows = [...dashboard.layout.rows];
    if (newRows.length > 0) {
      newRows[0].columns.push(newColumn);
    } else {
      newRows.push({
        id: 'row-0',
        height: 6,
        columns: [newColumn]
      });
    }

    const updatedDashboard: DashboardConfig = {
      ...dashboard,
      layout: {
        ...dashboard.layout,
        rows: newRows
      },
      updatedAt: new Date().toISOString(),
      version: dashboard.version + 1
    };

    onDashboardChange(updatedDashboard);
  }, [dashboard, onDashboardChange]);

  const renderWidget = useCallback((widgetId: string) => {
    const widget = dashboard.layout.rows
      .flatMap(r => r.columns)
      .find(c => c.widgetId === widgetId)?.widgetConfig;

    if (!widget) return null;

    const data = widgetData[widgetId];
    const isSelected = selectedWidget === widgetId;

    return (
      <div 
        className={`dashboard-widget ${isSelected ? 'selected' : ''} ${isEditing ? 'editable' : ''}`}
        onClick={() => isEditing && handleWidgetSelect(widgetId)}
      >
        {widgetRenderer.render(widget, data, {
          widget,
          data,
          loading: data?.loading || false,
          error: data?.error,
          onRefresh: onWidgetRefresh ? () => onWidgetRefresh(widgetId) : undefined,
          onEdit: onWidgetEdit ? () => onWidgetEdit(widget) : undefined,
          editable: isEditing,
          className: isSelected ? 'selected' : ''
        })}
        
        {isEditing && isSelected && (
          <div className="widget-controls">
            <button 
              className="control-btn edit-btn"
              onClick={(e) => {
                e.stopPropagation();
                onWidgetEdit?.(widget);
              }}
              title="Edit Widget"
            >
              ✏️
            </button>
            <button 
              className="control-btn duplicate-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleWidgetDuplicate(widgetId);
              }}
              title="Duplicate Widget"
            >
              📋
            </button>
            <button 
              className="control-btn delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleWidgetDelete(widgetId);
              }}
              title="Delete Widget"
            >
              🗑️
            </button>
          </div>
        )}
      </div>
    );
  }, [
    dashboard.layout.rows,
    widgetData,
    selectedWidget,
    isEditing,
    widgetRenderer,
    onWidgetRefresh,
    onWidgetEdit,
    handleWidgetSelect,
    handleWidgetDuplicate,
    handleWidgetDelete
  ]);

  return (
    <div className={`dashboard-builder ${className} ${isEditing ? 'editing' : 'viewing'}`}>
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div className="dashboard-info">
          <h1 className="dashboard-title">{dashboard.title}</h1>
          {dashboard.description && (
            <p className="dashboard-description">{dashboard.description}</p>
          )}
        </div>
        
        <div className="dashboard-actions">
          <button
            className={`edit-toggle-btn ${isEditing ? 'editing' : ''}`}
            onClick={onToggleEdit}
          >
            {isEditing ? '💾 Save' : '✏️ Edit'}
          </button>
          
          {isEditing && onAddWidget && (
            <button
              className="add-widget-btn"
              onClick={onAddWidget}
            >
              ➕ Add Widget
            </button>
          )}
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="dashboard-content">
        {dashboard.layout.rows.length === 0 ? (
          <div className="empty-dashboard">
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <h3>No widgets yet</h3>
              <p>Start building your dashboard by adding widgets</p>
              {isEditing && onAddWidget && (
                <button className="add-first-widget-btn" onClick={onAddWidget}>
                  ➕ Add Your First Widget
                </button>
              )}
            </div>
          </div>
        ) : (
          <ResponsiveGridLayout
            className="dashboard-grid"
            layouts={gridLayouts}
            breakpoints={dashboard.layout.breakpoints}
            cols={{ lg: 12, md: 8, sm: 6, xs: 4 }}
            rowHeight={60}
            onLayoutChange={handleLayoutChange}
            isDraggable={isEditing}
            isResizable={isEditing}
            margin={[16, 16]}
            containerPadding={[0, 0]}
            useCSSTransforms={true}
            preventCollision={false}
            compactType="vertical"
          >
            {dashboard.layout.rows
              .flatMap(row => row.columns)
              .map(column => (
                <div key={column.widgetId} className="grid-item">
                  {renderWidget(column.widgetId)}
                </div>
              ))
            }
          </ResponsiveGridLayout>
        )}
      </div>

      {/* Editing Overlay */}
      {isEditing && (
        <div className="editing-overlay">
          <div className="editing-info">
            <span className="editing-indicator">✏️ Editing Mode</span>
            <span className="editing-help">
              Drag to move • Resize handles • Click to select
            </span>
          </div>
        </div>
      )}

      {/* Selection Info */}
      {isEditing && selectedWidget && (
        <div className="selection-info">
          <div className="selected-widget-info">
            <span className="selection-label">Selected:</span>
            <span className="widget-name">
              {dashboard.layout.rows
                .flatMap(r => r.columns)
                .find(c => c.widgetId === selectedWidget)?.widgetConfig.title || 'Unknown'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardBuilder;