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
      account_members: {
        Row: {
          account_id: string
          created_at: string
          id: string
          invited_at: string | null
          invited_by: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_members_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      account_settings: {
        Row: {
          account_id: string
          company_name: string | null
          created_at: string
          custom_domain: string | null
          id: string
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          sso_config: Json | null
          sso_enabled: boolean | null
          sso_provider: string | null
          updated_at: string
          white_label_enabled: boolean | null
        }
        Insert: {
          account_id: string
          company_name?: string | null
          created_at?: string
          custom_domain?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          sso_config?: Json | null
          sso_enabled?: boolean | null
          sso_provider?: string | null
          updated_at?: string
          white_label_enabled?: boolean | null
        }
        Update: {
          account_id?: string
          company_name?: string | null
          created_at?: string
          custom_domain?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          sso_config?: Json | null
          sso_enabled?: boolean | null
          sso_provider?: string | null
          updated_at?: string
          white_label_enabled?: boolean | null
        }
        Relationships: []
      }
      accounts: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          status: string | null
          suspended_at: string | null
          suspended_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          status?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          status?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_generated_dashboards: {
        Row: {
          account_id: string
          ai_model_used: string | null
          charts_generated: number | null
          created_at: string
          created_by: string
          dashboard_id: string
          generation_metadata: Json | null
          generation_prompt: string
          id: string
        }
        Insert: {
          account_id: string
          ai_model_used?: string | null
          charts_generated?: number | null
          created_at?: string
          created_by: string
          dashboard_id: string
          generation_metadata?: Json | null
          generation_prompt: string
          id?: string
        }
        Update: {
          account_id?: string
          ai_model_used?: string | null
          charts_generated?: number | null
          created_at?: string
          created_by?: string
          dashboard_id?: string
          generation_metadata?: Json | null
          generation_prompt?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_generated_dashboards_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_generated_dashboards_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "dashboards"
            referencedColumns: ["id"]
          },
        ]
      }
      api_tokens: {
        Row: {
          created_at: string | null
          id: string
          last_used_at: string | null
          name: string
          token_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          name: string
          token_hash: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          name?: string
          token_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: unknown | null
          metadata: Json | null
          org_id: string
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          org_id: string
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          org_id?: string
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      chart_annotations: {
        Row: {
          annotation_data: Json
          annotation_type: string
          chart_id: string
          created_at: string
          dashboard_id: string
          id: string
          is_active: boolean | null
          position_data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          annotation_data?: Json
          annotation_type?: string
          chart_id: string
          created_at?: string
          dashboard_id: string
          id?: string
          is_active?: boolean | null
          position_data?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          annotation_data?: Json
          annotation_type?: string
          chart_id?: string
          created_at?: string
          dashboard_id?: string
          id?: string
          is_active?: boolean | null
          position_data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_annotations_chart_id_fkey"
            columns: ["chart_id"]
            isOneToOne: false
            referencedRelation: "saved_charts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_annotations_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "dashboards"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_specs: {
        Row: {
          calculated_fields: Json | null
          created_at: string
          created_by: string
          dataset_id: string
          encoding: Json | null
          filters: Json | null
          format_config: Json | null
          id: string
          name: string
          options: Json | null
          org_id: string
          updated_at: string
          viz_type: string
        }
        Insert: {
          calculated_fields?: Json | null
          created_at?: string
          created_by: string
          dataset_id: string
          encoding?: Json | null
          filters?: Json | null
          format_config?: Json | null
          id?: string
          name: string
          options?: Json | null
          org_id: string
          updated_at?: string
          viz_type: string
        }
        Update: {
          calculated_fields?: Json | null
          created_at?: string
          created_by?: string
          dataset_id?: string
          encoding?: Json | null
          filters?: Json | null
          format_config?: Json | null
          id?: string
          name?: string
          options?: Json | null
          org_id?: string
          updated_at?: string
          viz_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_specs_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_specs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client: {
        Row: {
          access_token_wa_business: string | null
          account_id: string | null
          created_at: string
          id: string
          instance_id: string | null
          instance_name: string | null
          integration: string | null
          name: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          access_token_wa_business?: string | null
          account_id?: string | null
          created_at?: string
          id?: string
          instance_id?: string | null
          instance_name?: string | null
          integration?: string | null
          name?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          access_token_wa_business?: string | null
          account_id?: string | null
          created_at?: string
          id?: string
          instance_id?: string | null
          instance_name?: string | null
          integration?: string | null
          name?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      communication_integrations: {
        Row: {
          account_id: string
          auth_token: string | null
          created_at: string
          created_by: string
          id: string
          integration_config: Json
          integration_type: string
          is_active: boolean | null
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          account_id: string
          auth_token?: string | null
          created_at?: string
          created_by: string
          id?: string
          integration_config?: Json
          integration_type: string
          is_active?: boolean | null
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          account_id?: string
          auth_token?: string | null
          created_at?: string
          created_by?: string
          id?: string
          integration_config?: Json
          integration_type?: string
          is_active?: boolean | null
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_integrations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
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
      dashboard_comments: {
        Row: {
          account_id: string
          annotation_data: Json | null
          chart_id: string | null
          comment_text: string
          created_at: string
          dashboard_id: string
          id: string
          is_resolved: boolean | null
          mentioned_users: string[] | null
          parent_comment_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          annotation_data?: Json | null
          chart_id?: string | null
          comment_text: string
          created_at?: string
          dashboard_id: string
          id?: string
          is_resolved?: boolean | null
          mentioned_users?: string[] | null
          parent_comment_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          annotation_data?: Json | null
          chart_id?: string | null
          comment_text?: string
          created_at?: string
          dashboard_id?: string
          id?: string
          is_resolved?: boolean | null
          mentioned_users?: string[] | null
          parent_comment_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_comments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboard_comments_chart_id_fkey"
            columns: ["chart_id"]
            isOneToOne: false
            referencedRelation: "saved_charts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboard_comments_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "dashboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboard_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "dashboard_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_filters: {
        Row: {
          created_at: string
          dashboard_id: string
          filter_config: Json
          filter_name: string
          id: string
          position_config: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          dashboard_id: string
          filter_config?: Json
          filter_name: string
          id?: string
          position_config?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          dashboard_id?: string
          filter_config?: Json
          filter_name?: string
          id?: string
          position_config?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_filters_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "dashboards"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_layouts: {
        Row: {
          breakpoint: string
          created_at: string
          dashboard_id: string
          id: string
          layout_config: Json
          updated_at: string
        }
        Insert: {
          breakpoint: string
          created_at?: string
          dashboard_id: string
          id?: string
          layout_config?: Json
          updated_at?: string
        }
        Update: {
          breakpoint?: string
          created_at?: string
          dashboard_id?: string
          id?: string
          layout_config?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_layouts_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "dashboards"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboards: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_public: boolean | null
          layout_config: Json | null
          name: string
          org_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          layout_config?: Json | null
          name: string
          org_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          layout_config?: Json | null
          name?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboards_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      data_connections: {
        Row: {
          account_id: string
          connection_config: Json | null
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
          connection_config?: Json | null
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
          connection_config?: Json | null
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
      data_transformations: {
        Row: {
          account_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_materialized: boolean | null
          last_executed: string | null
          materialized_table_name: string | null
          name: string
          output_schema: Json | null
          source_connections: Json
          transformation_config: Json
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_materialized?: boolean | null
          last_executed?: string | null
          materialized_table_name?: string | null
          name: string
          output_schema?: Json | null
          source_connections?: Json
          transformation_config?: Json
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_materialized?: boolean | null
          last_executed?: string | null
          materialized_table_name?: string | null
          name?: string
          output_schema?: Json | null
          source_connections?: Json
          transformation_config?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_transformations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      datasets: {
        Row: {
          cache_ttl_seconds: number | null
          created_at: string
          created_by: string
          data_schema: Json | null
          description: string | null
          id: string
          last_updated: string | null
          name: string
          org_id: string
          saved_query_id: string | null
          updated_at: string
        }
        Insert: {
          cache_ttl_seconds?: number | null
          created_at?: string
          created_by: string
          data_schema?: Json | null
          description?: string | null
          id?: string
          last_updated?: string | null
          name: string
          org_id: string
          saved_query_id?: string | null
          updated_at?: string
        }
        Update: {
          cache_ttl_seconds?: number | null
          created_at?: string
          created_by?: string
          data_schema?: Json | null
          description?: string | null
          id?: string
          last_updated?: string | null
          name?: string
          org_id?: string
          saved_query_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "datasets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      embedded_analytics: {
        Row: {
          account_id: string
          allowed_domains: string[] | null
          created_at: string
          created_by: string
          dashboard_id: string
          expires_at: string | null
          filter_config: Json | null
          id: string
          is_active: boolean | null
          public_token: string
          security_config: Json | null
          updated_at: string
        }
        Insert: {
          account_id: string
          allowed_domains?: string[] | null
          created_at?: string
          created_by: string
          dashboard_id: string
          expires_at?: string | null
          filter_config?: Json | null
          id?: string
          is_active?: boolean | null
          public_token?: string
          security_config?: Json | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          allowed_domains?: string[] | null
          created_at?: string
          created_by?: string
          dashboard_id?: string
          expires_at?: string | null
          filter_config?: Json | null
          id?: string
          is_active?: boolean | null
          public_token?: string
          security_config?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "embedded_analytics_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "embedded_analytics_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "dashboards"
            referencedColumns: ["id"]
          },
        ]
      }
      installed_marketplace_items: {
        Row: {
          account_id: string
          config: Json | null
          id: string
          installed_at: string
          installed_by: string
          is_active: boolean | null
          marketplace_item_id: string
        }
        Insert: {
          account_id: string
          config?: Json | null
          id?: string
          installed_at?: string
          installed_by: string
          is_active?: boolean | null
          marketplace_item_id: string
        }
        Update: {
          account_id?: string
          config?: Json | null
          id?: string
          installed_at?: string
          installed_by?: string
          is_active?: boolean | null
          marketplace_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "installed_marketplace_items_marketplace_item_id_fkey"
            columns: ["marketplace_item_id"]
            isOneToOne: false
            referencedRelation: "marketplace_items"
            referencedColumns: ["id"]
          },
        ]
      }
      instance: {
        Row: {
          account_id: string | null
          contactId: string | null
          conversationsId: string | null
          created_at: string
          id: string
          integration: string | null
          locationId: string
          name: string | null
          token: string | null
          user_id: string | null
          "user.phone": string | null
          wamid: string | null
        }
        Insert: {
          account_id?: string | null
          contactId?: string | null
          conversationsId?: string | null
          created_at: string
          id: string
          integration?: string | null
          locationId: string
          name?: string | null
          token?: string | null
          user_id?: string | null
          "user.phone"?: string | null
          wamid?: string | null
        }
        Update: {
          account_id?: string | null
          contactId?: string | null
          conversationsId?: string | null
          created_at?: string
          id?: string
          integration?: string | null
          locationId?: string
          name?: string | null
          token?: string | null
          user_id?: string | null
          "user.phone"?: string | null
          wamid?: string | null
        }
        Relationships: []
      }
      marketplace_items: {
        Row: {
          category: string
          config: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          icon_url: string | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          category: string
          config?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          category?: string
          config?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          plan_type: string | null
          settings: Json | null
          slug: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          plan_type?: string | null
          settings?: Json | null
          slug: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          plan_type?: string | null
          settings?: Json | null
          slug?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          module: string
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          module: string
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          module?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          is_super_admin: boolean | null
          org_id: string
          permissions: string[] | null
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean | null
          is_super_admin?: boolean | null
          org_id: string
          permissions?: string[] | null
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          is_super_admin?: boolean | null
          org_id?: string
          permissions?: string[] | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          org_id: string
          perm_code: string
          role: string
        }
        Insert: {
          org_id: string
          perm_code: string
          role: string
        }
        Update: {
          org_id?: string
          perm_code?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_perm_code_fkey"
            columns: ["perm_code"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["code"]
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
          filter_config: Json | null
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
          filter_config?: Json | null
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
          filter_config?: Json | null
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
      saved_queries: {
        Row: {
          connection_id: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          org_id: string
          parameters: Json | null
          sql_query: string
          tags: string[] | null
          updated_at: string
          version: number | null
        }
        Insert: {
          connection_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          org_id: string
          parameters?: Json | null
          sql_query: string
          tags?: string[] | null
          updated_at?: string
          version?: number | null
        }
        Update: {
          connection_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          org_id?: string
          parameters?: Json | null
          sql_query?: string
          tags?: string[] | null
          updated_at?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_queries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_dashboard_links: {
        Row: {
          created_at: string
          created_by: string
          dashboard_id: string
          expires_at: string | null
          id: string
          is_active: boolean
          last_accessed: string | null
          public_token: string
        }
        Insert: {
          created_at?: string
          created_by: string
          dashboard_id: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_accessed?: string | null
          public_token?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          dashboard_id?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_accessed?: string | null
          public_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_dashboard_links_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "dashboards"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          org_id: string
          plan_type: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          org_id: string
          plan_type?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          org_id?: string
          plan_type?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_account_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_tracking: {
        Row: {
          created_at: string
          id: string
          metric_name: string
          metric_value: number
          org_id: string
          period_end: string
          period_start: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          metric_name: string
          metric_value?: number
          org_id: string
          period_end?: string
          period_start?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          metric_name?: string
          metric_value?: number
          org_id?: string
          period_end?: string
          period_start?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_tracking_account_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_grants: {
        Row: {
          created_at: string | null
          effect: string
          id: string
          org_id: string
          perm_code: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          effect: string
          id?: string
          org_id: string
          perm_code: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          effect?: string
          id?: string
          org_id?: string
          perm_code?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_grants_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_grants_perm_code_fkey"
            columns: ["perm_code"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["code"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string | null
          date_format: string | null
          default_org_id: string | null
          default_workspace_id: string | null
          email_opt_in: boolean | null
          id: string
          locale: string | null
          number_format: string | null
          theme: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date_format?: string | null
          default_org_id?: string | null
          default_workspace_id?: string | null
          email_opt_in?: boolean | null
          id: string
          locale?: string | null
          number_format?: string | null
          theme?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date_format?: string | null
          default_org_id?: string | null
          default_workspace_id?: string | null
          email_opt_in?: boolean | null
          id?: string
          locale?: string | null
          number_format?: string | null
          theme?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_subscription_status: {
        Args: { account_uuid: string }
        Returns: {
          dashboards_limit: number
          data_connections_limit: number
          is_active: boolean
          monthly_queries_limit: number
          plan_type: string
          trial_days_left: number
        }[]
      }
      get_user_account_id: {
        Args: { user_uuid: string }
        Returns: string
      }
      get_user_role_in_account: {
        Args: { account_id: string; user_id: string }
        Returns: string
      }
      get_user_role_with_super_admin: {
        Args: { account_id: string; user_id: string }
        Returns: string
      }
      is_super_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
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
