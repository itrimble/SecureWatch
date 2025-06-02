import React, { useState, useMemo, useCallback } from 'react';
import { TableWidget, WidgetProps, TableColumn, SortingConfig } from '../types/widget.types';

interface TableWidgetProps extends WidgetProps {
  widget: TableWidget;
}

interface SortState {
  column: string;
  direction: 'asc' | 'desc';
}

export const TableWidgetComponent: React.FC<TableWidgetProps> = ({
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(widget.visualization.options.pagination?.pageSize || 10);
  const [sortState, setSortState] = useState<SortState | null>(null);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const tableData = useMemo(() => {
    if (!data || !data.data) return [];
    return Array.isArray(data.data) ? data.data : [];
  }, [data]);

  const { visualization } = widget;
  const { options } = visualization;

  // Process and filter data
  const processedData = useMemo(() => {
    let result = [...tableData];

    // Apply global filter
    if (globalFilter && options.filtering?.globalSearch) {
      const filterLower = globalFilter.toLowerCase();
      result = result.filter(row =>
        Object.values(row).some(value =>
          String(value).toLowerCase().includes(filterLower)
        )
      );
    }

    // Apply column filters
    if (options.filtering?.columnFilters) {
      Object.entries(columnFilters).forEach(([column, filter]) => {
        if (filter) {
          const filterLower = filter.toLowerCase();
          result = result.filter(row =>
            String(row[column]).toLowerCase().includes(filterLower)
          );
        }
      });
    }

    // Apply sorting
    if (sortState) {
      result.sort((a, b) => {
        const aVal = a[sortState.column];
        const bVal = b[sortState.column];
        
        let comparison = 0;
        if (aVal < bVal) comparison = -1;
        if (aVal > bVal) comparison = 1;
        
        return sortState.direction === 'desc' ? -comparison : comparison;
      });
    }

    return result;
  }, [tableData, globalFilter, columnFilters, sortState, options.filtering]);

  // Pagination
  const paginatedData = useMemo(() => {
    if (!options.pagination?.enabled) return processedData;
    
    const startIndex = (currentPage - 1) * pageSize;
    return processedData.slice(startIndex, startIndex + pageSize);
  }, [processedData, currentPage, pageSize, options.pagination]);

  const totalPages = Math.ceil(processedData.length / pageSize);

  const handleSort = useCallback((column: string) => {
    if (!options.sorting?.enabled) return;
    
    setSortState(prev => {
      if (prev?.column === column) {
        return prev.direction === 'asc' 
          ? { column, direction: 'desc' }
          : null;
      }
      return { column, direction: 'asc' };
    });
  }, [options.sorting]);

  const handleRowSelect = useCallback((rowId: string) => {
    if (!options.rowSelection?.enabled) return;
    
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        if (options.rowSelection?.type === 'radio') {
          newSet.clear();
        }
        newSet.add(rowId);
      }
      return newSet;
    });
  }, [options.rowSelection]);

  const formatCellValue = useCallback((value: any, column: TableColumn) => {
    if (value === null || value === undefined) return '-';
    
    if (column.formatter) {
      try {
        const formatter = eval(column.formatter);
        return formatter(value);
      } catch (error) {
        console.error('Error applying cell formatter:', error);
      }
    }

    switch (column.dataType) {
      case 'date':
        return new Date(value).toLocaleString();
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : value;
      case 'boolean':
        return value ? '✅' : '❌';
      case 'ip':
        return <code className="ip-address">{value}</code>;
      case 'user':
        return <span className="user-badge">{value}</span>;
      case 'host':
        return <span className="host-badge">{value}</span>;
      default:
        return String(value);
    }
  }, []);

  const getSortIcon = (column: string) => {
    if (sortState?.column !== column) return '↕️';
    return sortState.direction === 'asc' ? '↑' : '↓';
  };

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
    <div className={`widget-container table-widget ${className}`}>
      <div className="widget-header">
        <div className="widget-title-section">
          <h3 className="widget-title">{widget.title}</h3>
          {widget.description && (
            <p className="widget-description">{widget.description}</p>
          )}
        </div>
        <div className="widget-actions">
          {options.filtering?.globalSearch && (
            <input
              type="text"
              placeholder="Search..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="global-search"
            />
          )}
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
        {tableData.length === 0 ? (
          <div className="no-data">📋 No data available</div>
        ) : (
          <>
            <div className="table-container">
              <table className={`data-table ${options.density || 'standard'} ${options.striped ? 'striped' : ''} ${options.bordered ? 'bordered' : ''} ${options.hoverable ? 'hoverable' : ''}`}>
                <thead>
                  <tr>
                    {options.rowSelection?.enabled && (
                      <th className="selection-column">
                        {options.rowSelection.type === 'checkbox' && (
                          <input
                            type="checkbox"
                            checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRows(new Set(paginatedData.map((_, index) => String(index))));
                              } else {
                                setSelectedRows(new Set());
                              }
                            }}
                          />
                        )}
                      </th>
                    )}
                    {options.columns.map((column: TableColumn) => (
                      <th
                        key={column.key}
                        className={`column-${column.key} ${column.align || 'left'} ${column.sortable ? 'sortable' : ''}`}
                        style={{
                          width: column.width,
                          minWidth: column.minWidth,
                          maxWidth: column.maxWidth
                        }}
                        onClick={column.sortable ? () => handleSort(column.key) : undefined}
                      >
                        <div className="column-header">
                          <span className="column-title">{column.title}</span>
                          {column.sortable && (
                            <span className="sort-icon">{getSortIcon(column.key)}</span>
                          )}
                        </div>
                        {column.filterable && options.filtering?.columnFilters && (
                          <input
                            type="text"
                            placeholder={`Filter ${column.title}`}
                            value={columnFilters[column.key] || ''}
                            onChange={(e) => setColumnFilters(prev => ({
                              ...prev,
                              [column.key]: e.target.value
                            }))}
                            className="column-filter"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row, rowIndex) => {
                    const rowId = String(rowIndex);
                    const isSelected = selectedRows.has(rowId);
                    
                    return (
                      <tr
                        key={rowIndex}
                        className={`${isSelected ? 'selected' : ''}`}
                        onClick={onDrilldown ? () => onDrilldown(row) : undefined}
                      >
                        {options.rowSelection?.enabled && (
                          <td className="selection-column">
                            <input
                              type={options.rowSelection.type}
                              checked={isSelected}
                              onChange={() => handleRowSelect(rowId)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                        )}
                        {options.columns.map((column: TableColumn) => (
                          <td
                            key={column.key}
                            className={`column-${column.key} ${column.align || 'left'} ${column.ellipsis ? 'ellipsis' : ''}`}
                          >
                            {formatCellValue(row[column.key], column)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {options.pagination?.enabled && (
              <div className="table-pagination">
                <div className="pagination-info">
                  {options.pagination.showTotal && (
                    <span className="total-info">
                      Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, processedData.length)} of {processedData.length} entries
                    </span>
                  )}
                </div>
                
                <div className="pagination-controls">
                  {options.pagination.showSizeChanger && (
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="page-size-selector"
                    >
                      {options.pagination.pageSizeOptions.map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  )}

                  <div className="page-navigation">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="page-btn first"
                    >
                      ⏮️
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="page-btn prev"
                    >
                      ⏪
                    </button>
                    
                    <span className="page-info">
                      Page {currentPage} of {totalPages}
                    </span>
                    
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="page-btn next"
                    >
                      ⏩
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="page-btn last"
                    >
                      ⏭️
                    </button>
                  </div>

                  {options.pagination.showQuickJumper && (
                    <div className="quick-jumper">
                      <span>Go to:</span>
                      <input
                        type="number"
                        min={1}
                        max={totalPages}
                        value={currentPage}
                        onChange={(e) => {
                          const page = Math.max(1, Math.min(totalPages, Number(e.target.value)));
                          setCurrentPage(page);
                        }}
                        className="page-input"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {data?.query && (
        <div className="widget-footer">
          <small className="query-info">
            Query executed in {data.executionTime}ms • {data.totalRows} rows
            {selectedRows.size > 0 && ` • ${selectedRows.size} selected`}
          </small>
        </div>
      )}
    </div>
  );
};

export default TableWidgetComponent;