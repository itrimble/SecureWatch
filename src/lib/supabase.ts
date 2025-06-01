import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Database = {
  public: {
    Tables: {
      event_logs: {
        Row: {
          id: string
          event_id: number
          event_name: string
          description: string
          attack_types: string[]
          mitre_tactics: string[]
          mitre_techniques: string[]
          log_source: string
          severity: 'low' | 'medium' | 'high' | 'critical'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: number
          event_name: string
          description: string
          attack_types: string[]
          mitre_tactics?: string[]
          mitre_techniques?: string[]
          log_source: string
          severity: 'low' | 'medium' | 'high' | 'critical'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: number
          event_name?: string
          description?: string
          attack_types?: string[]
          mitre_tactics?: string[]
          mitre_techniques?: string[]
          log_source?: string
          severity?: 'low' | 'medium' | 'high' | 'critical'
          created_at?: string
          updated_at?: string
        }
      }
      queries: {
        Row: {
          id: string
          platform: string
          query_text: string
          event_ids: number[]
          filters: Record<string, unknown>
          created_at: string
          user_id?: string
        }
        Insert: {
          id?: string
          platform: string
          query_text: string
          event_ids: number[]
          filters?: Record<string, unknown>
          created_at?: string
          user_id?: string
        }
        Update: {
          id?: string
          platform?: string
          query_text?: string
          event_ids?: number[]
          filters?: Record<string, unknown>
          created_at?: string
          user_id?: string
        }
      }
    }
  }
}