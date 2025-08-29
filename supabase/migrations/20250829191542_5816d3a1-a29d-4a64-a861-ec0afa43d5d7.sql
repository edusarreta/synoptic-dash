-- Update the check constraint to allow new connection types
ALTER TABLE data_connections DROP CONSTRAINT data_connections_connection_type_check;

-- Add new constraint with additional connection types
ALTER TABLE data_connections ADD CONSTRAINT data_connections_connection_type_check 
CHECK (connection_type = ANY (ARRAY['postgresql'::text, 'mysql'::text, 'api'::text, 'supabase'::text, 'rest_api'::text]));