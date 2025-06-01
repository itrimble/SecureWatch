"use client"

import { useState } from "react"
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
  UserIcon,
} from "@heroicons/react/24/outline" // Assuming Heroicons are available or will be handled by the environment

interface User {
  id: string
  name: string
  email: string
  role: string
  status: "Active" | "Inactive" | "Pending"
  lastLogin: string
  loginCount: number
  permissions: string[]
  department?: string
  joinDate: string
}

interface Role {
  name: string
  userCount: number
  permissions: string[]
  color: string // e.g., 'blue', 'green', 'red', 'gray', 'purple' for Tailwind JIT
  description: string
}

interface SecurityPolicy {
  name: string
  status: "Enforced" | "Active" | "Configured" | "Disabled"
  description: string
  lastUpdated: string
}

interface UserActivity {
  user: string
  action: string
  time: string
  risk: "low" | "medium" | "high"
  details?: string
}

export default function AdminUsersPage() {
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [showAddUserModal, setShowAddUserModal] = useState(false) // For a potential modal

  // Mock data
  const users: User[] = [
    {
      id: "1",
      name: "John Smith",
      email: "john.smith@company.com",
      role: "Security Analyst",
      status: "Active",
      lastLogin: "2 hours ago",
      loginCount: 45,
      permissions: ["view_logs", "create_alerts", "export_data"],
      department: "SOC Team",
      joinDate: "2024-01-15",
    },
    {
      id: "2",
      name: "Sarah Johnson",
      email: "sarah.j@company.com",
      role: "SOC Manager",
      status: "Active",
      lastLogin: "5 minutes ago",
      loginCount: 123,
      permissions: ["all_permissions"],
      department: "Security",
      joinDate: "2023-08-10",
    },
    {
      id: "3",
      name: "Mike Chen",
      email: "mike.chen@company.com",
      role: "Junior Analyst",
      status: "Inactive",
      lastLogin: "3 days ago",
      loginCount: 12,
      permissions: ["view_logs"],
      department: "SOC Team",
      joinDate: "2024-03-01",
    },
    {
      id: "4",
      name: "Emily Rodriguez",
      email: "emily.r@company.com",
      role: "Security Admin",
      status: "Active",
      lastLogin: "1 hour ago",
      loginCount: 89,
      permissions: ["all_permissions", "user_management", "system_config"],
      department: "IT Security",
      joinDate: "2023-05-20",
    },
    {
      id: "5",
      name: "Alex Thompson",
      email: "alex.t@university.edu",
      role: "Student",
      status: "Pending",
      lastLogin: "Never",
      loginCount: 0,
      permissions: ["view_training_materials"],
      department: "Cybersecurity Program",
      joinDate: "2024-06-01",
    },
  ]

  const roles: Role[] = [
    {
      name: "Security Analyst",
      userCount: 15,
      description: "Monitor security events and investigate incidents",
      permissions: [
        "View Event Logs",
        "Create Basic Alerts",
        "Export Limited Data",
        "Access Dashboards",
        "Generate Reports",
      ],
      color: "blue",
    },
    {
      name: "SOC Manager",
      userCount: 4,
      description: "Manage security operations and team oversight",
      permissions: [
        "All Analyst Permissions",
        "Manage Team Alerts",
        "Access All Data Sources",
        "Configure Integrations",
        "User Management",
      ],
      color: "green",
    },
    {
      name: "Security Admin",
      userCount: 3,
      description: "Full system administration and configuration",
      permissions: ["Full System Access", "User Management", "System Configuration", "Security Settings", "Audit Logs"],
      color: "red",
    },
    {
      name: "Junior Analyst",
      userCount: 8,
      description: "Limited access for training and basic monitoring",
      permissions: ["View Event Logs", "Basic Searches", "Read-Only Dashboards"],
      color: "gray",
    },
    {
      name: "Student",
      userCount: 12,
      description: "Educational access for cybersecurity training",
      permissions: [
        "Access Training Materials",
        "View Sample Data",
        "Complete Assignments",
        "Participate in Simulations",
      ],
      color: "purple",
    },
  ]

  const securityPolicies: SecurityPolicy[] = [
    {
      name: "Password Requirements",
      status: "Enforced",
      description: "Minimum 12 characters, MFA required",
      lastUpdated: "2024-05-15",
    },
    {
      name: "Session Timeout",
      status: "Active",
      description: "4 hours inactivity timeout",
      lastUpdated: "2024-05-10",
    },
    {
      name: "Failed Login Lockout",
      status: "Active",
      description: "5 attempts, 15 minute lockout",
      lastUpdated: "2024-05-20",
    },
    {
      name: "IP Allowlist",
      status: "Configured",
      description: "12 approved IP ranges",
      lastUpdated: "2024-04-30",
    },
  ]

  const userActivities: UserActivity[] = [
    {
      user: "Sarah Johnson",
      action: "Created new alert rule for failed logins",
      time: "5 min ago",
      risk: "low",
      details: "Alert rule: Failed login attempts > 5",
    },
    {
      user: "John Smith",
      action: "Exported 500 log entries to CSV",
      time: "1 hour ago",
      risk: "medium",
      details: "Event log export: Windows Security Events",
    },
    {
      user: "Mike Chen",
      action: "Failed login attempt",
      time: "2 hours ago",
      risk: "high",
      details: "Multiple failed attempts detected",
    },
    {
      user: "Emily Rodriguez",
      action: "Modified integration settings",
      time: "3 hours ago",
      risk: "medium",
      details: "Updated Claude API configuration",
    },
    {
      user: "Alex Thompson",
      action: "Account activation pending",
      time: "1 day ago",
      risk: "low",
      details: "Student registration requires approval",
    },
  ]

  const getStatusColor = (status: User["status"]) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800"
      case "Inactive":
        return "bg-gray-100 text-gray-800"
      case "Pending":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getRiskColor = (risk: UserActivity["risk"]) => {
    switch (risk) {
      case "high":
        return "bg-red-100 text-red-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "low":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPolicyStatusColor = (status: SecurityPolicy["status"]) => {
    switch (status) {
      case "Enforced":
        return "bg-green-100 text-green-800"
      case "Active":
        return "bg-blue-100 text-blue-800"
      case "Configured":
        return "bg-yellow-100 text-yellow-800"
      case "Disabled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Tailwind JIT requires full class names, so we construct them carefully
  const roleColorClasses: Record<string, { bg: string; text: string }> = {
    blue: { bg: "bg-blue-100", text: "text-blue-800" },
    green: { bg: "bg-green-100", text: "text-green-800" },
    red: { bg: "bg-red-100", text: "text-red-800" },
    gray: { bg: "bg-gray-100", text: "text-gray-800" },
    purple: { bg: "bg-purple-100", text: "text-purple-800" },
  }

  return (
    <div className="space-y-6">
      {" "}
      {/* Removed p-6 bg-gray-50 min-h-screen, as page.tsx handles padding */}
      {/* User Management Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* StatsCard component would be ideal here, for now inline */}
        <div className="bg-card border rounded-lg p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold">{users.length}</p>
              {/* <p className="text-xs text-green-600">+3 this week</p> */}
            </div>
            <UserGroupIcon className="h-8 w-8 text-primary" />
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Sessions</p>
              <p className="text-2xl font-bold">12</p> {/* Placeholder */}
              {/* <p className="text-xs text-blue-600">67% online</p> */}
            </div>
            <ClockIcon className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Admin Users</p>
              <p className="text-2xl font-bold">{users.filter((u) => u.role.toLowerCase().includes("admin")).length}</p>
              {/* <p className="text-xs text-gray-600">12% of total</p> */}
            </div>
            <ShieldCheckIcon className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Invites</p>
              <p className="text-2xl font-bold">{users.filter((u) => u.status === "Pending").length}</p>
              {/* <p className="text-xs text-yellow-600">Awaiting response</p> */}
            </div>
            <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
      </div>
      {/* User Management Actions */}
      <div className="bg-card border rounded-lg p-6 shadow">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <h3 className="text-xl font-semibold">User Management</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddUserModal(true)} // This would trigger a modal
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md flex items-center gap-2 text-sm"
            >
              <PlusIcon className="h-4 w-4" />
              Add User
            </button>
            <button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 px-4 py-2 rounded-md flex items-center gap-2 text-sm">
              <DocumentArrowUpIcon className="h-4 w-4" />
              Bulk Import
            </button>
          </div>
        </div>

        {/* User Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">User</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Role</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden md:table-cell">
                  Last Login
                </th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden lg:table-cell">
                  Login Count
                </th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden md:table-cell">
                  Department
                </th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b hover:bg-muted/50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <UserIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{user.role}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{user.lastLogin}</td>
                  <td className="py-3 px-4 text-muted-foreground hidden lg:table-cell">{user.loginCount}</td>
                  <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{user.department}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button className="text-primary hover:text-primary/80" title="View User">
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button className="text-muted-foreground hover:text-foreground" title="Edit User">
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button className="text-destructive hover:text-destructive/80" title="Delete User">
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
      <div className="bg-card border rounded-lg p-6 shadow">
        <h3 className="text-xl font-semibold mb-4">Role-Based Access Control</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <div key={role.name} className={`border rounded-lg p-4 shadow-sm bg-card`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-foreground">{role.name}</h4>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${roleColorClasses[role.color]?.bg || "bg-gray-100"} ${roleColorClasses[role.color]?.text || "text-gray-800"}`}
                >
                  {role.userCount} users
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-3 h-10 overflow-hidden">{role.description}</p>
              <div className="space-y-1">
                <p className="text-xs font-medium text-foreground/80">Key Permissions:</p>
                {role.permissions.slice(0, 3).map((permission) => (
                  <p key={permission} className="text-xs text-muted-foreground">
                    • {permission}
                  </p>
                ))}
                {role.permissions.length > 3 && (
                  <p className="text-xs text-muted-foreground/80 italic">+ {role.permissions.length - 3} more</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Security & Compliance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border rounded-lg p-6 shadow">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-foreground">
            <LockClosedIcon className="h-5 w-5 text-primary" />
            Security Policies
          </h3>
          <div className="space-y-3">
            {securityPolicies.map((policy) => (
              <div
                key={policy.name}
                className="flex items-start sm:items-center justify-between p-3 border rounded-md bg-background/50 gap-2"
              >
                <div>
                  <p className="font-medium text-foreground">{policy.name}</p>
                  <p className="text-sm text-muted-foreground">{policy.description}</p>
                  <p className="text-xs text-muted-foreground/80 mt-1">Updated: {policy.lastUpdated}</p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getPolicyStatusColor(policy.status)}`}
                >
                  {policy.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border rounded-lg p-6 shadow">
          <h3 className="text-xl font-semibold mb-4 text-foreground">User Activity Monitoring</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {userActivities.map((activity, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border rounded-md bg-background/50">
                <div className={`w-2 h-2 mt-1.5 rounded-full ${getRiskColor(activity.risk).split(" ")[0]}`}></div>{" "}
                {/* Risk indicator dot */}
                <div className="flex-1">
                  <p className="font-medium text-sm text-foreground">
                    {activity.user} - <span className="text-muted-foreground">{activity.action}</span>
                  </p>
                  <p className="text-xs text-muted-foreground/80">{activity.time}</p>
                  {activity.details && (
                    <p className="text-xs text-muted-foreground mt-1 bg-muted p-2 rounded-md">{activity.details}</p>
                  )}
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getRiskColor(activity.risk)}`}>
                  {activity.risk}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Educational Features section can be added here if needed, similar to the previous version */}
    </div>
  )
}
