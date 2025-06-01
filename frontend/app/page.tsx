"use client"

import { useState, Suspense, useEffect } from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { EnhancedSidebar } from "@/components/enhanced-sidebar"
import { ErrorBoundary } from "@/components/error-boundary"
import { debugLog } from "@/lib/debug"

// Import actual components
import DashboardContent from "@/components/dashboard-content"
import { LogSearch } from "@/components/log-search"
import { AlertsPanel } from "@/components/alerts-panel"
import { IncidentManagement } from "@/components/incident-management"
import { ThreatIntelligence } from "@/components/threat-intelligence"
import NotificationsPage from "@/app/notifications/page" // This is a page, ensure it's structured to be rendered as a component here
import { AssetsPage } from "@/components/assets-page"
import { CaseManagement } from "@/components/case-management"
import { InsiderRiskPage } from "@/components/insider-risk-page"
import { InsiderRiskTimeline } from "@/components/insider-risk-timeline"
import { InsiderRiskActivity } from "@/components/insider-risk-activity"
import { ThreatIntelligenceDashboard } from "@/components/threat-intelligence-dashboard"
import { VulnerabilityDashboard } from "@/components/vulnerability-dashboard"
import { PeerAnalysisDashboard } from "@/components/peer-analysis-dashboard"
import AdminUsersPage from "@/app/settings/admin-users/page" // This is a page
import { UebaSettings } from "@/components/ueba-settings"
import { NotableEvents } from "@/components/notable-events"
import { SettingsPage } from "@/components/settings-page" // For general settings

// Placeholder for AnalyticsContent if it's not yet created or to be defined
const AnalyticsContent = () => <div className="p-4">Analytics Content Placeholder</div>

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  useEffect(() => {
    debugLog("Home Page", "activeTab state changed or component mounted", { activeTab })
  }, [activeTab])

  const renderContent = () => {
    debugLog("Home Page", "renderContent called with activeTab", { activeTab })
    // Ensure all components are client components if they use hooks like useState, useEffect, etc.
    // Or, if they are server components, ensure they don't rely on client-side interactivity directly.
    switch (activeTab) {
      case "dashboard":
        return <DashboardContent />
      case "notifications":
        return <NotificationsPage />
      case "search":
        return <LogSearch />
      case "alerts":
        return <AlertsPanel />
      case "notable-events":
        return <NotableEvents />
      case "incidents":
        return <IncidentManagement />
      case "threat-intel":
        return <ThreatIntelligence />
      case "assets":
        return <AssetsPage />
      case "case-management":
        return <CaseManagement />
      case "insider-risk":
        return <InsiderRiskPage />
      case "risk-timeline":
        return <InsiderRiskTimeline />
      case "risk-activity":
        return <InsiderRiskActivity />
      case "threat-intel-dashboard":
        return <ThreatIntelligenceDashboard />
      case "vulnerability-dashboard":
        return <VulnerabilityDashboard />
      case "peer-analysis-dashboard":
        return <PeerAnalysisDashboard />
      case "admin-users":
        return <AdminUsersPage />
      case "ueba-settings":
        return <UebaSettings />
      case "general-settings":
        return <SettingsPage />
      // Add other cases as needed, e.g., for AnalyticsContent
      case "analytics":
        return <AnalyticsContent />
      default:
        debugLog("Home Page", "renderContent fallback to dashboard due to unhandled activeTab", { activeTab })
        return <DashboardContent />
    }
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      {" "}
      {/* Changed defaultTheme to "light" */}
      <div className="flex h-screen overflow-hidden bg-background">
        <EnhancedSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto bg-muted/40">
          <Suspense fallback={<div className="flex items-center justify-center h-full">Loading page content...</div>}>
            <ErrorBoundary fallback={<div className="p-4 text-red-500">Content failed to load. Check console.</div>}>
              {renderContent()}
            </ErrorBoundary>
          </Suspense>
        </main>
      </div>
    </ThemeProvider>
  )
}
