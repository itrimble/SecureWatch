"use client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  BarChart3,
  Search,
  AlertTriangle,
  Shield,
  Target,
  Settings,
  ChevronLeft,
  ChevronRight,
  Activity,
  Database,
  Users,
  Bell,
  Briefcase,
  Clock,
  TrendingUp,
  Globe,
  UserCog,
} from "lucide-react"

interface EnhancedSidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  isCollapsed: boolean
  setIsCollapsed: (collapsed: boolean) => void
}

export function EnhancedSidebar({ activeTab, setActiveTab, isCollapsed, setIsCollapsed }: EnhancedSidebarProps) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3, tooltip: "Security Dashboard" },
    { id: "notifications", label: "Notifications", icon: Bell, tooltip: "Notifications Feed", badge: 12 }, // Moved up
    { id: "search", label: "Log Search", icon: Search, tooltip: "Search & Analytics" },
    { id: "alerts", label: "Alerts", icon: AlertTriangle, tooltip: "Security Alerts", badge: 23 },
    { id: "notable-events", label: "Notable Events", icon: Activity, tooltip: "Notable Events Tracking" },
    { id: "incidents", label: "Incidents", icon: Shield, tooltip: "Incident Management", badge: 5 },
    { id: "threat-intel", label: "Threat Intel", icon: Target, tooltip: "Threat Intelligence" },
    { id: "assets", label: "Assets", icon: Database, tooltip: "Asset Management" },
    { id: "case-management", label: "Cases", icon: Briefcase, tooltip: "Case Management", badge: 8 },
    { id: "insider-risk", label: "Insider Risk", icon: TrendingUp, tooltip: "Insider Risk Management" },
    { id: "risk-timeline", label: "Timeline", icon: Clock, tooltip: "Risk Timeline" },
    { id: "risk-activity", label: "Activity", icon: Activity, tooltip: "Risk Activity Monitor" },
    { id: "threat-intel-dashboard", label: "Threat Intel DB", icon: Globe, tooltip: "Threat Intelligence Dashboard" },
    { id: "vulnerability-dashboard", label: "Vulnerability DB", icon: Shield, tooltip: "Vulnerability Dashboard" },
    { id: "peer-analysis-dashboard", label: "Peer Analysis DB", icon: Users, tooltip: "Peer Analysis Dashboard" },
  ]

  const settingsItems = [
    { id: "admin-users", label: "User Admin", icon: UserCog, tooltip: "Admin User Management" },
    { id: "ueba-settings", label: "UEBA Config", icon: Settings, tooltip: "UEBA Settings" },
    { id: "general-settings", label: "Platform Settings", icon: Settings, tooltip: "General Platform Settings" },
  ]

  const MenuItem = ({ item }: { item: any }) => (
    <TooltipProvider key={item.id}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={activeTab === item.id ? "default" : "ghost"}
            size={isCollapsed ? "icon" : "default"}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full justify-start transition-all duration-200 hover:scale-105 active:scale-95",
              isCollapsed ? "px-2" : "px-3",
              activeTab === item.id
                ? "bg-primary text-primary-foreground shadow-lg"
                : "text-muted-foreground hover:text-foreground hover:bg-accent",
            )}
          >
            <item.icon className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto bg-destructive text-destructive-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </Button>
        </TooltipTrigger>
        {isCollapsed && (
          <TooltipContent side="right" className="font-medium">
            <div className="flex items-center gap-2">
              {item.tooltip}
              {item.badge && (
                <span className="bg-destructive text-destructive-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                  {item.badge}
                </span>
              )}
            </div>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  )

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-card border-r transition-all duration-300 ease-in-out",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex items-center justify-between p-4 border-b">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg">SecureWatch</h1>
              <p className="text-xs text-muted-foreground">SIEM Platform</p>
            </div>
          </div>
        )}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hover:bg-accent transition-colors"
              >
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{isCollapsed ? "Expand sidebar" : "Collapse sidebar"}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <MenuItem key={item.id} item={item} />
        ))}
      </nav>

      {/* Settings Section */}
      {!isCollapsed && (
        <div className="p-2 mt-auto border-t">
          <h4 className="px-3 py-2 text-xs font-semibold text-muted-foreground tracking-wider">SETTINGS</h4>
        </div>
      )}
      <div className="p-2 space-y-1 border-t">
        {settingsItems.map((item) => (
          <MenuItem key={item.id} item={item} />
        ))}
      </div>

      {!isCollapsed && (
        <div className="p-4 border-t">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center text-primary-foreground font-medium text-sm">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Admin User</p>
              <p className="text-xs text-muted-foreground truncate">Security Analyst</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
