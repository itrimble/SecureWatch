'use client';

import { useState, Suspense, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { EnhancedSidebar } from '@/components/enhanced-sidebar';
import { Header } from '@/components/header';
import { ErrorBoundary } from '@/components/error-boundary';
import { ClientOnly } from '@/components/client-only';

interface LayoutProviderProps {
  children: React.ReactNode;
}

export function LayoutProvider({ children }: LayoutProviderProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const pathname = usePathname();

  // Ensure this only runs on the client to prevent hydration mismatches
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Determine if we should show the sidebar layout - EXCLUDE HOMEPAGE
  const showSidebarLayout =
    isClient &&
    pathname !== '/' &&
    (pathname.startsWith('/explorer') ||
      pathname.startsWith('/alerts') ||
      pathname.startsWith('/notifications') ||
      pathname.startsWith('/reporting') ||
      pathname.startsWith('/settings') ||
      pathname.startsWith('/marketplace') ||
      pathname.startsWith('/visualizations') ||
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/correlation') ||
      pathname.startsWith('/incident-investigation') ||
      pathname.startsWith('/education') ||
      pathname.startsWith('/kql-analytics') ||
      pathname.startsWith('/field-extraction') ||
      pathname.startsWith('/quick-start'));

  // Show loading state during initial hydration
  if (!isClient) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!showSidebarLayout) {
    // For pages that don't need sidebar (like homepage and auth pages)
    return <main>{children}</main>;
  }

  return (
    <ClientOnly
      fallback={
        <div className="flex h-screen overflow-hidden bg-background">
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground">Loading...</div>
            </div>
          </div>
        </div>
      }
    >
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
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-full">
                  <div className="text-muted-foreground">
                    Loading page content...
                  </div>
                </div>
              }
            >
              <ErrorBoundary
                fallback={
                  <div className="siem-card p-6 text-center">
                    <div className="text-destructive font-medium">
                      Content failed to load
                    </div>
                    <div className="text-caption mt-2">
                      Check console for details
                    </div>
                  </div>
                }
              >
                {children}
              </ErrorBoundary>
            </Suspense>
          </main>
        </div>
      </div>
    </ClientOnly>
  );
}
