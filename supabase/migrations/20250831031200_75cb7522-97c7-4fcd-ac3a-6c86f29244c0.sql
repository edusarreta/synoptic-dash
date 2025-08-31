-- Fixed database schema for analytics dashboard system

-- User settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  locale text NOT NULL DEFAULT 'pt-BR',
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  theme text NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  date_format text NOT NULL DEFAULT 'dd/MM/yyyy',
  number_format text NOT NULL DEFAULT 'pt-BR',
  default_org_id uuid REFERENCES public.organizations(id),
  default_workspace_id uuid,
  email_opt_in boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- API tokens table
CREATE TABLE IF NOT EXISTS public.api_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  token_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  UNIQUE(user_id, name)
);

-- Role permissions table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role text NOT NULL,
  perm_code text NOT NULL REFERENCES public.permissions(code),
  PRIMARY KEY (org_id, role, perm_code)
);

-- User grants table with simplified constraint
CREATE TABLE IF NOT EXISTS public.user_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id uuid,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  perm_code text NOT NULL REFERENCES public.permissions(code),
  effect text NOT NULL CHECK (effect IN ('ALLOW', 'DENY')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add unique constraint to user_grants
CREATE UNIQUE INDEX IF NOT EXISTS user_grants_unique_idx 
  ON public.user_grants (org_id, COALESCE(workspace_id, '00000000-0000-0000-0000-000000000000'::uuid), user_id, perm_code);

-- Saved queries table
CREATE TABLE IF NOT EXISTS public.saved_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id uuid,
  connection_id uuid REFERENCES public.data_connections(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  sql_query text NOT NULL,
  params jsonb DEFAULT '{}',
  tags text[] DEFAULT '{}',
  version integer NOT NULL DEFAULT 1,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Datasets table
CREATE TABLE IF NOT EXISTS public.datasets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_query_id uuid REFERENCES public.saved_queries(id) ON DELETE CASCADE,
  cache_ttl_seconds integer NOT NULL DEFAULT 300,
  schema jsonb DEFAULT '{}',
  data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes')
);

-- Usage events table for billing
CREATE TABLE IF NOT EXISTS public.usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}',
  credits_used integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

-- Utility functions
CREATE OR REPLACE FUNCTION public.is_member_of(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND org_id = _org_id
  );
$$;

CREATE OR REPLACE FUNCTION public.role_in_org(_org_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER  
SET search_path = public
AS $$
  SELECT role FROM public.profiles 
  WHERE id = auth.uid() AND org_id = _org_id;
$$;

-- RLS Policies for user_settings
CREATE POLICY "Users can manage their own settings"
  ON public.user_settings
  FOR ALL
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- RLS Policies for api_tokens  
CREATE POLICY "Users can manage their own tokens"
  ON public.api_tokens
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for role_permissions
CREATE POLICY "Org admins can manage role permissions"
  ON public.role_permissions
  FOR ALL
  USING (public.is_member_of(org_id) AND public.role_in_org(org_id) IN ('MASTER', 'ADMIN'))
  WITH CHECK (public.is_member_of(org_id) AND public.role_in_org(org_id) IN ('MASTER', 'ADMIN'));

-- RLS Policies for user_grants
CREATE POLICY "Org admins can manage user grants"
  ON public.user_grants
  FOR ALL
  USING (public.is_member_of(org_id) AND public.role_in_org(org_id) IN ('MASTER', 'ADMIN'))
  WITH CHECK (public.is_member_of(org_id) AND public.role_in_org(org_id) IN ('MASTER', 'ADMIN'));

CREATE POLICY "Users can view their own grants"
  ON public.user_grants
  FOR SELECT
  USING (user_id = auth.uid());

-- RLS Policies for saved_queries
CREATE POLICY "Users can view queries in their org"
  ON public.saved_queries
  FOR SELECT
  USING (public.is_member_of(org_id));

CREATE POLICY "Editors can manage queries in their org"
  ON public.saved_queries
  FOR ALL
  USING (public.is_member_of(org_id) AND public.role_in_org(org_id) IN ('MASTER', 'ADMIN', 'EDITOR'))
  WITH CHECK (public.is_member_of(org_id) AND public.role_in_org(org_id) IN ('MASTER', 'ADMIN', 'EDITOR'));

-- RLS Policies for datasets
CREATE POLICY "Users can view datasets in their org"
  ON public.datasets
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.saved_queries sq 
    WHERE sq.id = saved_query_id AND public.is_member_of(sq.org_id)
  ));

CREATE POLICY "Editors can manage datasets in their org"
  ON public.datasets
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.saved_queries sq 
    WHERE sq.id = saved_query_id 
      AND public.is_member_of(sq.org_id) 
      AND public.role_in_org(sq.org_id) IN ('MASTER', 'ADMIN', 'EDITOR')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.saved_queries sq 
    WHERE sq.id = saved_query_id 
      AND public.is_member_of(sq.org_id) 
      AND public.role_in_org(sq.org_id) IN ('MASTER', 'ADMIN', 'EDITOR')
  ));

-- RLS Policies for usage_events
CREATE POLICY "System can insert usage events"
  ON public.usage_events
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Masters can view org usage events"
  ON public.usage_events
  FOR SELECT
  USING (public.is_member_of(org_id) AND public.role_in_org(org_id) = 'MASTER');

-- Update triggers
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_saved_queries_updated_at
  BEFORE UPDATE ON public.saved_queries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();