"use client"

import { useState, useCallback } from "react"
import { StatsCardNotifications } from "@/components/notifications/stats-card-notifications"
import { NotificationFilter } from "@/components/notifications/notification-filter"
import { NotificationsFeed } from "@/components/notifications/notifications-feed"
import { NotificationPreferences } from "@/components/notifications/notification-preferences"
import { AlertRulesTable } from "@/components/notifications/alert-rules-table"
import { Button } from "@/components/ui/button"
import { BellRing, ShieldAlert, Cog, BookOpen, AlertCircle } from "lucide-react"
import { useRealTimeNotifications } from "@/hooks/use-real-time-notifications"
import type { Notification } from "@/components/notifications/notification-item"

// Mock data based on your specification
const initialNotifications: Notification[] = [
  {
    id: "1",
    type: "critical_alert",
    title: "Multiple Failed Login Attempts Detected",
    description: 'User account "admin" has 8 failed login attempts from IP 192.168.1.100',
    timestamp: "2 minutes ago",
    source: "Authentication Monitor",
    severity: "critical",
    actions: ["Block IP", "Lock Account", "Investigate"],
    read: false,
  },
  {
    id: "2",
    type: "security_alert",
    title: "Suspicious PowerShell Activity",
    description: "Encoded PowerShell command executed on DESKTOP-ABC123",
    timestamp: "15 minutes ago",
    source: "Process Monitor",
    severity: "high",
    actions: ["View Details", "Create Case", "Generate Report"],
    read: false,
  },
  {
    id: "3",
    type: "system_update",
    title: "TimescaleDB Connection Restored",
    description: "Database connection reestablished after 5-minute outage",
    timestamp: "1 hour ago",
    source: "System Monitor",
    severity: "info",
    actions: ["View Logs"],
    read: true,
  },
]

const initialPreferenceCategories = [
  {
    name: "Security Alerts",
    description: "Critical security events and threats",
    channels: { inApp: true, email: true, slack: false, sms: true },
    frequency: "immediate",
  },
  {
    name: "System Notifications",
    description: "System status, updates, and maintenance",
    channels: { inApp: true, email: false, slack: true, sms: false },
    frequency: "daily_digest",
  },
]

const initialAlertRules = [
  {
    id: "rule1",
    name: "Failed Login Threshold",
    condition: "Event ID 4625 count > 5 in 5 minutes",
    severity: "high",
    enabled: true,
    lastTriggered: "2 hours ago",
    triggerCount: 15,
  },
  {
    id: "rule2",
    name: "Suspicious Process Creation",
    condition: 'Process name contains "powershell" AND command line contains "encoded"',
    severity: "critical",
    enabled: true,
    lastTriggered: "15 minutes ago",
    triggerCount: 3,
  },
]

export default function NotificationsPage() {
  const [activeFilter, setActiveFilter] = useState("All")
  const [displayedNotifications, setDisplayedNotifications] = useState<Notification[]>(initialNotifications)

  const handleNewNotification = useCallback((newNotification: Notification) => {
    setDisplayedNotifications((prev) => [newNotification, ...prev.slice(0, 49)]) // Keep max 50 notifications
  }, [])

  // useRealTimeNotifications will manage its own internal list and also call handleNewNotification
  const { isConnected } = useRealTimeNotifications(handleNewNotification)

  const handleMarkRead = (id: string) => {
    setDisplayedNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const handleTakeAction = (id: string, action: string) => {
    console.log(`Action "${action}" taken on notification "${id}"`)
    // Implement actual action logic, e.g., API call
  }

  const filteredNotifications = displayedNotifications.filter((n) => {
    if (activeFilter === "All") return true
    if (activeFilter === "Security Alerts") return n.type?.includes("_alert") || false
    if (activeFilter === "System") return n.type?.includes("_update") || n.type?.includes("system") || false
    // Add more filter logic as needed
    return true
  })

  const unreadCount = displayedNotifications.filter((n) => !n.read).length

  return (
    <div className="space-y-6">
      {/* Notification Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCardNotifications
          title="Unread Alerts"
          value={String(unreadCount)}
          change={isConnected ? "Live" : "Disconnected"}
          color={unreadCount > 0 ? "red" : "green"}
          Icon={BellRing}
        />
        <StatsCardNotifications
          title="Critical Events Today"
          value="3"
          change="Requires attention"
          color="orange"
          Icon={ShieldAlert}
        />
        <StatsCardNotifications title="System Updates" value="2" change="Available" color="blue" Icon={Cog} />
        <StatsCardNotifications
          title="Training Reminders"
          value="1"
          change="Due this week"
          color="green"
          Icon={BookOpen}
        />
      </div>

      {/* Notification Filters */}
      <div className="bg-card border rounded-lg p-4 shadow">
        <div className="flex flex-wrap gap-x-4 gap-y-2 items-center">
          <NotificationFilter
            label="All"
            count={filteredNotifications.length}
            active={activeFilter === "All"}
            onClick={() => setActiveFilter("All")}
          />
          <NotificationFilter
            label="Security Alerts"
            count={filteredNotifications.filter((n) => n.type?.includes("_alert") || false).length}
            active={activeFilter === "Security Alerts"}
            onClick={() => setActiveFilter("Security Alerts")}
          />
          <NotificationFilter
            label="System"
            count={filteredNotifications.filter((n) => n.type?.includes("_update") || false).length}
            active={activeFilter === "System"}
            onClick={() => setActiveFilter("System")}
          />
          {/* Add more filters */}
          <div className="ml-auto flex gap-2 pt-2 sm:pt-0">
            <Button
              variant="link"
              size="sm"
              onClick={() => setDisplayedNotifications((prev) => prev.map((n) => ({ ...n, read: true })))}
            >
              Mark All as Read
            </Button>
            <Button variant="link" size="sm" onClick={() => setDisplayedNotifications([])}>
              Clear All
            </Button>
          </div>
        </div>
      </div>

      {/* Real-time Notifications Feed */}
      <div className="bg-card border rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold text-card-foreground">Notifications Feed</h3>
          <p className="text-muted-foreground text-sm">
            Real-time security and system updates.{" "}
            {isConnected ? (
              <span className="text-green-500">(Connected)</span>
            ) : (
              <span className="text-red-500">(Disconnected)</span>
            )}
          </p>
        </div>
        <NotificationsFeed
          notifications={filteredNotifications}
          onMarkRead={handleMarkRead}
          onTakeAction={handleTakeAction}
        />
      </div>

      {/* Notification Preferences */}
      <div className="bg-card border rounded-lg p-6 shadow">
        <h3 className="text-lg font-semibold text-card-foreground mb-4">Notification Preferences</h3>
        <NotificationPreferences
          categories={initialPreferenceCategories}
          onSave={(prefs) => console.log("Save preferences:", prefs)}
        />
      </div>

      {/* Alert Rules Management */}
      <div className="bg-card border rounded-lg p-6 shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-card-foreground">Alert Rules</h3>
          <Button>
            <AlertCircle className="mr-2 h-4 w-4" /> Create Alert Rule
          </Button>
        </div>
        <AlertRulesTable
          rules={initialAlertRules}
          onToggleRule={(id, en) => console.log(`Toggle rule ${id} to ${en}`)}
        />
      </div>
    </div>
  )
}
