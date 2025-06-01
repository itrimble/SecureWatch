// Basic Stats Card for Notifications Page (can be merged with admin stats card later if identical)
import type { LucideIcon } from "lucide-react"

interface StatsCardProps {
  title: string
  value: string
  change?: string
  color?: "red" | "orange" | "blue" | "green" | "gray"
  Icon: LucideIcon
}

export function StatsCardNotifications({ title, value, change, color = "gray", Icon }: StatsCardProps) {
  const colorClasses = {
    red: "text-red-600 dark:text-red-400",
    orange: "text-orange-600 dark:text-orange-400",
    blue: "text-blue-600 dark:text-blue-400",
    green: "text-green-600 dark:text-green-400",
    gray: "text-gray-600 dark:text-gray-400",
  }
  const iconColorClasses = {
    red: "text-red-500",
    orange: "text-orange-500",
    blue: "text-blue-500",
    green: "text-green-500",
    gray: "text-gray-500",
  }

  return (
    <div className="bg-card border rounded-lg p-4 shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {change && <p className={`text-xs ${colorClasses[color]}`}>{change}</p>}
        </div>
        <Icon className={`h-8 w-8 ${iconColorClasses[color]}`} />
      </div>
    </div>
  )
}
