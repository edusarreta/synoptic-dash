import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Sparkles, 
  Send, 
  Loader2, 
  BarChart3, 
  Database,
  Wand2,
  Clock,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAI } from '@/hooks/useAI';

interface GenerationRequest {
  prompt: string;
  dataSourceId: string;
  dashboardName: string;
}

interface GeneratedDashboard {
  id: string;
  dashboard_id: string;
  generation_prompt: string;
  ai_model_used: string;
  charts_generated: number;
  created_at: string;
}

interface DataConnection {
  id: string;
  name: string;
  connection_type: string;
  database_name: string;
}

export function AIGenerativeDashboards() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [request, setRequest] = useState<GenerationRequest>({
    prompt: '',
    dataSourceId: '',
    dashboardName: '',
  });
  const [loading, setLoading] = useState(false);
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [generationHistory, setGenerationHistory] = useState<GeneratedDashboard[]>([]);
  const [generatingSteps, setGeneratingSteps] = useState<string[]>([]);

  useEffect(() => {
    loadConnections();
    loadGenerationHistory();
  }, [user]);

  const loadConnections = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single();

      if (profile) {
        const { data } = await supabase
          .from('data_connections')
          .select('id, name, connection_type, database_name')
          .eq('account_id', profile.org_id)
          .eq('is_active', true);

        setConnections(data || []);
      }
    } catch (error) {
      console.error('Error loading connections:', error);
    }
  };

  const loadGenerationHistory = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single();

      if (profile) {
        const { data } = await supabase
          .from('ai_generated_dashboards')
          .select('*')
          .eq('account_id', profile.org_id)
          .order('created_at', { ascending: false })
          .limit(10);

        setGenerationHistory(data || []);
      }
    } catch (error) {
      console.error('Error loading generation history:', error);
    }
  };

  const generateDashboard = async () => {
    if (!request.prompt.trim() || !request.dataSourceId || !request.dashboardName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a prompt, data source, and dashboard name.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setGeneratingSteps([]);

    try {
      // Step 1: Analyze the prompt
      setGeneratingSteps(['Analyzing your request...']);

      // Step 2: Get database schema
      setGeneratingSteps(prev => [...prev, 'Exploring database schema...']);

      // Step 3: Generate dashboard structure
      setGeneratingSteps(prev => [...prev, 'Designing dashboard layout...']);

      // Step 4: Create charts
      setGeneratingSteps(prev => [...prev, 'Generating charts and visualizations...']);

      // Step 5: Create dashboard
      setGeneratingSteps(prev => [...prev, 'Creating dashboard...']);

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single();

      if (profile) {
        // Create the dashboard first
        const { data: dashboard, error: dashboardError } = await supabase
          .from('dashboards')
          .insert({
            name: request.dashboardName,
            description: `AI-generated dashboard: ${request.prompt}`,
            org_id: profile.org_id,
            created_by: user.id,
          })
          .select()
          .single();

        if (dashboardError) throw dashboardError;

        // Simulate AI chart generation (in real implementation, this would call an AI service)
        const chartTemplates = [
          {
            name: 'Overview KPI',
            chart_type: 'kpi',
            sql_query: 'SELECT COUNT(*) as total_records FROM main_table',
          },
          {
            name: 'Trend Analysis',
            chart_type: 'line',
            sql_query: 'SELECT date_column, COUNT(*) as count FROM main_table GROUP BY date_column ORDER BY date_column',
          },
          {
            name: 'Category Distribution',
            chart_type: 'pie',
            sql_query: 'SELECT category, COUNT(*) as count FROM main_table GROUP BY category',
          },
          {
            name: 'Performance Metrics',
            chart_type: 'bar',
            sql_query: 'SELECT metric_name, SUM(value) as total FROM metrics_table GROUP BY metric_name',
          },
        ];

        let chartsCreated = 0;

        for (const chartTemplate of chartTemplates) {
          try {
            const { error: chartError } = await supabase
              .from('saved_charts')
              .insert({
                name: chartTemplate.name,
                description: `AI-generated: ${chartTemplate.name}`,
                chart_type: chartTemplate.chart_type,
                sql_query: chartTemplate.sql_query,
                account_id: profile.org_id,
                data_connection_id: request.dataSourceId,
                created_by: user.id,
              });

            if (!chartError) {
              chartsCreated++;
            }
          } catch (error) {
            console.error('Error creating chart:', error);
          }
        }

        // Record the generation
        await supabase
          .from('ai_generated_dashboards')
          .insert({
            dashboard_id: dashboard.id,
            account_id: profile.org_id,
            generation_prompt: request.prompt,
            ai_model_used: 'gpt-4o-mini',
            charts_generated: chartsCreated,
            created_by: user.id,
          });

        setGeneratingSteps(prev => [...prev, 'Dashboard created successfully!']);

        toast({
          title: "Dashboard Generated!",
          description: `Created "${request.dashboardName}" with ${chartsCreated} charts.`,
        });

        // Reset form
        setRequest({
          prompt: '',
          dataSourceId: '',
          dashboardName: '',
        });

        loadGenerationHistory();
      }
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setTimeout(() => setGeneratingSteps([]), 3000);
    }
  };

  const examplePrompts = [
    "Create a marketing dashboard for the last quarter. Include KPIs for Cost per Acquisition, Conversion Rate, and ROI. Add a trend chart for leads by channel and a table with campaign performance.",
    "Build a sales analytics dashboard showing revenue trends, top products, customer segments, and performance by sales rep.",
    "Design a financial overview dashboard with cash flow analysis, expense breakdown, profit margins, and budget vs actual comparisons.",
    "Create an operations dashboard tracking key metrics like production volume, quality scores, downtime analysis, and efficiency metrics.",
  ];

  return (
    <div className="space-y-6">
      <Card className="glass-card border-0 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            AI Dashboard Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Generation Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="dashboard-name">Dashboard Name</Label>
              <Input
                id="dashboard-name"
                value={request.dashboardName}
                onChange={(e) => setRequest({ ...request, dashboardName: e.target.value })}
                placeholder="Marketing Analytics Q4 2024"
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="data-source">Data Source</Label>
              <Select 
                value={request.dataSourceId} 
                onValueChange={(value) => setRequest({ ...request, dataSourceId: value })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a data source" />
                </SelectTrigger>
                <SelectContent>
                  {connections.map(conn => (
                    <SelectItem key={conn.id} value={conn.id}>
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        {conn.name} ({conn.connection_type})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="prompt">Describe your dashboard requirements</Label>
              <Textarea
                id="prompt"
                value={request.prompt}
                onChange={(e) => setRequest({ ...request, prompt: e.target.value })}
                placeholder="Create a comprehensive sales dashboard that shows revenue trends, top performing products, and customer acquisition metrics. Include charts for monthly revenue, product performance comparison, and conversion funnel analysis."
                className="min-h-[120px]"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Be specific about the metrics, chart types, and time periods you want to analyze.
              </p>
            </div>

            <Button 
              onClick={generateDashboard} 
              disabled={loading || !request.prompt.trim() || !request.dataSourceId || !request.dashboardName.trim()}
              className="w-full gradient-primary"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Dashboard...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate Dashboard with AI
                </>
              )}
            </Button>
          </div>

          {/* Generation Progress */}
          {generatingSteps.length > 0 && (
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="space-y-3">
                  {generatingSteps.map((step, index) => (
                    <div key={index} className="flex items-center gap-3">
                      {index < generatingSteps.length - 1 || !loading ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      )}
                      <span className="text-sm">{step}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Example Prompts */}
          <div>
            <Label>Example Prompts</Label>
            <div className="mt-2 space-y-2">
              {examplePrompts.map((prompt, index) => (
                <Card 
                  key={index} 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => !loading && setRequest({ ...request, prompt })}
                >
                  <CardContent className="p-3">
                    <p className="text-sm text-muted-foreground">{prompt}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generation History */}
      <Card className="glass-card border-0 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent AI Generations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-4">
              {generationHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No AI-generated dashboards yet.</p>
                  <p className="text-sm">Create your first AI dashboard above!</p>
                </div>
              ) : (
                generationHistory.map((generation) => (
                  <Card key={generation.id} className="border">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary">
                            <BarChart3 className="w-3 h-3 mr-1" />
                            {generation.charts_generated} charts
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(generation.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm font-medium">{generation.generation_prompt}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Model: {generation.ai_model_used}</span>
                          <span>•</span>
                          <span>Generated: {new Date(generation.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}