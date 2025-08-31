-- Create organizations table for multi-tenancy
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  plan_type TEXT DEFAULT 'FREE' CHECK (plan_type IN ('FREE', 'PRO', 'ENTERPRISE')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create updated profiles table with org relationship
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

-- Create datasets table for cached query results
CREATE TABLE public.datasets (
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

-- Create saved_queries table for SQL queries
CREATE TABLE public.saved_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sql_query TEXT NOT NULL,
  parameters JSONB DEFAULT '{}',
  connection_id UUID REFERENCES public.data_connections(id),
  version INTEGER DEFAULT 1,
  tags TEXT[] DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create chart_specs table for chart configurations
CREATE TABLE public.chart_specs (
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

-- Update dashboards table to reference organizations
ALTER TABLE public.dashboards 
DROP COLUMN account_id,
ADD COLUMN org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Create dashboard_layouts table for responsive layouts
CREATE TABLE public.dashboard_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
  breakpoint TEXT NOT NULL CHECK (breakpoint IN ('lg', 'md', 'sm', 'xs')),
  layout_config JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(dashboard_id, breakpoint)
);

-- Enable RLS on all new tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_layouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "Users can view their organization" ON public.organizations
FOR SELECT USING (
  id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Masters can update their organization" ON public.organizations
FOR UPDATE USING (
  id IN (
    SELECT org_id FROM public.profiles 
    WHERE id = auth.uid() AND role = 'MASTER'
  )
);

-- RLS Policies for profiles
CREATE POLICY "Users can view profiles in their org" ON public.profiles
FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can manage profiles in their org" ON public.profiles
FOR ALL USING (
  org_id IN (
    SELECT org_id FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('MASTER', 'ADMIN')
  )
);

-- RLS Policies for datasets
CREATE POLICY "Users can view datasets in their org" ON public.datasets
FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Editors can manage datasets in their org" ON public.datasets
FOR ALL USING (
  org_id IN (
    SELECT org_id FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('MASTER', 'ADMIN', 'EDITOR')
  )
);

-- RLS Policies for saved_queries
CREATE POLICY "Users can view queries in their org" ON public.saved_queries
FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Editors can manage queries in their org" ON public.saved_queries
FOR ALL USING (
  org_id IN (
    SELECT org_id FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('MASTER', 'ADMIN', 'EDITOR')
  )
);

-- RLS Policies for chart_specs
CREATE POLICY "Users can view chart specs in their org" ON public.chart_specs
FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Editors can manage chart specs in their org" ON public.chart_specs
FOR ALL USING (
  org_id IN (
    SELECT org_id FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('MASTER', 'ADMIN', 'EDITOR')
  )
);

-- RLS Policies for dashboard_layouts
CREATE POLICY "Users can view layouts for accessible dashboards" ON public.dashboard_layouts
FOR SELECT USING (
  dashboard_id IN (
    SELECT d.id FROM public.dashboards d
    JOIN public.profiles p ON d.org_id = p.org_id
    WHERE p.id = auth.uid()
  )
);

CREATE POLICY "Editors can manage layouts for their org dashboards" ON public.dashboard_layouts
FOR ALL USING (
  dashboard_id IN (
    SELECT d.id FROM public.dashboards d
    JOIN public.profiles p ON d.org_id = p.org_id
    WHERE p.id = auth.uid() AND p.role IN ('MASTER', 'ADMIN', 'EDITOR')
  )
);

-- Function to handle new user signup with organization creation
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
  -- Get account name from metadata or use default
  account_name := COALESCE(
    NEW.raw_user_meta_data->>'account_name',
    NEW.raw_user_meta_data->>'full_name',
    'Organization'
  );
  
  -- Create organization for new user
  INSERT INTO public.organizations (name, slug)
  VALUES (
    account_name,
    LOWER(REPLACE(account_name || '-' || substring(NEW.id::text from 1 for 8), ' ', '-'))
  )
  RETURNING id INTO org_uuid;
  
  -- Create user profile as MASTER of the organization
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

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_with_org();

-- Update data_connections table to use org_id
ALTER TABLE public.data_connections 
DROP COLUMN account_id,
ADD COLUMN org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Update RLS for data_connections
DROP POLICY IF EXISTS "Admins can manage data connections in their account" ON public.data_connections;
DROP POLICY IF EXISTS "Super admins can view all data_connections" ON public.data_connections;

CREATE POLICY "Users can view connections in their org" ON public.data_connections
FOR SELECT USING (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Admins can manage connections in their org" ON public.data_connections
FOR ALL USING (
  org_id IN (
    SELECT org_id FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('MASTER', 'ADMIN')
  )
);