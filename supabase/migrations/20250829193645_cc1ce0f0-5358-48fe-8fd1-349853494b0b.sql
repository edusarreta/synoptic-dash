-- Update the chart_type constraint to include all available chart types
ALTER TABLE public.saved_charts DROP CONSTRAINT saved_charts_chart_type_check;

ALTER TABLE public.saved_charts ADD CONSTRAINT saved_charts_chart_type_check 
CHECK (chart_type = ANY (ARRAY[
  'table'::text, 
  'bar'::text, 
  'line'::text, 
  'pie'::text, 
  'kpi'::text, 
  'area'::text, 
  'composed'::text, 
  'scatter'::text, 
  'radial'::text, 
  'treemap'::text, 
  'funnel'::text, 
  'advanced-table'::text
]));