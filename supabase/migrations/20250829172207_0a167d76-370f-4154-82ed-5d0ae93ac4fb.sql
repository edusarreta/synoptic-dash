-- Fase 6: Ecossistema e Inteligência Embarcada
-- Tabelas para análise embarcada, colaboração, preparação de dados e IA generativa

-- 1. Tabela para SDKs de análise embarcada
CREATE TABLE public.embedded_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  public_token TEXT NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  allowed_domains TEXT[] DEFAULT '{}',
  filter_config JSONB DEFAULT '{}',
  security_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- 2. Tabela para comentários e colaboração
CREATE TABLE public.dashboard_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  chart_id UUID REFERENCES saved_charts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  annotation_data JSONB DEFAULT '{}',
  mentioned_users UUID[] DEFAULT '{}',
  parent_comment_id UUID REFERENCES dashboard_comments(id) ON DELETE CASCADE,
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Tabela para anotações visuais
CREATE TABLE public.chart_annotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chart_id UUID NOT NULL REFERENCES saved_charts(id) ON DELETE CASCADE,
  dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  annotation_type TEXT NOT NULL DEFAULT 'text', -- text, drawing, highlight
  annotation_data JSONB NOT NULL DEFAULT '{}',
  position_data JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Tabela para preparação de dados visual
CREATE TABLE public.data_transformations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  source_connections JSONB NOT NULL DEFAULT '[]',
  transformation_config JSONB NOT NULL DEFAULT '{}',
  output_schema JSONB DEFAULT '{}',
  is_materialized BOOLEAN DEFAULT false,
  materialized_table_name TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_executed TIMESTAMP WITH TIME ZONE
);

-- 5. Tabela para integrações de comunicação
CREATE TABLE public.communication_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL, -- slack, teams, email
  integration_config JSONB NOT NULL DEFAULT '{}',
  webhook_url TEXT,
  auth_token TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Tabela para dashboards gerados por IA
CREATE TABLE public.ai_generated_dashboards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  generation_prompt TEXT NOT NULL,
  ai_model_used TEXT DEFAULT 'gpt-4o-mini',
  generation_metadata JSONB DEFAULT '{}',
  charts_generated INTEGER DEFAULT 0,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX idx_embedded_analytics_account_id ON public.embedded_analytics(account_id);
CREATE INDEX idx_embedded_analytics_dashboard_id ON public.embedded_analytics(dashboard_id);
CREATE INDEX idx_embedded_analytics_token ON public.embedded_analytics(public_token);

CREATE INDEX idx_dashboard_comments_dashboard_id ON public.dashboard_comments(dashboard_id);
CREATE INDEX idx_dashboard_comments_user_id ON public.dashboard_comments(user_id);
CREATE INDEX idx_dashboard_comments_chart_id ON public.dashboard_comments(chart_id);

CREATE INDEX idx_chart_annotations_chart_id ON public.chart_annotations(chart_id);
CREATE INDEX idx_chart_annotations_dashboard_id ON public.chart_annotations(dashboard_id);

CREATE INDEX idx_data_transformations_account_id ON public.data_transformations(account_id);
CREATE INDEX idx_data_transformations_name ON public.data_transformations(name);

CREATE INDEX idx_communication_integrations_account_id ON public.communication_integrations(account_id);
CREATE INDEX idx_communication_integrations_type ON public.communication_integrations(integration_type);

CREATE INDEX idx_ai_generated_dashboards_account_id ON public.ai_generated_dashboards(account_id);
CREATE INDEX idx_ai_generated_dashboards_dashboard_id ON public.ai_generated_dashboards(dashboard_id);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.embedded_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_transformations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generated_dashboards ENABLE ROW LEVEL SECURITY;

-- RLS Policies para embedded_analytics
CREATE POLICY "Users can manage embedded analytics in their account" 
ON public.embedded_analytics 
FOR ALL 
USING (account_id IN (
  SELECT profiles.account_id 
  FROM profiles 
  WHERE profiles.id = auth.uid()
));

-- RLS Policies para dashboard_comments
CREATE POLICY "Users can manage comments in their account" 
ON public.dashboard_comments 
FOR ALL 
USING (account_id IN (
  SELECT profiles.account_id 
  FROM profiles 
  WHERE profiles.id = auth.uid()
));

-- RLS Policies para chart_annotations
CREATE POLICY "Users can manage annotations in their account" 
ON public.chart_annotations 
FOR ALL 
USING (dashboard_id IN (
  SELECT d.id 
  FROM dashboards d 
  JOIN profiles p ON d.account_id = p.account_id 
  WHERE p.id = auth.uid()
));

-- RLS Policies para data_transformations
CREATE POLICY "Users can manage data transformations in their account" 
ON public.data_transformations 
FOR ALL 
USING (account_id IN (
  SELECT profiles.account_id 
  FROM profiles 
  WHERE profiles.id = auth.uid()
));

-- RLS Policies para communication_integrations
CREATE POLICY "Admins can manage communication integrations" 
ON public.communication_integrations 
FOR ALL 
USING (account_id IN (
  SELECT profiles.account_id 
  FROM profiles 
  WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
));

-- RLS Policies para ai_generated_dashboards
CREATE POLICY "Users can view AI generated dashboards in their account" 
ON public.ai_generated_dashboards 
FOR ALL 
USING (account_id IN (
  SELECT profiles.account_id 
  FROM profiles 
  WHERE profiles.id = auth.uid()
));

-- Triggers para updated_at
CREATE TRIGGER update_embedded_analytics_updated_at
  BEFORE UPDATE ON public.embedded_analytics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dashboard_comments_updated_at
  BEFORE UPDATE ON public.dashboard_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chart_annotations_updated_at
  BEFORE UPDATE ON public.chart_annotations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_data_transformations_updated_at
  BEFORE UPDATE ON public.data_transformations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_communication_integrations_updated_at
  BEFORE UPDATE ON public.communication_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();