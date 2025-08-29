export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      data_connections: {
        Row: {
          id: string
          account_id: string
          name: string
          connection_type: string
          host: string | null
          port: number | null
          database_name: string | null
          username: string | null
          encrypted_password: string | null
          ssl_enabled: boolean | null
          is_active: boolean | null
          created_by: string
          created_at: string
          updated_at: string
          connection_config: Json | null
        }
        Insert: {
          id?: string
          account_id: string
          name: string
          connection_type?: string
          host?: string | null
          port?: number | null
          database_name?: string | null
          username?: string | null
          encrypted_password?: string | null
          ssl_enabled?: boolean | null
          is_active?: boolean | null
          created_by: string
          created_at?: string
          updated_at?: string
          connection_config?: Json | null
        }
        Update: {
          id?: string
          account_id?: string
          name?: string
          connection_type?: string
          host?: string | null
          port?: number | null
          database_name?: string | null
          username?: string | null
          encrypted_password?: string | null
          ssl_enabled?: boolean | null
          is_active?: boolean | null
          created_by?: string
          created_at?: string
          updated_at?: string
          connection_config?: Json | null
        }
      }
      profiles: {
        Row: {
          id: string
          account_id: string
          email: string
          full_name: string | null
          role: string
          is_super_admin: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          account_id: string
          email: string
          full_name?: string | null
          role?: string
          is_super_admin?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          email?: string
          full_name?: string | null
          role?: string
          is_super_admin?: boolean | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}