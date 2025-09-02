-- Create saved_queries table
CREATE TABLE IF NOT EXISTS public.saved_queries (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID NOT NULL,
    workspace_id UUID,
    connection_id UUID,
    name TEXT NOT NULL,
    sql_query TEXT NOT NULL,
    params JSONB DEFAULT '{}'::jsonb,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create datasets table
CREATE TABLE IF NOT EXISTS public.datasets (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id UUID NOT NULL,
    workspace_id UUID,
    source_type TEXT NOT NULL CHECK (source_type IN ('sql', 'rest')),
    connection_id UUID,
    name TEXT NOT NULL,
    sql_query TEXT,
    params JSONB DEFAULT '{}'::jsonb,
    columns JSONB DEFAULT '[]'::jsonb,
    ttl_sec INTEGER DEFAULT 300,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for saved_queries
CREATE POLICY "Users can view saved queries in their org" 
ON public.saved_queries 
FOR SELECT 
USING (org_id IN (
  SELECT profiles.org_id
  FROM profiles
  WHERE profiles.id = auth.uid()
));

CREATE POLICY "Editors can manage saved queries in their org" 
ON public.saved_queries 
FOR ALL 
USING (org_id IN (
  SELECT profiles.org_id
  FROM profiles
  WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['MASTER', 'ADMIN', 'EDITOR'])
));

-- RLS Policies for datasets
CREATE POLICY "Users can view datasets in their org" 
ON public.datasets 
FOR SELECT 
USING (org_id IN (
  SELECT profiles.org_id
  FROM profiles
  WHERE profiles.id = auth.uid()
));

CREATE POLICY "Editors can manage datasets in their org" 
ON public.datasets 
FOR ALL 
USING (org_id IN (
  SELECT profiles.org_id
  FROM profiles
  WHERE profiles.id = auth.uid() AND profiles.role = ANY(ARRAY['MASTER', 'ADMIN', 'EDITOR'])
));

-- Add triggers for updated_at
CREATE TRIGGER update_saved_queries_updated_at
BEFORE UPDATE ON public.saved_queries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_datasets_updated_at
BEFORE UPDATE ON public.datasets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();