'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, subHours, subDays, subWeeks } from 'date-fns'
import { 
  Shield,
  ChevronDown,
  Bell,
  Settings,
  User,
  LogOut,
  Search,
  Play,
  Pause,
  Square,
  Calendar as CalendarIcon,
  Clock,
  Home,
  BarChart3,
  AlertTriangle,
  FileText,
  Activity,
  HelpCircle,
  BookOpen,
  Info,
  Plus
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/theme-toggle'

interface SplunkHeaderProps {
  onSearch?: (query: string) => void
  searchQuery?: string
}

const timeRangePresets = [
  { label: 'Last 15 minutes', value: '15m', startTime: () => subHours(new Date(), 0.25) },
  { label: 'Last hour', value: '1h', startTime: () => subHours(new Date(), 1) },
  { label: 'Last 4 hours', value: '4h', startTime: () => subHours(new Date(), 4) },
  { label: 'Last 24 hours', value: '24h', startTime: () => subDays(new Date(), 1) },
  { label: 'Last 7 days', value: '7d', startTime: () => subWeeks(new Date(), 1) },
  { label: 'Last 30 days', value: '30d', startTime: () => subDays(new Date(), 30) }
]

export function SplunkHeader({ onSearch, searchQuery = '' }: SplunkHeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery)
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h')
  const [isCustomTimeOpen, setIsCustomTimeOpen] = useState(false)
  const [customTimeRange, setCustomTimeRange] = useState({ start: new Date(), end: new Date() })

  // Determine active app context
  const getActiveApp = () => {
    if (pathname.startsWith('/explorer')) return 'search'
    if (pathname.startsWith('/dashboard')) return 'dashboards'
    if (pathname.startsWith('/alerts')) return 'alerts'
    if (pathname.startsWith('/reports')) return 'reports'
    if (pathname.startsWith('/settings')) return 'settings'
    return 'search'
  }

  const activeApp = getActiveApp()
  const showSearchBar = pathname === '/explorer' || pathname === '/'

  const handleSearchSubmit = () => {
    if (onSearch) {
      onSearch(localSearchQuery)
    } else {
      // Navigate to explorer with query
      router.push(`/explorer?query=${encodeURIComponent(localSearchQuery)}`)
    }
  }

  const getTimeRangeLabel = () => {
    const preset = timeRangePresets.find(p => p.value === selectedTimeRange)
    return preset ? preset.label : 'Custom range'
  }

  return (
    <>
      {/* Splunk-style Top Bar */}
      <div className="h-12 bg-background border-b border-border px-4 flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center space-x-6">
          {/* Logo/Brand */}
          <Link href="/" className="flex items-center space-x-2 text-foreground hover:text-primary">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-semibold text-sm">SecureWatch</span>
          </Link>

          {/* App Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground h-8">
                <span className="text-sm">Security Monitoring</span>
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuItem>
                <Shield className="mr-2 h-4 w-4" />
                Security Monitoring
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Activity className="mr-2 h-4 w-4" />
                Infrastructure Monitoring
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FileText className="mr-2 h-4 w-4" />
                Compliance Management
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Plus className="mr-2 h-4 w-4" />
                Browse More Apps...
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-4">
          {/* Activity/Jobs */}
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground h-8">
            <Activity className="h-4 w-4" />
            <span className="ml-2 text-sm">Activity</span>
            <Badge variant="secondary" className="ml-2 bg-primary text-primary-foreground text-xs">3</Badge>
          </Button>

          {/* Messages/Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground h-8">
                <Bell className="h-4 w-4" />
                <Badge variant="destructive" className="ml-1 text-xs">5</Badge>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-foreground">System Messages</h4>
                <div className="space-y-2 text-sm">
                  <div className="p-2 bg-muted rounded text-muted-foreground">
                    <div className="font-medium">Search job completed</div>
                    <div className="text-xs text-muted-foreground">2 minutes ago</div>
                  </div>
                  <div className="p-2 bg-muted rounded text-muted-foreground">
                    <div className="font-medium">Alert triggered: Failed logins</div>
                    <div className="text-xs text-muted-foreground">5 minutes ago</div>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Settings */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-muted-foreground hover:text-foreground h-8"
            onClick={() => router.push('/settings')}
          >
            <Settings className="h-4 w-4" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground h-8">
                <User className="h-4 w-4 mr-2" />
                <span className="text-sm">Admin</span>
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Account Settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                <HelpCircle className="mr-2 h-4 w-4" />
                Help & Support
              </DropdownMenuItem>
              <DropdownMenuItem>
                <BookOpen className="mr-2 h-4 w-4" />
                Documentation
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* App Context Bar */}
      <div className="h-14 bg-muted border-b border-border px-4 flex items-center">
        {showSearchBar ? (
          // Search Context Bar
          <div className="flex items-center space-x-4 w-full">
            {/* Main Search Input */}
            <div className="flex-1 flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Enter search query..."
                  value={localSearchQuery}
                  onChange={(e) => setLocalSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearchSubmit()
                    }
                  }}
                  className="pl-10 bg-background border-border text-foreground h-9"
                />
              </div>

              {/* Time Range Picker */}
              <Popover open={isCustomTimeOpen} onOpenChange={setIsCustomTimeOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-9 px-3">
                    <Clock className="h-4 w-4 mr-2" />
                    {getTimeRangeLabel()}
                    <ChevronDown className="ml-2 h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-sm mb-2 text-foreground">Presets</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {timeRangePresets.map((preset) => (
                          <Button
                            key={preset.value}
                            variant={selectedTimeRange === preset.value ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              setSelectedTimeRange(preset.value)
                              setIsCustomTimeOpen(false)
                            }}
                            className="text-xs"
                          >
                            {preset.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Search Actions */}
              <div className="flex items-center space-x-1">
                <Button 
                  onClick={handleSearchSubmit}
                  className="h-9 px-4 bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Search
                </Button>
                <Button variant="outline" className="h-9 px-3">
                  <Pause className="h-4 w-4" />
                </Button>
                <Button variant="outline" className="h-9 px-3">
                  <Square className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Non-Search Context Bar (Navigation)
          <div className="flex items-center space-x-6">
            <Link 
              href="/explorer" 
              className={cn(
                "text-sm font-medium transition-colors",
                activeApp === 'search' ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Search & Reporting
            </Link>
            <Link 
              href="/dashboard" 
              className={cn(
                "text-sm font-medium transition-colors",
                activeApp === 'dashboards' ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Dashboards
            </Link>
            <Link 
              href="/alerts" 
              className={cn(
                "text-sm font-medium transition-colors",
                activeApp === 'alerts' ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Alerts
            </Link>
            <Link 
              href="/reporting" 
              className={cn(
                "text-sm font-medium transition-colors",
                activeApp === 'reports' ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Reports
            </Link>
            {pathname.startsWith('/settings') && (
              <Link 
                href="/settings" 
                className={cn(
                  "text-sm font-medium transition-colors",
                  activeApp === 'settings' ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Settings
              </Link>
            )}
          </div>
        )}
      </div>
    </>
  )
}