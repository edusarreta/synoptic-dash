-- Create execute_sql function to handle direct SQL execution for synthetic datasets
CREATE OR REPLACE FUNCTION public.execute_sql(query text)
RETURNS TABLE(result jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    rec record;
    result_array jsonb := '[]'::jsonb;
    row_obj jsonb;
BEGIN
    -- Execute the dynamic query and convert results to jsonb
    FOR rec IN EXECUTE query LOOP
        row_obj := to_jsonb(rec);
        result_array := result_array || row_obj;
    END LOOP;
    
    -- Return each row of the result
    FOR rec IN SELECT jsonb_array_elements(result_array) as data LOOP
        result := rec.data;
        RETURN NEXT;
    END LOOP;
    
    RETURN;
END;
$$;