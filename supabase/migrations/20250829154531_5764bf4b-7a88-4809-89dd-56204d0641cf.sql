-- BI Platform Database Schema - Multitenancy support
-- This creates the core tables for a Business Intelligence platform

-- Create accounts table for multi-tenancy
CREATE TABLE public.accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create profiles table linked to auth.users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT CHECK (role IN ('admin', 'editor', 'viewer')) DEFAULT 'viewer' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create data_connections table for storing encrypted database credentials
CREATE TABLE public.data_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  connection_type TEXT CHECK (connection_type IN ('postgresql', 'mysql', 'api')) DEFAULT 'postgresql' NOT NULL,
  host TEXT,
  port INTEGER,
  database_name TEXT,
  username TEXT,
  encrypted_password TEXT, -- Will store encrypted password
  ssl_enabled BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create saved_charts table for storing chart configurations
CREATE TABLE public.saved_charts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  data_connection_id UUID REFERENCES public.data_connections(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  chart_type TEXT CHECK (chart_type IN ('table', 'bar', 'line', 'pie')) DEFAULT 'table' NOT NULL,
  sql_query TEXT NOT NULL,
  chart_config JSONB, -- Store chart configuration (columns, styling, etc.)
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create dashboards table
CREATE TABLE public.dashboards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  layout_config JSONB, -- Store grid layout configuration
  is_public BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create dashboard_charts junction table
CREATE TABLE public.dashboard_charts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dashboard_id UUID REFERENCES public.dashboards(id) ON DELETE CASCADE NOT NULL,
  chart_id UUID REFERENCES public.saved_charts(id) ON DELETE CASCADE NOT NULL,
  position_config JSONB, -- Store position and size in grid
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(dashboard_id, chart_id)
);

-- Enable Row Level Security
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_charts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for accounts (only admins can manage accounts)
CREATE POLICY "Users can view their own account" ON public.accounts
  FOR SELECT USING (
    id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid())
  );

-- Create RLS policies for profiles
CREATE POLICY "Users can view profiles in their account" ON public.profiles
  FOR SELECT USING (
    account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- Create RLS policies for data_connections
CREATE POLICY "Users can manage data connections in their account" ON public.data_connections
  FOR ALL USING (
    account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid())
  );

-- Create RLS policies for saved_charts
CREATE POLICY "Users can manage charts in their account" ON public.saved_charts
  FOR ALL USING (
    account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid())
  );

-- Create RLS policies for dashboards
CREATE POLICY "Users can manage dashboards in their account" ON public.dashboards
  FOR ALL USING (
    account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid())
  );

-- Create RLS policies for dashboard_charts
CREATE POLICY "Users can manage dashboard charts in their account" ON public.dashboard_charts
  FOR ALL USING (
    dashboard_id IN (
      SELECT id FROM public.dashboards 
      WHERE account_id IN (SELECT account_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Create function to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_data_connections_updated_at
  BEFORE UPDATE ON public.data_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_saved_charts_updated_at
  BEFORE UPDATE ON public.saved_charts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dashboards_updated_at
  BEFORE UPDATE ON public.dashboards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();