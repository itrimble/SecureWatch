import { useState, useEffect, useCallback, useRef } from 'react';
import { DataSource } from '../types/dashboard.types';
import { WidgetDataProvider } from '../types/widget.types';

interface UseRealTimeDataOptions {
  dataProvider: WidgetDataProvider;
  refreshInterval?: number; // in milliseconds
  enabled?: boolean;
  onError?: (error: Error) => void;
  onDataUpdate?: (data: any) => void;
  maxRetries?: number;
  retryDelay?: number;
}

interface RealTimeDataState {
  data: any;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  isConnected: boolean;
  retryCount: number;
}

export function useRealTimeData(
  dataSource: DataSource,
  options: UseRealTimeDataOptions
) {
  const {
    dataProvider,
    refreshInterval = 30000, // 30 seconds default
    enabled = true,
    onError,
    onDataUpdate,
    maxRetries = 3,
    retryDelay = 5000
  } = options;

  const [state, setState] = useState<RealTimeDataState>({
    data: null,
    loading: false,
    error: null,
    lastUpdated: null,
    isConnected: false,
    retryCount: 0
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Fetch data function
  const fetchData = useCallback(async (isRetry = false) => {
    if (!enabled || !mountedRef.current) return;

    setState(prev => ({ 
      ...prev, 
      loading: !isRetry,
      error: isRetry ? prev.error : null 
    }));

    try {
      const result = await dataProvider.fetchData(dataSource);
      
      if (!mountedRef.current) return;

      setState(prev => ({
        ...prev,
        data: result,
        loading: false,
        error: null,
        lastUpdated: new Date(),
        isConnected: true,
        retryCount: 0
      }));

      onDataUpdate?.(result);
    } catch (error) {
      if (!mountedRef.current) return;

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        isConnected: false,
        retryCount: prev.retryCount + 1
      }));

      onError?.(error instanceof Error ? error : new Error(errorMessage));

      // Retry logic
      if (state.retryCount < maxRetries) {
        retryTimeoutRef.current = setTimeout(() => {
          fetchData(true);
        }, retryDelay);
      }
    }
  }, [dataSource, dataProvider, enabled, onError, onDataUpdate, maxRetries, retryDelay, state.retryCount]);

  // Manual refresh function
  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Setup periodic refresh
  useEffect(() => {
    if (!enabled) return;

    // Initial fetch
    fetchData();

    // Setup interval for polling-based data sources
    if (dataSource.type !== 'streaming' && refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchData();
      }, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, refreshInterval, fetchData, dataSource.type]);

  // Setup streaming connection
  useEffect(() => {
    if (!enabled || dataSource.type !== 'streaming') return;

    const handleStreamingData = (data: any) => {
      if (!mountedRef.current) return;

      setState(prev => ({
        ...prev,
        data,
        lastUpdated: new Date(),
        isConnected: true,
        error: null,
        retryCount: 0
      }));

      onDataUpdate?.(data);
    };

    unsubscribeRef.current = dataProvider.subscribeToUpdates(
      dataSource,
      handleStreamingData
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [enabled, dataSource, dataProvider, onDataUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    refresh
  };
}

// Hook for managing multiple real-time data sources
interface UseMultipleRealTimeDataOptions {
  dataProvider: WidgetDataProvider;
  refreshInterval?: number;
  enabled?: boolean;
  onError?: (widgetId: string, error: Error) => void;
  onDataUpdate?: (widgetId: string, data: any) => void;
}

export function useMultipleRealTimeData(
  dataSources: Record<string, DataSource>,
  options: UseMultipleRealTimeDataOptions
) {
  const [states, setStates] = useState<Record<string, RealTimeDataState>>({});
  const hooksRef = useRef<Record<string, any>>({});

  const updateWidgetState = useCallback((widgetId: string, newState: Partial<RealTimeDataState>) => {
    setStates(prev => ({
      ...prev,
      [widgetId]: {
        ...prev[widgetId],
        ...newState
      }
    }));
  }, []);

  // Initialize states for all widgets
  useEffect(() => {
    const initialStates: Record<string, RealTimeDataState> = {};
    
    Object.keys(dataSources).forEach(widgetId => {
      initialStates[widgetId] = {
        data: null,
        loading: false,
        error: null,
        lastUpdated: null,
        isConnected: false,
        retryCount: 0
      };
    });

    setStates(initialStates);
  }, [dataSources]);

  // Create individual hooks for each data source
  Object.entries(dataSources).forEach(([widgetId, dataSource]) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const hookResult = useRealTimeData(dataSource, {
      ...options,
      onError: (error) => options.onError?.(widgetId, error),
      onDataUpdate: (data) => options.onDataUpdate?.(widgetId, data)
    });

    hooksRef.current[widgetId] = hookResult;

    // Update state when hook state changes
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      updateWidgetState(widgetId, {
        data: hookResult.data,
        loading: hookResult.loading,
        error: hookResult.error,
        lastUpdated: hookResult.lastUpdated,
        isConnected: hookResult.isConnected,
        retryCount: hookResult.retryCount
      });
    }, [
      hookResult.data,
      hookResult.loading,
      hookResult.error,
      hookResult.lastUpdated,
      hookResult.isConnected,
      hookResult.retryCount,
      widgetId
    ]);
  });

  const refresh = useCallback((widgetId?: string) => {
    if (widgetId) {
      hooksRef.current[widgetId]?.refresh();
    } else {
      Object.values(hooksRef.current).forEach(hook => hook?.refresh());
    }
  }, []);

  const getWidgetData = useCallback((widgetId: string) => {
    return states[widgetId] || null;
  }, [states]);

  return {
    states,
    refresh,
    getWidgetData
  };
}

// Connection status hook
export function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastDisconnected, setLastDisconnected] = useState<Date | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setReconnectAttempts(0);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setLastDisconnected(new Date());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const incrementReconnectAttempts = useCallback(() => {
    setReconnectAttempts(prev => prev + 1);
  }, []);

  return {
    isOnline,
    lastDisconnected,
    reconnectAttempts,
    incrementReconnectAttempts
  };
}