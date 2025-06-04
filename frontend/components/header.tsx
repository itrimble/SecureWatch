'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { User } from '@supabase/supabase-js'
import { Github, LogOut, Activity } from 'lucide-react'
import Link from 'next/link'

export function Header() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleSignIn = async () => {
    if (!supabase) return
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  const handleSignOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  }

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Activity className="h-4 w-4" />
            <span className="text-sm font-medium">Status: Online</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {loading ? (
            <div className="h-8 w-24 animate-pulse bg-muted rounded" />
          ) : !supabase ? (
            <div className="text-caption text-muted-foreground">
              Auth disabled
            </div>
          ) : user ? (
            <div className="flex items-center gap-3">
              <span className="text-body text-muted-foreground">{user.email}</span>
              <Button onClick={handleSignOut} variant="outline" size="sm" className="interactive-element">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </div>
          ) : (
            <Button onClick={handleSignIn} variant="outline" className="interactive-element">
              <Github className="mr-2 h-4 w-4" />
              Sign in with GitHub
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}