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
  AlertCircle,
  LayoutDashboard,
  BookOpen,
  Package,
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
  // Splunk-style App Navigation Structure
  
  // Core Splunk Apps
  const coreApps = [
    { id: "search", label: "Search & Reporting", icon: Search, tooltip: "Search, analyze, and investigate data (⌘S)", href: "/explorer", hotkey: "⌘S" },
    { id: "alerting", label: "Alerting", icon: AlertTriangle, tooltip: "Security alerts and monitoring", badge: 23, badgeType: "critical", href: "/alerts" },
    { id: "dashboards", label: "Dashboards & Views", icon: LayoutDashboard, tooltip: "Interactive dashboards and visualizations", href: "/dashboard" },
    { id: "reports", label: "Reports", icon: FileText, tooltip: "Scheduled reports and analytics", href: "/reporting" },
  ]

  // Security Solutions (Splunk Security Apps equivalent)
  const securitySolutions = [
    { id: "incident-response", label: "Incident Investigation", icon: Zap, tooltip: "Security incident management", badge: 5, badgeType: "high" },
    { id: "threat-hunting", label: "Threat Hunting", icon: Radar, tooltip: "Proactive threat detection" },
    { id: "ueba", label: "User Behavior Analytics", icon: Brain, tooltip: "UEBA and insider threat detection" },
    { id: "compliance", label: "Compliance", icon: Lock, tooltip: "Regulatory compliance monitoring" },
    { id: "vulnerability", label: "Vulnerability Management", icon: Bug, tooltip: "Security vulnerability tracking" },
    { id: "correlation", label: "Correlation Search", icon: GitBranch, tooltip: "Event correlation and rules", badge: 7, badgeType: "medium", href: "/correlation" },
  ]

  // Knowledge Objects (Splunk Knowledge Management)
  const knowledgeObjects = [
    { id: "saved-searches", label: "Saved Searches", icon: BookOpen, tooltip: "Saved KQL queries and searches" },
    { id: "event-types", label: "Event Types", icon: Database, tooltip: "Event categorization and tagging" },
    { id: "lookups", label: "Lookups", icon: FileSearch, tooltip: "Lookup tables and enrichment data" },
    { id: "field-extractions", label: "Field Extractions", icon: Eye, tooltip: "Field extraction rules" },
    { id: "macros", label: "Search Macros", icon: Workflow, tooltip: "Reusable search components" },
  ]

  // Data Management (Splunk Data Management)
  const dataManagement = [
    { id: "data-inputs", label: "Data Inputs", icon: Router, tooltip: "Log sources and data ingestion", href: "/settings/log-sources" },
    { id: "indexes", label: "Indexes", icon: Database, tooltip: "Data storage and indexing" },
    { id: "data-models", label: "Data Models", icon: Layers, tooltip: "Normalized data structures" },
    { id: "retention", label: "Data Retention", icon: Clock, tooltip: "Data lifecycle management" },
  ]

  // System Administration (Splunk Settings)
  const systemAdmin = [
    { id: "marketplace", label: "Solutions Marketplace", icon: Package, tooltip: "Browse and install security content packs", href: "/marketplace" },
    { id: "user-management", label: "Users & Roles", icon: UserCog, tooltip: "User administration and RBAC", href: "/settings/admin-users" },
    { id: "authentication", label: "Authentication", icon: Lock, tooltip: "SSO and authentication settings" },
    { id: "distributed-search", label: "Distributed Environment", icon: Network, tooltip: "Multi-instance configuration" },
    { id: "monitoring", label: "Monitoring Console", icon: Gauge, tooltip: "System health and performance", href: "/settings/platform-status" },
    { id: "integrations", label: "Add-ons", icon: GitBranch, tooltip: "Third-party integrations", href: "/settings/integrations" },
    { id: "general-settings", label: "Server Settings", icon: Settings, tooltip: "Platform configuration", href: "/settings" },
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

      {/* Main Navigation - Splunk-style App Organization */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Core Apps */}
        {!isCollapsed && (
          <div className="px-4 pt-4 pb-2">
            <h4 className="text-caption font-bold text-muted-foreground tracking-wider uppercase">Core Apps</h4>
          </div>
        )}
        <nav className="px-2 pb-6 space-y-1">
          {coreApps.map((item) => (
            <MenuItem key={item.id} item={item} />
          ))}
        </nav>

        {/* Security Solutions */}
        <div className="border-t border-border/50">
          {!isCollapsed && (
            <div className="p-4 pb-2">
              <h4 className="text-caption font-bold text-muted-foreground tracking-wider uppercase">Security Solutions</h4>
            </div>
          )}
          <div className="px-2 pb-4 space-y-1">
            {securitySolutions.map((item) => (
              <MenuItem key={item.id} item={item} />
            ))}
          </div>
        </div>

        {/* Knowledge Objects */}
        <div className="border-t border-border/50">
          {!isCollapsed && (
            <div className="p-4 pb-2">
              <h4 className="text-caption font-bold text-muted-foreground tracking-wider uppercase">Knowledge Objects</h4>
            </div>
          )}
          <div className="px-2 pb-4 space-y-1">
            {knowledgeObjects.map((item) => (
              <MenuItem key={item.id} item={item} />
            ))}
          </div>
        </div>

        {/* Data Management */}
        <div className="border-t border-border/50">
          {!isCollapsed && (
            <div className="p-4 pb-2">
              <h4 className="text-caption font-bold text-muted-foreground tracking-wider uppercase">Data</h4>
            </div>
          )}
          <div className="px-2 pb-4 space-y-1">
            {dataManagement.map((item) => (
              <MenuItem key={item.id} item={item} />
            ))}
          </div>
        </div>

        {/* System Administration */}
        <div className="border-t border-border">
          {!isCollapsed && (
            <div className="p-4 pb-2">
              <h4 className="text-caption font-bold text-muted-foreground tracking-wider uppercase">Settings</h4>
            </div>
          )}
          <div className="px-2 pb-4 space-y-1">
            {systemAdmin.map((item) => (
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
                <div className="text-caption truncate flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Active Session</span>
                </div>
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
