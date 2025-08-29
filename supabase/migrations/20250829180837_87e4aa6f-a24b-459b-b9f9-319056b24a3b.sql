-- Create profile and account for the current user (Eduardo)
-- First create an account
INSERT INTO public.accounts (name, slug)
VALUES ('FDA', 'fda')
ON CONFLICT (slug) DO NOTHING;

-- Then create the profile for the current user
INSERT INTO public.profiles (id, account_id, email, full_name, role)
SELECT 
  'ce2c9af5-2f35-439f-bdc1-99c83a96d903'::uuid,
  (SELECT id FROM public.accounts WHERE slug = 'fda'),
  'eduardo@fabricaautomacao.com.br',
  'Eduardo',
  'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = 'ce2c9af5-2f35-439f-bdc1-99c83a96d903'::uuid
);