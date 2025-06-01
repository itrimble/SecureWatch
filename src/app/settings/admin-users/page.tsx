'use client';

import { useState } from 'react';
import { 
  UserGroupIcon, 
  ShieldCheckIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  PlusIcon,
  DocumentArrowUpIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  LockClosedIcon,
  UserIcon
} from '@heroicons/react/24/outline';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'Active' | 'Inactive' | 'Pending';
  lastLogin: string;
  loginCount: number;
  permissions: string[];
  department?: string;
  joinDate: string;
}

interface Role {
  name: string;
  userCount: number;
  permissions: string[];
  color: string;
  description: string;
}

interface SecurityPolicy {
  name: string;
  status: 'Enforced' | 'Active' | 'Configured' | 'Disabled';
  description: string;
  lastUpdated: string;
}

interface UserActivity {
  user: string;
  action: string;
  time: string;
  risk: 'low' | 'medium' | 'high';
  details?: string;
}

export default function AdminUsersPage() {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);

  // Mock data
  const users: User[] = [
    {
      id: '1',
      name: 'John Smith',
      email: 'john.smith@company.com',
      role: 'Security Analyst',
      status: 'Active',
      lastLogin: '2 hours ago',
      loginCount: 45,
      permissions: ['view_logs', 'create_alerts', 'export_data'],
      department: 'SOC Team',
      joinDate: '2024-01-15'
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      email: 'sarah.j@company.com',
      role: 'SOC Manager',
      status: 'Active',
      lastLogin: '5 minutes ago',
      loginCount: 123,
      permissions: ['all_permissions'],
      department: 'Security',
      joinDate: '2023-08-10'
    },
    {
      id: '3',
      name: 'Mike Chen',
      email: 'mike.chen@company.com',
      role: 'Junior Analyst',
      status: 'Inactive',
      lastLogin: '3 days ago',
      loginCount: 12,
      permissions: ['view_logs'],
      department: 'SOC Team',
      joinDate: '2024-03-01'
    },
    {
      id: '4',
      name: 'Emily Rodriguez',
      email: 'emily.r@company.com',
      role: 'Security Admin',
      status: 'Active',
      lastLogin: '1 hour ago',
      loginCount: 89,
      permissions: ['all_permissions', 'user_management', 'system_config'],
      department: 'IT Security',
      joinDate: '2023-05-20'
    },
    {
      id: '5',
      name: 'Alex Thompson',
      email: 'alex.t@university.edu',
      role: 'Student',
      status: 'Pending',
      lastLogin: 'Never',
      loginCount: 0,
      permissions: ['view_training_materials'],
      department: 'Cybersecurity Program',
      joinDate: '2024-06-01'
    }
  ];

  const roles: Role[] = [
    {
      name: 'Security Analyst',
      userCount: 15,
      description: 'Monitor security events and investigate incidents',
      permissions: [
        'View Event Logs',
        'Create Basic Alerts',
        'Export Limited Data',
        'Access Dashboards',
        'Generate Reports'
      ],
      color: 'blue'
    },
    {
      name: 'SOC Manager',
      userCount: 4,
      description: 'Manage security operations and team oversight',
      permissions: [
        'All Analyst Permissions',
        'Manage Team Alerts',
        'Access All Data Sources',
        'Configure Integrations',
        'User Management'
      ],
      color: 'green'
    },
    {
      name: 'Security Admin',
      userCount: 3,
      description: 'Full system administration and configuration',
      permissions: [
        'Full System Access',
        'User Management',
        'System Configuration',
        'Security Settings',
        'Audit Logs'
      ],
      color: 'red'
    },
    {
      name: 'Junior Analyst',
      userCount: 8,
      description: 'Limited access for training and basic monitoring',
      permissions: [
        'View Event Logs',
        'Basic Searches',
        'Read-Only Dashboards'
      ],
      color: 'gray'
    },
    {
      name: 'Student',
      userCount: 12,
      description: 'Educational access for cybersecurity training',
      permissions: [
        'Access Training Materials',
        'View Sample Data',
        'Complete Assignments',
        'Participate in Simulations'
      ],
      color: 'purple'
    }
  ];

  const securityPolicies: SecurityPolicy[] = [
    {
      name: 'Password Requirements',
      status: 'Enforced',
      description: 'Minimum 12 characters, MFA required',
      lastUpdated: '2024-05-15'
    },
    {
      name: 'Session Timeout',
      status: 'Active',
      description: '4 hours inactivity timeout',
      lastUpdated: '2024-05-10'
    },
    {
      name: 'Failed Login Lockout',
      status: 'Active',
      description: '5 attempts, 15 minute lockout',
      lastUpdated: '2024-05-20'
    },
    {
      name: 'IP Allowlist',
      status: 'Configured',
      description: '12 approved IP ranges',
      lastUpdated: '2024-04-30'
    }
  ];

  const userActivities: UserActivity[] = [
    {
      user: 'Sarah Johnson',
      action: 'Created new alert rule for failed logins',
      time: '5 min ago',
      risk: 'low',
      details: 'Alert rule: Failed login attempts > 5'
    },
    {
      user: 'John Smith',
      action: 'Exported 500 log entries to CSV',
      time: '1 hour ago',
      risk: 'medium',
      details: 'Event log export: Windows Security Events'
    },
    {
      user: 'Mike Chen',
      action: 'Failed login attempt',
      time: '2 hours ago',
      risk: 'high',
      details: 'Multiple failed attempts detected'
    },
    {
      user: 'Emily Rodriguez',
      action: 'Modified integration settings',
      time: '3 hours ago',
      risk: 'medium',
      details: 'Updated Claude API configuration'
    },
    {
      user: 'Alex Thompson',
      action: 'Account activation pending',
      time: '1 day ago',
      risk: 'low',
      details: 'Student registration requires approval'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Inactive': return 'bg-gray-100 text-gray-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPolicyStatusColor = (status: string) => {
    switch (status) {
      case 'Enforced': return 'bg-green-100 text-green-800';
      case 'Active': return 'bg-blue-100 text-blue-800';
      case 'Configured': return 'bg-yellow-100 text-yellow-800';
      case 'Disabled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* User Management Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-2xl font-bold">24</p>
              <p className="text-xs text-green-600">+3 this week</p>
            </div>
            <UserGroupIcon className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Sessions</p>
              <p className="text-2xl font-bold">12</p>
              <p className="text-xs text-blue-600">67% online</p>
            </div>
            <ClockIcon className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Admin Users</p>
              <p className="text-2xl font-bold">3</p>
              <p className="text-xs text-gray-600">12% of total</p>
            </div>
            <ShieldCheckIcon className="h-8 w-8 text-red-500" />
          </div>
        </div>
        
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Invites</p>
              <p className="text-2xl font-bold">2</p>
              <p className="text-xs text-yellow-600">Awaiting response</p>
            </div>
            <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* User Management Actions */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">User Management</h3>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowAddUser(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2"
            >
              <PlusIcon className="h-4 w-4" />
              Add User
            </button>
            <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md flex items-center gap-2">
              <DocumentArrowUpIcon className="h-4 w-4" />
              Bulk Import
            </button>
          </div>
        </div>

        {/* User Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">User</th>
                <th className="text-left py-3 px-4">Role</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Last Login</th>
                <th className="text-left py-3 px-4">Login Count</th>
                <th className="text-left py-3 px-4">Department</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <UserIcon className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm">{user.role}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(user.status)}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{user.lastLogin}</td>
                  <td className="py-3 px-4 text-sm">{user.loginCount}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{user.department}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button className="text-blue-600 hover:text-blue-800">
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button className="text-gray-600 hover:text-gray-800">
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-800">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role-Based Access Control */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Role-Based Access Control</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <div key={role.name} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">{role.name}</h4>
                <span className={`px-2 py-1 rounded-full text-xs bg-${role.color}-100 text-${role.color}-800`}>
                  {role.userCount} users
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3">{role.description}</p>
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-700">Permissions:</p>
                {role.permissions.slice(0, 3).map((permission) => (
                  <p key={permission} className="text-xs text-gray-600">• {permission}</p>
                ))}
                {role.permissions.length > 3 && (
                  <p className="text-xs text-gray-500">+ {role.permissions.length - 3} more</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security & Compliance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <LockClosedIcon className="h-5 w-5" />
            Security Policies
          </h3>
          <div className="space-y-3">
            {securityPolicies.map((policy) => (
              <div key={policy.name} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <p className="font-medium">{policy.name}</p>
                  <p className="text-sm text-gray-600">{policy.description}</p>
                  <p className="text-xs text-gray-500">Updated: {policy.lastUpdated}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${getPolicyStatusColor(policy.status)}`}>
                  {policy.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">User Activity Monitoring</h3>
          <div className="space-y-3">
            {userActivities.map((activity, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border rounded">
                <div className="flex-1">
                  <p className="font-medium text-sm">{activity.user}</p>
                  <p className="text-sm text-gray-700">{activity.action}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                  {activity.details && (
                    <p className="text-xs text-gray-600 mt-1">{activity.details}</p>
                  )}
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${getRiskColor(activity.risk)}`}>
                  {activity.risk}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Educational Features */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-blue-800 font-semibold mb-4">🎓 Educational Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-medium mb-2">Training Progress</h4>
            <p className="text-sm text-gray-600 mb-2">Track student completion of cybersecurity modules</p>
            <p className="text-2xl font-bold text-blue-600">85%</p>
            <p className="text-xs text-gray-500">completion rate</p>
          </div>
          
          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-medium mb-2">Simulation Scenarios</h4>
            <p className="text-sm text-gray-600 mb-2">Manage incident response training scenarios</p>
            <p className="text-2xl font-bold text-green-600">12</p>
            <p className="text-xs text-gray-500">scenarios available</p>
          </div>
          
          <div className="bg-white border rounded-lg p-4">
            <h4 className="font-medium mb-2">Certification Tracking</h4>
            <p className="text-sm text-gray-600 mb-2">Monitor professional certification progress</p>
            <p className="text-2xl font-bold text-purple-600">8</p>
            <p className="text-xs text-gray-500">students certified</p>
          </div>
        </div>
      </div>
    </div>
  );
}