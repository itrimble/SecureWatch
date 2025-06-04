"use client"

import { useState, Suspense } from "react"
import { usePathname } from "next/navigation"
import { EnhancedSidebar } from "@/components/enhanced-sidebar"
import { Header } from "@/components/header"
import { ErrorBoundary } from "@/components/error-boundary"

interface LayoutProviderProps {
  children: React.ReactNode
}

export function LayoutProvider({ children }: LayoutProviderProps) {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const pathname = usePathname()

  // Determine if we should show the sidebar layout
  const showSidebarLayout = pathname === "/" || 
                           pathname.startsWith("/explorer") || 
                           pathname.startsWith("/alerts") || 
                           pathname.startsWith("/notifications") ||
                           pathname.startsWith("/reporting") ||
                           pathname.startsWith("/settings")

  if (!showSidebarLayout) {
    // For pages that don't need sidebar (like auth pages)
    return (
      <>
        <Header />
        <main>{children}</main>
      </>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <EnhancedSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 p-6 overflow-y-auto bg-background custom-scrollbar">
          <Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground">Loading page content...</div>
            </div>
          }>
            <ErrorBoundary fallback={
              <div className="siem-card p-6 text-center">
                <div className="text-destructive font-medium">Content failed to load</div>
                <div className="text-caption mt-2">Check console for details</div>
              </div>
            }>
              {children}
            </ErrorBoundary>
          </Suspense>
        </main>
      </div>
    </div>
  )
}