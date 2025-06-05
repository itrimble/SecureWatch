'use client'

import React, { ReactNode } from 'react'
import { SplunkHeader } from './splunk-header'
import { cn } from '@/lib/utils'

interface SplunkLayoutProps {
  children: ReactNode
  className?: string
  showSidebar?: boolean
  sidebar?: ReactNode
}

export function SplunkLayout({ 
  children, 
  className,
  showSidebar = false,
  sidebar
}: SplunkLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Splunk Header (Top Bar + App Context Bar) */}
      <SplunkHeader />
      
      {/* Main Content Area */}
      <div className="flex flex-1">
        {/* Optional Sidebar (for settings pages, etc) */}
        {showSidebar && sidebar && (
          <div className="w-64 bg-gray-800 border-r border-gray-700">
            {sidebar}
          </div>
        )}
        
        {/* Main Content */}
        <main className={cn("flex-1", className)}>
          {children}
        </main>
      </div>
    </div>
  )
}