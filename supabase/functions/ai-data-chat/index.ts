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

    const { question, connectionId } = await req.json();
    console.log('AI Chat request:', { question, connectionId });

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

    // Get current usage for AI queries
    const { data: usage } = await supabase
      .from('usage_tracking')
      .select('metric_value')
      .eq('account_id', profile.account_id)
      .eq('metric_name', 'ai_queries')
      .gte('period_start', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
      .single();

    const currentUsage = usage?.metric_value || 0;
    const aiQueriesLimit = Math.floor(limits.monthly_queries_limit * 0.1); // 10% of queries for AI

    if (currentUsage >= aiQueriesLimit) {
      throw new Error('AI queries limit reached for this month');
    }

    // Get data connection details
    const { data: connection } = await supabase
      .from('data_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('account_id', profile.account_id)
      .single();

    if (!connection) {
      throw new Error('Data connection not found');
    }

    // Build context about the database schema
    const schemaContext = `
Database Type: ${connection.connection_type}
Database Name: ${connection.database_name}
Connection Name: ${connection.name}

You are helping a user query their ${connection.connection_type} database.
Generate only the SQL query without explanations or markdown formatting.
Make sure the query is safe and does not modify data (only SELECT statements).
`;

    // Call OpenAI to convert question to SQL
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
            content: schemaContext
          },
          {
            role: 'user',
            content: `Convert this question to SQL: ${question}`
          }
        ],
        max_tokens: 500,
        temperature: 0.1,
      }),
    });

    if (!openAIResponse.ok) {
      throw new Error(`OpenAI API error: ${openAIResponse.statusText}`);
    }

    const openAIData = await openAIResponse.json();
    const sqlQuery = openAIData.choices[0].message.content.trim();

    console.log('Generated SQL:', sqlQuery);

    // Validate that it's a SELECT query
    if (!sqlQuery.toLowerCase().trim().startsWith('select')) {
      throw new Error('Only SELECT queries are allowed');
    }

    // Update usage tracking
    const newUsage = currentUsage + 1;
    await supabase
      .from('usage_tracking')
      .upsert({
        account_id: profile.account_id,
        metric_name: 'ai_queries',
        metric_value: newUsage,
        period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
        period_end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString(),
      });

    return new Response(JSON.stringify({
      sqlQuery,
      explanation: `Generated SQL query for: "${question}"`,
      creditsUsed: 1,
      remainingCredits: aiQueriesLimit - newUsage
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-data-chat:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An unexpected error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});