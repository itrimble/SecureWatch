"use client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
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
  FileText,
  Eye,
  Zap,
  Lock,
  Network,
  Bug,
  FileSearch,
  Gauge,
  Map,
  Brain,
  Workflow,
  GitBranch,
  Radar,
  ScanLine,
  Cpu,
  HardDrive,
  Cloud,
  Router,
  Monitor,
  Layers,
} from "lucide-react"

interface EnhancedSidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  isCollapsed: boolean
  setIsCollapsed: (collapsed: boolean) => void
}

export function EnhancedSidebar({ activeTab, setActiveTab, isCollapsed, setIsCollapsed }: EnhancedSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  // Primary Security Operations
  const securityMenuItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3, tooltip: "Security Overview Dashboard (⌘1)", href: "/", hotkey: "⌘1" },
    { id: "alerts", label: "Alerts", icon: AlertTriangle, tooltip: "Security Alerts & Incidents (⌘2)", badge: 23, badgeType: "critical", href: "/alerts", hotkey: "⌘2" },
    { id: "notifications", label: "Notifications", icon: Bell, tooltip: "System Notifications (⌘3)", badge: 12, badgeType: "info", href: "/notifications", hotkey: "⌘3" },
    { id: "explorer", label: "Event Explorer", icon: Search, tooltip: "Log Search & Analysis (⌘E)", href: "/explorer", hotkey: "⌘E" },
    { id: "reporting", label: "Reports", icon: FileText, tooltip: "Security Reports & Compliance", href: "/reporting" },
    { id: "visualizations", label: "Analytics", icon: Eye, tooltip: "Data Visualizations & Dashboards", href: "/visualizations" },
  ]

  // Advanced Security Features  
  const advancedMenuItems = [
    { id: "correlation", label: "Correlation", icon: GitBranch, tooltip: "Rules Engine & Patterns", badge: 7, badgeType: "medium", href: "/correlation" },
    { id: "threat-intel", label: "Threat Intelligence", icon: Target, tooltip: "Threat Intelligence & IOCs" },
    { id: "incidents", label: "Incident Response", icon: Zap, tooltip: "Incident Management & Response", badge: 5, badgeType: "high" },
    { id: "case-management", label: "Case Management", icon: Briefcase, tooltip: "Investigation Cases", badge: 8, badgeType: "medium" },
    { id: "vulnerability", label: "Vulnerabilities", icon: Bug, tooltip: "Vulnerability Management" },
    { id: "compliance", label: "Compliance", icon: Lock, tooltip: "Compliance Monitoring" },
  ]

  // Intelligence & Analysis
  const analysisMenuItems = [
    { id: "ueba", label: "User Analytics", icon: Brain, tooltip: "User & Entity Behavior Analytics" },
    { id: "insider-risk", label: "Insider Risk", icon: Users, tooltip: "Insider Threat Detection" },
    { id: "threat-hunting", label: "Threat Hunting", icon: Radar, tooltip: "Proactive Threat Hunting" },
    { id: "forensics", label: "Digital Forensics", icon: FileSearch, tooltip: "Digital Forensics & Investigation" },
    { id: "network-analysis", label: "Network Analysis", icon: Network, tooltip: "Network Traffic Analysis" },
  ]

  // Infrastructure & Assets
  const infrastructureMenuItems = [
    { id: "assets", label: "Asset Discovery", icon: Database, tooltip: "Asset Inventory & Discovery" },
    { id: "network-map", label: "Network Topology", icon: Map, tooltip: "Network Topology & Mapping" },
    { id: "endpoints", label: "Endpoints", icon: Monitor, tooltip: "Endpoint Security Management" },
    { id: "cloud-security", label: "Cloud Security", icon: Cloud, tooltip: "Cloud Security Posture" },
    { id: "infrastructure", label: "Infrastructure", icon: Layers, tooltip: "Infrastructure Monitoring" },
  ]

  // System & Administration
  const systemMenuItems = [
    { id: "system-health", label: "System Health", icon: Gauge, tooltip: "System Performance & Health" },
    { id: "data-sources", label: "Data Sources", icon: Router, tooltip: "Log Sources & Connectors" },
    { id: "workflows", label: "Automation", icon: Workflow, tooltip: "Security Automation & Playbooks" },
    { id: "integrations", label: "Integrations", icon: GitBranch, tooltip: "Third-party Integrations", href: "/settings/integrations" },
  ]

  const settingsItems = [
    { id: "admin-users", label: "User Management", icon: UserCog, tooltip: "User Administration & RBAC", href: "/settings/admin-users" },
    { id: "general-settings", label: "System Settings", icon: Settings, tooltip: "Platform Configuration", href: "/settings" },
  ]

  const handleNavigation = (item: any) => {
    if (item.href) {
      router.push(item.href)
    } else {
      setActiveTab(item.id)
    }
  }

  const getBadgeStyles = (badgeType: string) => {
    switch (badgeType) {
      case "critical":
        return "bg-red-600 text-red-100 shadow-red-500/30";
      case "high":
        return "bg-orange-600 text-orange-100 shadow-orange-500/30";
      case "medium":
        return "bg-amber-600 text-amber-100 shadow-amber-500/30";
      case "info":
        return "bg-blue-600 text-blue-100 shadow-blue-500/30";
      default:
        return "bg-primary text-primary-foreground";
    }
  };

  const MenuItem = ({ item }: { item: any }) => {
    const isActive = item.href ? pathname === item.href : activeTab === item.id
    const badgeStyles = item.badgeType ? getBadgeStyles(item.badgeType) : "bg-primary text-primary-foreground";
    
    const content = (
      <Button
        variant="ghost"
        size={isCollapsed ? "icon" : "default"}
        onClick={() => handleNavigation(item)}
        className={cn(
          "w-full justify-start interactive-element",
          isCollapsed ? "px-2" : "px-3",
          isActive ? "nav-active" : "nav-inactive",
        )}
      >
        <item.icon className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
        {!isCollapsed && (
          <>
            <span className="flex-1 text-left font-medium">{item.label}</span>
            {item.badge && (
              <span className={cn(
                "ml-auto rounded-full px-2 py-0.5 text-xs font-bold shadow-lg",
                badgeStyles
              )}>
                {item.badge}
              </span>
            )}
          </>
        )}
      </Button>
    );

    return (
      <TooltipProvider key={item.id}>
        <Tooltip>
          <TooltipTrigger asChild>
            {item.href ? (
              <Link href={item.href} className="w-full">
                {content}
              </Link>
            ) : (
              content
            )}
          </TooltipTrigger>
          {isCollapsed && (
            <TooltipContent side="right" className="font-medium">
              <div className="flex items-center gap-2">
                {item.tooltip}
                {item.badge && (
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-bold",
                    badgeStyles
                  )}>
                    {item.badge}
                  </span>
                )}
              </div>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-card border-r border-border transition-all duration-300 ease-in-out custom-scrollbar",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-primary-heading">SecureWatch</h1>
              <p className="text-caption font-medium tracking-wide">SIEM Platform</p>
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
                className="interactive-element hover:bg-accent text-muted-foreground hover:text-foreground"
              >
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-popover border">
              {isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Security Operations */}
        {!isCollapsed && (
          <div className="px-4 pt-4 pb-2">
            <h4 className="text-caption font-bold text-muted-foreground tracking-wider uppercase">Security Operations</h4>
          </div>
        )}
        <nav className="px-2 pb-6 space-y-1">
          {securityMenuItems.map((item) => (
            <MenuItem key={item.id} item={item} />
          ))}
        </nav>

        {/* Advanced Security */}
        <div className="border-t border-border/50">
          {!isCollapsed && (
            <div className="p-4 pb-2">
              <h4 className="text-caption font-bold text-muted-foreground tracking-wider uppercase">Security Analysis</h4>
            </div>
          )}
          <div className="px-2 pb-4 space-y-1">
            {advancedMenuItems.map((item) => (
              <MenuItem key={item.id} item={item} />
            ))}
          </div>
        </div>

        {/* Intelligence & Analysis */}
        <div className="border-t border-border/50">
          {!isCollapsed && (
            <div className="p-4 pb-2">
              <h4 className="text-caption font-bold text-muted-foreground tracking-wider uppercase">Intelligence</h4>
            </div>
          )}
          <div className="px-2 pb-4 space-y-1">
            {analysisMenuItems.map((item) => (
              <MenuItem key={item.id} item={item} />
            ))}
          </div>
        </div>

        {/* Infrastructure */}
        <div className="border-t border-border/50">
          {!isCollapsed && (
            <div className="p-4 pb-2">
              <h4 className="text-caption font-bold text-muted-foreground tracking-wider uppercase">Infrastructure</h4>
            </div>
          )}
          <div className="px-2 pb-4 space-y-1">
            {infrastructureMenuItems.map((item) => (
              <MenuItem key={item.id} item={item} />
            ))}
          </div>
        </div>

        {/* System & Administration */}
        <div className="border-t border-border/50">
          {!isCollapsed && (
            <div className="p-4 pb-2">
              <h4 className="text-caption font-bold text-muted-foreground tracking-wider uppercase">System</h4>
            </div>
          )}
          <div className="px-2 pb-4 space-y-1">
            {systemMenuItems.map((item) => (
              <MenuItem key={item.id} item={item} />
            ))}
          </div>
        </div>

        {/* Configuration */}
        <div className="border-t border-border">
          {!isCollapsed && (
            <div className="p-4 pb-2">
              <h4 className="text-caption font-bold text-muted-foreground tracking-wider uppercase">Configuration</h4>
            </div>
          )}
          <div className="px-2 pb-4 space-y-1">
            {settingsItems.map((item) => (
              <MenuItem key={item.id} item={item} />
            ))}
          </div>
        </div>
      </div>

      {/* User Profile */}
      <div className="border-t border-border bg-muted/30">
        {!isCollapsed ? (
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm shadow-lg">
                  A
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-card rounded-full"></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body font-semibold truncate">Admin User</p>
                <p className="text-caption truncate flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Active Session
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 flex justify-center">
            <div className="relative">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center text-primary-foreground font-bold text-xs shadow-lg">
                A
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-card rounded-full"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
