export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          additional_info: Json | null
          asset_id: string
          created_at: string | null
          exchange_id: string
          id: string
          send_status: string
          spread: number
          timestamp: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          additional_info?: Json | null
          asset_id: string
          created_at?: string | null
          exchange_id: string
          id?: string
          send_status: string
          spread: number
          timestamp: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          additional_info?: Json | null
          asset_id?: string
          created_at?: string | null
          exchange_id?: string
          id?: string
          send_status?: string
          spread?: number
          timestamp?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_exchange_id_fkey"
            columns: ["exchange_id"]
            isOneToOne: false
            referencedRelation: "exchanges"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          created_at: string | null
          description: string | null
          full_name: string | null
          id: string
          symbol: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          full_name?: string | null
          id?: string
          symbol: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          full_name?: string | null
          id?: string
          symbol?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          entity: string
          entity_id: string | null
          id: string
          operation: string
          timestamp: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
          operation: string
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
          operation?: string
          timestamp?: string
          user_id?: string | null
        }
        Relationships: []
      }
      exchanges: {
        Row: {
          api_endpoint: string
          created_at: string | null
          id: string
          integration_status: string
          metadata: Json | null
          name: string
          updated_at: string | null
        }
        Insert: {
          api_endpoint: string
          created_at?: string | null
          id?: string
          integration_status: string
          metadata?: Json | null
          name: string
          updated_at?: string | null
        }
        Update: {
          api_endpoint?: string
          created_at?: string | null
          id?: string
          integration_status?: string
          metadata?: Json | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      orderbooks: {
        Row: {
          asset_id: string
          created_at: string | null
          exchange_id: string
          id: string
          snapshot: Json
          spread: number
          timestamp: string
          volume: number | null
        }
        Insert: {
          asset_id: string
          created_at?: string | null
          exchange_id: string
          id?: string
          snapshot: Json
          spread: number
          timestamp: string
          volume?: number | null
        }
        Update: {
          asset_id?: string
          created_at?: string | null
          exchange_id?: string
          id?: string
          snapshot?: Json
          spread?: number
          timestamp?: string
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orderbooks_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orderbooks_exchange_id_fkey"
            columns: ["exchange_id"]
            isOneToOne: false
            referencedRelation: "exchanges"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          alert_preferences: Json
          created_at: string | null
          id: string
          notification_config: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alert_preferences: Json
          created_at?: string | null
          id?: string
          notification_config: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alert_preferences?: Json
          created_at?: string | null
          id?: string
          notification_config?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          id: string
          email: string | null
          favourite_exchanges: string[] | null
          favourite_assets: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          favourite_exchanges?: string[] | null
          favourite_assets?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          favourite_exchanges?: string[] | null
          favourite_assets?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      subscriptions: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          payment_method: string
          start_date: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          payment_method: string
          start_date: string
          status: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          payment_method?: string
          start_date?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          added_date: string
          asset_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          added_date?: string
          asset_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          added_date?: string
          asset_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

