import { createClient } from '@/lib/supabase/client'

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: any
  headers?: Record<string, string>
}

export class APIService {
  private backendURL: string

  constructor() {
    this.backendURL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:4003/api'
  }

  private async getAuthToken(): Promise<string | null> {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  }

  async request<T = any>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const token = await this.getAuthToken()
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${this.backendURL}${endpoint}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // Test protected endpoint
  async testAuth() {
    return this.request('/protected')
  }
}