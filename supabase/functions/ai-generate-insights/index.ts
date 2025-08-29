import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { dashboardId, chartData } = await req.json();
    console.log('AI Insights request:', { dashboardId, chartDataLength: chartData?.length });

    // Get user from auth token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    // Get user profile and account
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      throw new Error('Profile not found');
    }

    // Check subscription and credits
    const { data: limits } = await supabase
      .rpc('check_subscription_status', { account_uuid: profile.account_id })
      .single();

    if (!limits || !limits.is_active) {
      throw new Error('Active subscription required');
    }

    // Get current usage for AI insights
    const { data: usage } = await supabase
      .from('usage_tracking')
      .select('metric_value')
      .eq('account_id', profile.account_id)
      .eq('metric_name', 'ai_insights')
      .gte('period_start', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
      .single();

    const currentUsage = usage?.metric_value || 0;
    const aiInsightsLimit = Math.floor(limits.monthly_queries_limit * 0.05); // 5% of queries for insights

    if (currentUsage >= aiInsightsLimit) {
      throw new Error('AI insights limit reached for this month');
    }

    // Get dashboard info
    const { data: dashboard } = await supabase
      .from('dashboards')
      .select('name, description')
      .eq('id', dashboardId)
      .eq('account_id', profile.account_id)
      .single();

    if (!dashboard) {
      throw new Error('Dashboard not found');
    }

    // Build context for insights generation
    const dataContext = chartData.map((chart: any) => ({
      name: chart.name,
      type: chart.type,
      data: chart.data,
      description: chart.description
    }));

    const insightsPrompt = `
Analyze the following dashboard data and provide business insights:

Dashboard: ${dashboard.name}
${dashboard.description ? `Description: ${dashboard.description}` : ''}

Chart Data:
${JSON.stringify(dataContext, null, 2)}

Please provide:
1. Executive Summary (2-3 sentences)
2. Key Trends (3-5 bullet points)
3. Notable Patterns or Anomalies (2-3 bullet points)
4. Recommendations (2-3 actionable items)

Keep the analysis professional and business-focused.
`;

    // Call OpenAI for insights generation
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a business intelligence analyst specializing in data interpretation and insights generation.'
          },
          {
            role: 'user',
            content: insightsPrompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!openAIResponse.ok) {
      throw new Error(`OpenAI API error: ${openAIResponse.statusText}`);
    }

    const openAIData = await openAIResponse.json();
    const insights = openAIData.choices[0].message.content;

    console.log('Generated insights for dashboard:', dashboardId);

    // Update usage tracking
    const newUsage = currentUsage + 1;
    await supabase
      .from('usage_tracking')
      .upsert({
        account_id: profile.account_id,
        metric_name: 'ai_insights',
        metric_value: newUsage,
        period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
        period_end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString(),
      });

    return new Response(JSON.stringify({
      insights,
      creditsUsed: 1,
      remainingCredits: aiInsightsLimit - newUsage,
      generatedAt: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-generate-insights:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An unexpected error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});