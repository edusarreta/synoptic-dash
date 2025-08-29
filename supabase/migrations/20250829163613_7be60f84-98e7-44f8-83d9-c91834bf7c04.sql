-- Create missing tables for complete multi-tenancy

-- Usage tracking table
CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL, -- dashboards_count, data_connections_count, monthly_queries
  metric_value INTEGER NOT NULL DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', now()),
  period_end TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(account_id, metric_name, period_start)
);

-- Enable RLS for usage tracking
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their account usage" ON public.usage_tracking;
CREATE POLICY "Users can view their account usage" 
ON public.usage_tracking 
FOR SELECT 
USING (
  account_id IN (
    SELECT profiles.account_id 
    FROM profiles 
    WHERE profiles.id = auth.uid()
  )
);

-- Function to check subscription status and plan limits
CREATE OR REPLACE FUNCTION public.check_subscription_status(account_uuid UUID)
RETURNS TABLE(
  is_active BOOLEAN,
  plan_type TEXT,
  trial_days_left INTEGER,
  dashboards_limit INTEGER,
  data_connections_limit INTEGER,
  monthly_queries_limit INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN s.status = 'active' THEN true
      WHEN s.status = 'trialing' AND s.trial_end > now() THEN true
      ELSE false
    END as is_active,
    s.plan_type,
    CASE 
      WHEN s.status = 'trialing' AND s.trial_end > now() 
      THEN EXTRACT(days FROM s.trial_end - now())::INTEGER
      ELSE 0
    END as trial_days_left,
    CASE s.plan_type
      WHEN 'basic' THEN 5
      WHEN 'pro' THEN 25
      WHEN 'enterprise' THEN -1 -- unlimited
      ELSE 1
    END as dashboards_limit,
    CASE s.plan_type
      WHEN 'basic' THEN 3
      WHEN 'pro' THEN 10
      WHEN 'enterprise' THEN -1 -- unlimited
      ELSE 1
    END as data_connections_limit,
    CASE s.plan_type
      WHEN 'basic' THEN 1000
      WHEN 'pro' THEN 10000
      WHEN 'enterprise' THEN -1 -- unlimited
      ELSE 100
    END as monthly_queries_limit
  FROM subscriptions s
  WHERE s.account_id = account_uuid;
END;
$$;

-- Shared dashboard links table
CREATE TABLE IF NOT EXISTS public.shared_dashboard_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES public.dashboards(id) ON DELETE CASCADE,
  public_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_accessed TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.shared_dashboard_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage shared links for their dashboards" 
ON public.shared_dashboard_links 
FOR ALL 
USING (
  dashboard_id IN (
    SELECT d.id FROM dashboards d
    INNER JOIN profiles p ON d.account_id = p.account_id
    WHERE p.id = auth.uid()
  )
);