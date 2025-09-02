-- Add missing columns to datasets table
ALTER TABLE datasets 
ADD COLUMN IF NOT EXISTS connection_id uuid,
ADD COLUMN IF NOT EXISTS workspace_id uuid,
ADD COLUMN IF NOT EXISTS sql_query text,
ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'sql',
ADD COLUMN IF NOT EXISTS columns jsonb DEFAULT '[]'::jsonb;

-- Update the datasets edge function if needed by creating proper insert structure
COMMENT ON TABLE datasets IS 'Enhanced datasets table with all required columns for SQL queries and connections';