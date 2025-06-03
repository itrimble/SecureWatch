'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { User } from '@supabase/supabase-js'
import { Github, LogOut } from 'lucide-react'
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
    <header className="border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold text-xl">
            SecureWatch SIEM
          </Link>
          <nav className="hidden md:flex items-center gap-4">
            <Link href="/auth-test" className="text-sm hover:underline">
              Auth Test
            </Link>
          </nav>
        </div>
        
        <div>
          {loading ? (
            <div className="h-10 w-32 animate-pulse bg-gray-200 rounded" />
          ) : !supabase ? (
            <div className="text-sm text-muted-foreground">
              Auth disabled
            </div>
          ) : user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{user.email}</span>
              <Button onClick={handleSignOut} variant="outline" size="sm">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </div>
          ) : (
            <Button onClick={handleSignIn} variant="outline">
              <Github className="mr-2 h-4 w-4" />
              Sign in with GitHub
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}