'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Loader2, AlertCircle, Chrome, Shield, Eye } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:4001'

export default function AuthPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check for error from OAuth callback
    const errorParam = searchParams.get('error')
    if (errorParam) {
      switch (errorParam) {
        case 'callback_failed':
          setError('Authentication callback failed. Please try again.')
          break
        case 'no_token':
          setError('No authentication token received.')
          break
        default:
          setError(decodeURIComponent(errorParam))
      }
    }
  }, [searchParams])

  const handleOAuthLogin = (provider: 'google' | 'microsoft' | 'okta') => {
    setLoading(true)
    setError(null)
    
    // Redirect to OAuth provider
    window.location.href = `${AUTH_SERVICE_URL}/api/auth/oauth/${provider}`
  }

  const handleFormLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${AUTH_SERVICE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Login failed')
      }

      const data = await response.json()
      
      // Store token and redirect
      if (data.accessToken) {
        document.cookie = `auth-token=${data.accessToken}; path=/; max-age=${7 * 24 * 60 * 60}; ${process.env.NODE_ENV === 'production' ? 'secure;' : ''} samesite=lax`
        router.push('/dashboard')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">SecureWatch SIEM</CardTitle>
          <CardDescription>
            Sign in to your account or use Single Sign-On
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* SSO Buttons */}
          <div className="space-y-3">
            <div className="text-sm font-medium text-center text-muted-foreground">
              Single Sign-On
            </div>
            
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleOAuthLogin('google')}
              disabled={loading}
            >
              <Chrome className="mr-2 h-4 w-4" />
              Continue with Google
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleOAuthLogin('microsoft')}
              disabled={loading}
            >
              <Shield className="mr-2 h-4 w-4" />
              Continue with Microsoft
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleOAuthLogin('okta')}
              disabled={loading}
            >
              <Eye className="mr-2 h-4 w-4" />
              Continue with Okta
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                or continue with email
              </span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleFormLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            <p>
              Need help? Contact your system administrator.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}