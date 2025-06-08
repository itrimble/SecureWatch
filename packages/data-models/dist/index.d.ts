interface LogEntry {
    id: string;
    timestamp: string;
    source: string;
    level: 'error' | 'warn' | 'info' | 'debug';
    message: string;
    metadata?: Record<string, any>;
    userId?: string;
    ip?: string;
    userAgent?: string;
}
interface WindowsEventLogEntry extends LogEntry {
    eventId: number;
    taskCategory: string;
    keywords: string[];
    computerName: string;
    channel: string;
}
interface SyslogEntry extends LogEntry {
    facility: number;
    severity: number;
    hostname: string;
    tag?: string;
}

interface Alert {
    id: string;
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    status: 'open' | 'investigating' | 'resolved' | 'closed';
    createdAt: string;
    updatedAt: string;
    source: string;
    tags: string[];
    assignedTo?: string;
    metadata?: Record<string, any>;
}
interface AlertRule {
    id: string;
    name: string;
    description: string;
    query: string;
    severity: Alert['severity'];
    enabled: boolean;
    threshold?: number;
    timeWindow?: string;
    createdAt: string;
    updatedAt: string;
}

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    status: 'active' | 'inactive' | 'suspended';
    lastLogin?: string;
    createdAt: string;
    updatedAt: string;
    preferences?: UserPreferences;
}
interface UserRole {
    id: string;
    name: string;
    permissions: Permission[];
}
interface Permission {
    id: string;
    name: string;
    resource: string;
    action: string;
}
interface UserPreferences {
    theme: 'light' | 'dark' | 'auto';
    timezone: string;
    notifications: {
        email: boolean;
        browser: boolean;
        sms: boolean;
    };
    dashboard: {
        defaultTimeRange: string;
        refreshInterval: number;
    };
}

interface Dashboard {
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
interface DashboardLayout {
    columns: number;
    rows: number;
    gaps: number;
}
interface DashboardWidget {
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
type WidgetType = 'chart' | 'metric' | 'table' | 'map' | 'text' | 'alert-summary';
interface WidgetConfig {
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

export type { Alert, AlertRule, Dashboard, DashboardLayout, DashboardWidget, LogEntry, Permission, SyslogEntry, User, UserPreferences, UserRole, WidgetConfig, WidgetType, WindowsEventLogEntry };
