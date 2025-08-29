-- Create audit logs table for enterprise-level tracking
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL,
  user_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for audit logs
CREATE POLICY "Admins can view audit logs for their account" 
ON public.audit_logs 
FOR SELECT 
USING (
  account_id IN (
    SELECT profiles.account_id 
    FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Only system can insert audit logs (will be done via edge functions)
CREATE POLICY "System can insert audit logs" 
ON public.audit_logs 
FOR INSERT 
WITH CHECK (true);

-- Create account_settings table for enterprise customization
CREATE TABLE public.account_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL UNIQUE,
  company_name TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3b82f6',
  secondary_color TEXT DEFAULT '#64748b',
  custom_domain TEXT,
  sso_enabled BOOLEAN DEFAULT false,
  sso_provider TEXT,
  sso_config JSONB DEFAULT '{}',
  white_label_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.account_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for account settings
CREATE POLICY "Admins can manage account settings" 
ON public.account_settings 
FOR ALL 
USING (
  account_id IN (
    SELECT profiles.account_id 
    FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "All users can view their account settings" 
ON public.account_settings 
FOR SELECT 
USING (
  account_id IN (
    SELECT profiles.account_id 
    FROM profiles 
    WHERE profiles.id = auth.uid()
  )
);

-- Create marketplace_items table for connectors and templates
CREATE TABLE public.marketplace_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('connector', 'template')),
  category TEXT NOT NULL,
  icon_url TEXT,
  config JSONB DEFAULT '{}',
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketplace_items ENABLE ROW LEVEL SECURITY;

-- Create policy for marketplace items (all authenticated users can view)
CREATE POLICY "All authenticated users can view marketplace items" 
ON public.marketplace_items 
FOR SELECT 
TO authenticated
USING (is_active = true);

-- Create installed_items table to track what accounts have installed
CREATE TABLE public.installed_marketplace_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL,
  marketplace_item_id UUID NOT NULL REFERENCES public.marketplace_items(id) ON DELETE CASCADE,
  installed_by UUID NOT NULL,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  installed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(account_id, marketplace_item_id)
);

-- Enable RLS
ALTER TABLE public.installed_marketplace_items ENABLE ROW LEVEL SECURITY;

-- Create policies for installed items
CREATE POLICY "Users can manage installed items in their account" 
ON public.installed_marketplace_items 
FOR ALL 
USING (
  account_id IN (
    SELECT profiles.account_id 
    FROM profiles 
    WHERE profiles.id = auth.uid()
  )
);

-- Create trigger for updating account_settings timestamp
CREATE TRIGGER update_account_settings_updated_at
BEFORE UPDATE ON public.account_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample marketplace items
INSERT INTO public.marketplace_items (name, description, type, category, config) VALUES
('Salesforce Connector', 'Connect to Salesforce CRM for sales analytics', 'connector', 'CRM', '{"api_version": "v54.0", "oauth_required": true}'),
('HubSpot Connector', 'Connect to HubSpot for marketing and sales data', 'connector', 'CRM', '{"api_version": "v3", "oauth_required": true}'),
('Google Analytics Connector', 'Connect to Google Analytics for web analytics', 'connector', 'Analytics', '{"api_version": "v4", "oauth_required": true}'),
('PostgreSQL Connector', 'Advanced PostgreSQL connector with custom schemas', 'connector', 'Database', '{"ssl_supported": true, "schema_selection": true}'),
('Sales Performance Dashboard', 'Pre-built dashboard for sales KPIs and metrics', 'template', 'Sales', '{"charts": ["revenue_trend", "sales_funnel", "top_products"]}'),
('Marketing Analytics Dashboard', 'Complete marketing analytics dashboard template', 'template', 'Marketing', '{"charts": ["traffic_sources", "conversion_rates", "campaign_performance"]}'),
('Financial Overview Dashboard', 'Executive financial dashboard with key metrics', 'template', 'Finance', '{"charts": ["revenue_vs_costs", "profit_margins", "cash_flow"]}');

-- Update marketplace items to mark some as featured
UPDATE public.marketplace_items 
SET is_featured = true 
WHERE name IN ('Salesforce Connector', 'Sales Performance Dashboard', 'Marketing Analytics Dashboard');