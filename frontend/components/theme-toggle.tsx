'use client'

import React, { useState, useEffect } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

export function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  const getThemeIcon = (currentTheme: string | undefined) => {
    switch (currentTheme) {
      case 'light':
        return <Sun className="h-4 w-4" />
      case 'dark':
        return <Moon className="h-4 w-4" />
      case 'system':
        return <Monitor className="h-4 w-4" />
      default:
        return <Monitor className="h-4 w-4" />
    }
  }

  const getThemeLabel = (currentTheme: string | undefined) => {
    switch (currentTheme) {
      case 'light':
        return 'Splunk Light'
      case 'dark':
        return 'Splunk Dark'
      case 'system':
        return `System (${systemTheme === 'dark' ? 'Dark' : 'Light'})`
      default:
        return 'System'
    }
  }

  // Prevent hydration mismatch by showing fallback until mounted
  if (!mounted) {
    return (
      <Button variant="outline" size="sm" className="w-auto">
        <Monitor className="h-4 w-4" />
        <span className="ml-2 hidden sm:inline-block">System</span>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="w-auto">
          {getThemeIcon(theme)}
          <span className="ml-2 hidden sm:inline-block">{getThemeLabel(theme)}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => setTheme('light')} className="flex items-center justify-between">
          <div className="flex items-center">
            <Sun className="h-4 w-4 mr-2" />
            <span>Splunk Light</span>
          </div>
          {theme === 'light' && <Badge variant="outline" className="text-xs">Active</Badge>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')} className="flex items-center justify-between">
          <div className="flex items-center">
            <Moon className="h-4 w-4 mr-2" />
            <span>Splunk Dark</span>
          </div>
          {theme === 'dark' && <Badge variant="outline" className="text-xs">Active</Badge>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')} className="flex items-center justify-between">
          <div className="flex items-center">
            <Monitor className="h-4 w-4 mr-2" />
            <span>System</span>
          </div>
          {theme === 'system' && <Badge variant="outline" className="text-xs">Active</Badge>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}