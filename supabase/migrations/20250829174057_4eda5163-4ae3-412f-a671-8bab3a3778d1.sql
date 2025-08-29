-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view other profiles in same account" ON public.profiles;

-- Create security definer function to get user's account_id
CREATE OR REPLACE FUNCTION public.get_user_account_id(user_uuid uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT account_id FROM public.profiles WHERE id = user_uuid LIMIT 1;
$$;

-- Create new policies using the security definer function
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (id = auth.uid());

CREATE POLICY "Users can view profiles in same account" 
ON public.profiles 
FOR SELECT 
USING (account_id = public.get_user_account_id(auth.uid()));