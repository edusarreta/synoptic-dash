-- Step 1: Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  plan_type TEXT DEFAULT 'FREE' CHECK (plan_type IN ('FREE', 'PRO', 'ENTERPRISE')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 2: Create default organization
INSERT INTO public.organizations (name, slug) 
VALUES ('Default Organization', 'default-org')
ON CONFLICT (slug) DO NOTHING;

-- Step 3: Drop policies that depend on account_id in dashboards
DROP POLICY IF EXISTS "Users can manage dashboards in their account" ON public.dashboards;
DROP POLICY IF EXISTS "Users can manage dashboard charts in their account" ON public.dashboard_charts;
DROP POLICY IF EXISTS "Users can manage dashboard filters in their account" ON public.dashboard_filters;
DROP POLICY IF EXISTS "Users can manage shared links for their dashboards" ON public.shared_dashboard_links;
DROP POLICY IF EXISTS "Users can manage annotations in their account" ON public.chart_annotations;

-- Step 4: Add org_id to dashboards
ALTER TABLE public.dashboards 
ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Step 5: Populate org_id for existing dashboards
UPDATE public.dashboards 
SET org_id = (SELECT id FROM public.organizations WHERE slug = 'default-org')
WHERE org_id IS NULL;

-- Step 6: Make org_id NOT NULL
ALTER TABLE public.dashboards 
ALTER COLUMN org_id SET NOT NULL;

-- Step 7: Drop account_id from dashboards
ALTER TABLE public.dashboards DROP COLUMN IF EXISTS account_id;

-- Step 8: Enable RLS on organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Step 9: Recreate profiles with org structure
DROP TABLE IF EXISTS public.profiles CASCADE;
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'VIEWER' CHECK (role IN ('MASTER', 'ADMIN', 'EDITOR', 'VIEWER')),
  is_active BOOLEAN DEFAULT true,
  permissions TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 10: Create essential tables
CREATE TABLE IF NOT EXISTS public.datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  saved_query_id UUID,
  cache_ttl_seconds INTEGER DEFAULT 300,
  data_schema JSONB DEFAULT '{}',
  last_updated TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.saved_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sql_query TEXT NOT NULL,
  parameters JSONB DEFAULT '{}',
  connection_id UUID,
  version INTEGER DEFAULT 1,
  tags TEXT[] DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chart_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  viz_type TEXT NOT NULL CHECK (viz_type IN ('table', 'bar', 'line', 'area', 'timeseries', 'pie', 'kpi')),
  encoding JSONB DEFAULT '{}',
  filters JSONB DEFAULT '[]',
  calculated_fields JSONB DEFAULT '[]',
  format_config JSONB DEFAULT '{"locale": "pt-BR", "currency": "BRL"}',
  options JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dashboard_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
  breakpoint TEXT NOT NULL CHECK (breakpoint IN ('lg', 'md', 'sm', 'xs')),
  layout_config JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(dashboard_id, breakpoint)
);

-- Step 11: Enable RLS on new tables
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_layouts ENABLE ROW LEVEL SECURITY;

-- Step 12: Create basic RLS policies for organizations
CREATE POLICY "Users can view their organization" ON public.organizations
FOR SELECT USING (
  id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- Step 13: Create basic RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT WITH CHECK (id = auth.uid());

-- Step 14: Create RLS policies for dashboards with org_id
CREATE POLICY "Users can manage dashboards in their org" ON public.dashboards
FOR ALL USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

-- Step 15: Recreate policies for dependent tables
CREATE POLICY "Users can manage dashboard charts in their org" ON public.dashboard_charts
FOR ALL USING (
  dashboard_id IN (
    SELECT d.id FROM public.dashboards d
    JOIN public.profiles p ON d.org_id = p.org_id
    WHERE p.id = auth.uid()
  )
);

CREATE POLICY "Users can manage dashboard filters in their org" ON public.dashboard_filters
FOR ALL USING (
  dashboard_id IN (
    SELECT d.id FROM public.dashboards d
    JOIN public.profiles p ON d.org_id = p.org_id
    WHERE p.id = auth.uid()
  )
);

-- Step 16: Create function for new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_with_org()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_uuid UUID;
  account_name TEXT;
BEGIN
  account_name := COALESCE(
    NEW.raw_user_meta_data->>'account_name',
    NEW.raw_user_meta_data->>'full_name',
    'Organization'
  );
  
  INSERT INTO public.organizations (name, slug)
  VALUES (
    account_name,
    LOWER(REPLACE(account_name || '-' || substring(NEW.id::text from 1 for 8), ' ', '-'))
  )
  RETURNING id INTO org_uuid;
  
  INSERT INTO public.profiles (id, org_id, email, full_name, role)
  VALUES (
    NEW.id,
    org_uuid,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    'MASTER'
  );
  
  RETURN NEW;
END;
$$;

-- Step 17: Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_with_org();