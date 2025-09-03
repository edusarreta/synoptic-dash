-- Recreate execute_sql function with better data handling
DROP FUNCTION IF EXISTS public.execute_sql(text);

CREATE OR REPLACE FUNCTION public.execute_sql(query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result_row record;
    result_array jsonb := '[]'::jsonb;
    row_obj jsonb;
BEGIN
    -- Execute the dynamic query and convert results to jsonb array
    FOR result_row IN EXECUTE query LOOP
        row_obj := to_jsonb(result_row);
        result_array := result_array || row_obj;
    END LOOP;
    
    RETURN result_array;
END;
$$;