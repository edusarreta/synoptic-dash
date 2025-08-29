-- Fase 3: Multi-tenancy e Faturamento
-- Primeiro, vamos criar a tabela de assinaturas para controlar pagamentos

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'trialing', -- trialing, active, past_due, canceled, unpaid
  plan_type TEXT NOT NULL DEFAULT 'basic', -- basic, pro, enterprise
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ DEFAULT (now() + interval '14 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(account_id)
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Only admins can view their account's subscription
CREATE POLICY "Admins can view account subscription" 
ON public.subscriptions 
FOR SELECT 
USING (
  account_id IN (
    SELECT profiles.account_id 
    FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Only admins can update their account's subscription
CREATE POLICY "Admins can update account subscription" 
ON public.subscriptions 
FOR UPDATE 
USING (
  account_id IN (
    SELECT profiles.account_id 
    FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Edge functions can insert/update subscriptions (using service role)
CREATE POLICY "Service role can manage subscriptions" 
ON public.subscriptions 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create usage tracking table for plan limits
CREATE TABLE public.usage_tracking (
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

-- Create trigger to automatically create subscription on account creation
CREATE OR REPLACE FUNCTION public.handle_new_account()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create default subscription with 14-day trial
  INSERT INTO public.subscriptions (account_id, status, plan_type)
  VALUES (NEW.id, 'trialing', 'basic');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_account_created
  AFTER INSERT ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_account();