-- Fix function search path
CREATE OR REPLACE FUNCTION public.get_user_role_in_account(user_id UUID, account_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM public.profiles 
    WHERE id = user_id AND profiles.account_id = account_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;