-- Fix the security definer function search path issue
CREATE OR REPLACE FUNCTION public.get_user_account_id(user_uuid uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT account_id FROM public.profiles WHERE id = user_uuid LIMIT 1;
$$;