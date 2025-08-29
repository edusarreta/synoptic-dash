-- Create account_members junction table for RBAC
CREATE TABLE public.account_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(account_id, user_id)
);

-- Enable RLS
ALTER TABLE public.account_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for account_members
CREATE POLICY "Users can view members in their account" 
ON public.account_members 
FOR SELECT 
USING (account_id IN (
  SELECT profiles.account_id 
  FROM public.profiles 
  WHERE profiles.id = auth.uid()
));

CREATE POLICY "Admins can manage account members" 
ON public.account_members 
FOR ALL 
USING (account_id IN (
  SELECT profiles.account_id 
  FROM public.profiles 
  WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
)) 
WITH CHECK (account_id IN (
  SELECT profiles.account_id 
  FROM public.profiles 
  WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
));

-- Update data_connections table to support new connector types
ALTER TABLE public.data_connections ADD COLUMN connection_config JSONB DEFAULT '{}';

-- Add comment to explain the new config structure
COMMENT ON COLUMN public.data_connections.connection_config IS 'Stores configuration for different connector types: Supabase (url, anon_key, service_key), REST API (base_url, auth_type, auth_config, endpoints)';

-- Update saved_charts to support new chart types and filter configs
ALTER TABLE public.saved_charts ADD COLUMN filter_config JSONB DEFAULT '{}';

-- Add dashboard_filters table for interactive filters
CREATE TABLE public.dashboard_filters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dashboard_id UUID NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
  filter_name TEXT NOT NULL,
  filter_config JSONB NOT NULL DEFAULT '{}',
  position_config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on dashboard_filters
ALTER TABLE public.dashboard_filters ENABLE ROW LEVEL SECURITY;

-- RLS policies for dashboard_filters
CREATE POLICY "Users can manage dashboard filters in their account" 
ON public.dashboard_filters 
FOR ALL 
USING (dashboard_id IN (
  SELECT dashboards.id 
  FROM public.dashboards 
  WHERE dashboards.account_id IN (
    SELECT profiles.account_id 
    FROM public.profiles 
    WHERE profiles.id = auth.uid()
  )
));

-- Add triggers for updated_at
CREATE TRIGGER update_account_members_updated_at
BEFORE UPDATE ON public.account_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dashboard_filters_updated_at
BEFORE UPDATE ON public.dashboard_filters
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get user role in account
CREATE OR REPLACE FUNCTION public.get_user_role_in_account(user_id UUID, account_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM public.profiles 
    WHERE id = user_id AND profiles.account_id = account_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;