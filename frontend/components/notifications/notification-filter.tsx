"use client"

interface NotificationFilterProps {
  label: string
  count: number
  active?: boolean
  onClick?: () => void
}

export function NotificationFilter({ label, count, active, onClick }: NotificationFilterProps) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors
        ${
          active
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        }`}
    >
      {label}{" "}
      <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${active ? "bg-primary-foreground/20" : "bg-accent"}`}>
        {count}
      </span>
    </button>
  )
}
