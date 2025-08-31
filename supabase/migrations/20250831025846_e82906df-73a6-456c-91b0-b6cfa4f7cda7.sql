-- Step 2: Create role_permissions and user_grants tables

-- Create role_permissions table  
CREATE TABLE IF NOT EXISTS public.role_permissions (
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  perm_code TEXT NOT NULL REFERENCES public.permissions(code) ON DELETE CASCADE,
  PRIMARY KEY (org_id, role, perm_code)
);

-- Create user_grants table
CREATE TABLE IF NOT EXISTS public.user_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id UUID,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  perm_code TEXT NOT NULL REFERENCES public.permissions(code) ON DELETE CASCADE,
  effect TEXT NOT NULL CHECK (effect IN ('ALLOW', 'DENY')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, user_id, perm_code, workspace_id)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_grants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for role_permissions
CREATE POLICY "Org admins can manage role permissions" ON public.role_permissions
FOR ALL USING (
  org_id IN (
    SELECT p.org_id FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role IN ('MASTER', 'ADMIN')
  )
);

-- RLS Policies for user_grants
CREATE POLICY "Org admins can manage user grants" ON public.user_grants
FOR ALL USING (
  org_id IN (
    SELECT p.org_id FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.role IN ('MASTER', 'ADMIN')
  )
);

CREATE POLICY "Users can view their own grants" ON public.user_grants
FOR SELECT USING (user_id = auth.uid());