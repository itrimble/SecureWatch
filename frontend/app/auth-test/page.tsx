'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { APIService } from '@/lib/api-service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export default function AuthTestPage() {
  const [user, setUser] = useState<any>(null)
  const [testResult, setTestResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const api = new APIService()

  useEffect(() => {
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null)
      })
    }
  }, [supabase])

  const testBackendAuth = async () => {
    setLoading(true)
    setError(null)
    setTestResult(null)

    try {
      const result = await api.testAuth()
      setTestResult(result)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Authentication Test</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Frontend Auth Status</CardTitle>
          <CardDescription>Supabase authentication status</CardDescription>
        </CardHeader>        <CardContent>
          {user ? (
            <div className="space-y-2">
              <p className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Authenticated
              </p>
              <p className="text-sm text-muted-foreground">Email: {user.email}</p>
              <p className="text-sm text-muted-foreground">ID: {user.id}</p>
            </div>
          ) : (
            <p className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              Not authenticated - Please login first
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Backend API Test</CardTitle>
          <CardDescription>Test connection to protected backend endpoint</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={testBackendAuth} 
            disabled={!user || loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              'Test Backend Authentication'
            )}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {testResult && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-semibold">Success!</p>
                <pre className="mt-2 text-xs overflow-auto">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}