/**
 * Database types for Supabase integration
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          first_name: string
          last_name: string
          registration_date: string
          role: 'admin' | 'user'
          notification_settings: Json
        }
        Insert: {
          id?: string
          email: string
          first_name: string
          last_name: string
          registration_date?: string
          role?: 'admin' | 'user'
          notification_settings?: Json
        }
        Update: {
          id?: string
          email?: string
          first_name?: string
          last_name?: string
          registration_date?: string
          role?: 'admin' | 'user'
          notification_settings?: Json
        }
      }
      exchanges: {
        Row: {
          id: string
          name: string
          api_endpoint: string
          integration_status: 'active' | 'inactive'
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          api_endpoint: string
          integration_status: 'active' | 'inactive'
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          api_endpoint?: string
          integration_status?: 'active' | 'inactive'
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      assets: {
        Row: {
          id: string
          symbol: string
          full_name: string | null
          description: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          symbol: string
          full_name?: string | null
          description?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          symbol?: string
          full_name?: string | null
          description?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      orderbooks: {
        Row: {
          id: string
          asset_id: string
          exchange_id: string
          snapshot: Json
          spread: number
          timestamp: string
          volume: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          asset_id: string
          exchange_id: string
          snapshot: Json
          spread: number
          timestamp: string
          volume?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          asset_id?: string
          exchange_id?: string
          snapshot?: Json
          spread?: number
          timestamp?: string
          volume?: number | null
          created_at?: string | null
        }
      }
      alerts: {
        Row: {
          id: string
          asset_id: string
          exchange_id: string
          spread: number
          send_status: string
          additional_info: Json | null
          timestamp: string
          created_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          asset_id: string
          exchange_id: string
          spread: number
          send_status?: string
          additional_info?: Json | null
          timestamp: string
          created_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          asset_id?: string
          exchange_id?: string
          spread?: number
          send_status?: string
          additional_info?: Json | null
          timestamp?: string
          created_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          payment_method: string
          start_date: string
          end_date: string | null
          status: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          payment_method: string
          start_date: string
          end_date?: string | null
          status?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          payment_method?: string
          start_date?: string
          end_date?: string | null
          status?: string
          created_at?: string | null
          updated_at?: string | null
        }
      }
      watchlist: {
        Row: {
          id: string
          user_id: string
          asset_id: string
          created_at: string | null
          added_date: string
        }
        Insert: {
          id?: string
          user_id: string
          asset_id: string
          created_at?: string | null
          added_date: string
        }
        Update: {
          id?: string
          user_id?: string
          asset_id?: string
          created_at?: string | null
          added_date?: string
        }
      }
      settings: {
        Row: {
          id: string
          user_id: string
          notification_config: Json
          alert_preferences: Json
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          notification_config: Json
          alert_preferences: Json
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          notification_config?: Json
          alert_preferences?: Json
          created_at?: string | null
          updated_at?: string | null
        }
      }
      audit_logs: {
        Row: {
          id: string
          entity: string
          entity_id: string | null
          details: Json | null
          operation: string
          timestamp: string
          created_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          entity: string
          entity_id?: string | null
          details?: Json | null
          operation: string
          timestamp: string
          created_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          entity?: string
          entity_id?: string | null
          details?: Json | null
          operation?: string
          timestamp?: string
          created_at?: string | null
          user_id?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}