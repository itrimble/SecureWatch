"use client"

import { AlertTriangle, Bell, Info, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button" // Assuming shadcn/ui Button

export interface Notification {
  id: string
  type:
    | "critical_alert"
    | "security_alert"
    | "system_update"
    | "integration_alert"
    | "user_activity"
    | "training_reminder"
    | string // Allow custom types
  title: string
  description: string
  timestamp: string
  source: string
  severity: "critical" | "high" | "warning" | "info" | "low" | string // Allow custom severities
  actions?: string[]
  read: boolean
  icon?: LucideIcon // Optional custom icon
}

interface NotificationItemProps {
  notification: Notification
  onMarkRead?: (id: string) => void
  onTakeAction?: (id: string, action: string) => void
}

export function NotificationItem({ notification, onMarkRead, onTakeAction }: NotificationItemProps) {
  const severityConfig = {
    critical: { color: "border-red-500 bg-red-50 dark:bg-red-900/30", Icon: AlertTriangle, iconColor: "text-red-500" },
    high: {
      color: "border-orange-500 bg-orange-50 dark:bg-orange-900/30",
      Icon: AlertTriangle,
      iconColor: "text-orange-500",
    },
    warning: {
      color: "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/30",
      Icon: AlertTriangle,
      iconColor: "text-yellow-500",
    },
    info: { color: "border-blue-500 bg-blue-50 dark:bg-blue-900/30", Icon: Info, iconColor: "text-blue-500" },
    low: { color: "border-gray-500 bg-gray-50 dark:bg-gray-900/30", Icon: Bell, iconColor: "text-gray-500" },
    default: { color: "border-gray-300 bg-gray-50 dark:bg-gray-900/30", Icon: Bell, iconColor: "text-gray-500" },
  }

  const config = severityConfig[notification.severity as keyof typeof severityConfig] || severityConfig.default
  const IconComponent = notification.icon || config.Icon

  return (
    <div
      className={`border-l-4 p-4 ${config.color} ${!notification.read ? "font-medium" : "opacity-80"}`}
      onClick={() => (onMarkRead && !notification.read ? onMarkRead(notification.id) : null)}
      role="listitem"
      aria-labelledby={`notification-title-${notification.id}`}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-shrink-0 pt-1">
          <IconComponent className={`h-5 w-5 ${config.iconColor}`} aria-hidden="true" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h4 id={`notification-title-${notification.id}`} className="font-semibold text-card-foreground">
              {notification.title}
            </h4>
            {!notification.read && (
              <span className="w-2.5 h-2.5 bg-primary rounded-full ml-2 flex-shrink-0" aria-label="Unread"></span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-2">{notification.description}</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground/80">
            <span>Source: {notification.source}</span>
            <span>🕒 {notification.timestamp}</span>
          </div>
        </div>

        {notification.actions && notification.actions.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
            {notification.actions.map((action) => (
              <Button
                key={action}
                variant="link"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation() // Prevent onMarkRead if clicking action
                  onTakeAction && onTakeAction(notification.id, action)
                }}
                className="text-primary hover:underline p-0 h-auto"
              >
                {action}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
