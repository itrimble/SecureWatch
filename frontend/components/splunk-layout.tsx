'use client';

import React, { ReactNode } from 'react';
import { SplunkHeader } from './splunk-header';
import { cn } from '@/lib/utils';

interface SplunkLayoutProps {
  children: ReactNode;
  className?: string;
  showSidebar?: boolean;
  sidebar?: ReactNode;
}

export function SplunkLayout({
  children,
  className,
  showSidebar = false,
  sidebar,
}: SplunkLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Splunk Header (Top Bar + App Context Bar) */}
      <SplunkHeader />

      {/* Main Content Area */}
      <div className="flex flex-1 min-h-0">
        {/* Optional Sidebar (for settings pages, etc) */}
        {showSidebar && sidebar && (
          <div className="w-80 bg-muted border-r border-border flex-shrink-0">
            {sidebar}
          </div>
        )}

        {/* Main Content */}
        <main className={cn('flex-1 min-w-0 overflow-hidden', className)}>
          {children}
        </main>
      </div>
    </div>
  );
}
