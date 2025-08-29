export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      client: {
        Row: {
          access_token_wa_business: string | null
          created_at: string
          id: string
          instance_id: string | null
          instance_name: string | null
          integration: string | null
          name: string | null
          status: string | null
        }
        Insert: {
          access_token_wa_business?: string | null
          created_at?: string
          id?: string
          instance_id?: string | null
          instance_name?: string | null
          integration?: string | null
          name?: string | null
          status?: string | null
        }
        Update: {
          access_token_wa_business?: string | null
          created_at?: string
          id?: string
          instance_id?: string | null
          instance_name?: string | null
          integration?: string | null
          name?: string | null
          status?: string | null
        }
        Relationships: []
      }
      dashboard_charts: {
        Row: {
          chart_id: string
          created_at: string
          dashboard_id: string
          id: string
          position_config: Json | null
        }
        Insert: {
          chart_id: string
          created_at?: string
          dashboard_id: string
          id?: string
          position_config?: Json | null
        }
        Update: {
          chart_id?: string
          created_at?: string
          dashboard_id?: string
          id?: string
          position_config?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_charts_chart_id_fkey"
            columns: ["chart_id"]
            isOneToOne: false
            referencedRelation: "saved_charts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboard_charts_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "dashboards"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboards: {
        Row: {
          account_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_public: boolean | null
          layout_config: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          layout_config?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          layout_config?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboards_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      data_connections: {
        Row: {
          account_id: string
          connection_type: string
          created_at: string
          created_by: string
          database_name: string | null
          encrypted_password: string | null
          host: string | null
          id: string
          is_active: boolean | null
          name: string
          port: number | null
          ssl_enabled: boolean | null
          updated_at: string
          username: string | null
        }
        Insert: {
          account_id: string
          connection_type?: string
          created_at?: string
          created_by: string
          database_name?: string | null
          encrypted_password?: string | null
          host?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          port?: number | null
          ssl_enabled?: boolean | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          account_id?: string
          connection_type?: string
          created_at?: string
          created_by?: string
          database_name?: string | null
          encrypted_password?: string | null
          host?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          port?: number | null
          ssl_enabled?: boolean | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_connections_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      instance: {
        Row: {
          contactId: string | null
          conversationsId: string | null
          created_at: string
          id: string
          integration: string | null
          locationId: string
          name: string | null
          token: string | null
          "user.phone": string | null
          wamid: string | null
        }
        Insert: {
          contactId?: string | null
          conversationsId?: string | null
          created_at: string
          id: string
          integration?: string | null
          locationId: string
          name?: string | null
          token?: string | null
          "user.phone"?: string | null
          wamid?: string | null
        }
        Update: {
          contactId?: string | null
          conversationsId?: string | null
          created_at?: string
          id?: string
          integration?: string | null
          locationId?: string
          name?: string | null
          token?: string | null
          "user.phone"?: string | null
          wamid?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_id: string
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_charts: {
        Row: {
          account_id: string
          chart_config: Json | null
          chart_type: string
          created_at: string
          created_by: string
          data_connection_id: string
          description: string | null
          id: string
          name: string
          sql_query: string
          updated_at: string
        }
        Insert: {
          account_id: string
          chart_config?: Json | null
          chart_type?: string
          created_at?: string
          created_by: string
          data_connection_id: string
          description?: string | null
          id?: string
          name: string
          sql_query: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          chart_config?: Json | null
          chart_type?: string
          created_at?: string
          created_by?: string
          data_connection_id?: string
          description?: string | null
          id?: string
          name?: string
          sql_query?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_charts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_charts_data_connection_id_fkey"
            columns: ["data_connection_id"]
            isOneToOne: false
            referencedRelation: "data_connections"
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
