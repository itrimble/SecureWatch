import { NotificationItem, type Notification } from "./notification-item"

interface NotificationsFeedProps {
  notifications: Notification[]
  onMarkRead?: (id: string) => void
  onTakeAction?: (id: string, action: string) => void
}

export function NotificationsFeed({ notifications, onMarkRead, onTakeAction }: NotificationsFeedProps) {
  if (!notifications || notifications.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No notifications yet.</p>
  }

  return (
    <div className="divide-y divide-border" role="list">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onMarkRead={onMarkRead}
          onTakeAction={onTakeAction}
        />
      ))}
    </div>
  )
}
