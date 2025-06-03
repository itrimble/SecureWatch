export interface User {
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

export interface UserRole {
  id: string;
  name: string;
  permissions: Permission[];
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
}

export interface UserPreferences {
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