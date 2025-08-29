-- Fix security issues identified by linter

-- Add missing RLS policies for profiles table
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- Add missing RLS policies for accounts table  
CREATE POLICY "Admins can insert accounts" ON public.accounts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update accounts" ON public.accounts
  FOR UPDATE USING (
    id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete accounts" ON public.accounts
  FOR DELETE USING (
    id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Fix search_path security issue in the function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create a trigger function to handle profile creation when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This will be called when someone completes account setup
  -- For now, just ensure the profile exists
  RETURN NEW;
END;
$$;