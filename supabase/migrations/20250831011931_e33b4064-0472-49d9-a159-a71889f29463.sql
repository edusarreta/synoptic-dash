-- Add missing is_super_admin column to profiles table
ALTER TABLE public.profiles ADD COLUMN is_super_admin boolean DEFAULT false;