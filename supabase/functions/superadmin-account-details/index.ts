import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the JWT token and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is super admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_super_admin) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions. Super Admin access required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse URL to extract account ID
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const accountId = pathParts[pathParts.length - 1]; // Get account ID from end of path

    if (!accountId) {
      return new Response(
        JSON.stringify({ error: 'Account ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'GET') {
      // Get detailed account information
      const { data: account, error: accountError } = await supabase
        .from('accounts')
        .select(`
          id,
          name,
          slug,
          status,
          created_at,
          suspended_at,
          suspended_by,
          subscriptions(
            id,
            status,
            plan_type,
            current_period_start,
            current_period_end,
            trial_end,
            stripe_customer_id,
            stripe_subscription_id
          )
        `)
        .eq('id', accountId)
        .single();

      if (accountError) {
        console.error('Error fetching account:', accountError);
        return new Response(
          JSON.stringify({ error: 'Account not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get all users in this account
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          role,
          created_at
        `)
        .eq('account_id', accountId)
        .order('created_at', { ascending: true });

      if (usersError) {
        console.error('Error fetching users:', usersError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch account users' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get usage statistics
      const { data: dashboardCount } = await supabase
        .from('dashboards')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', accountId);

      const { data: dataConnectionCount } = await supabase
        .from('data_connections')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', accountId);

      const { data: chartCount } = await supabase
        .from('saved_charts')
        .select('*', { count: 'exact', head: true })
        .eq('account_id', accountId);

      // Get recent audit logs for this account
      const { data: auditLogs, error: auditError } = await supabase
        .from('audit_logs')
        .select(`
          id,
          action,
          resource_type,
          created_at,
          metadata,
          user_id
        `)
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (auditError) {
        console.error('Error fetching audit logs:', auditError);
      }

      // Transform the response
      const accountDetails = {
        id: account.id,
        name: account.name,
        slug: account.slug,
        status: account.status,
        createdAt: account.created_at,
        suspendedAt: account.suspended_at,
        suspendedBy: account.suspended_by,
        subscription: account.subscriptions?.[0] ? {
          id: account.subscriptions[0].id,
          status: account.subscriptions[0].status,
          plan: account.subscriptions[0].plan_type,
          currentPeriodStart: account.subscriptions[0].current_period_start,
          currentPeriodEnd: account.subscriptions[0].current_period_end,
          trialEnd: account.subscriptions[0].trial_end,
          stripeCustomerId: account.subscriptions[0].stripe_customer_id,
          stripeSubscriptionId: account.subscriptions[0].stripe_subscription_id
        } : null,
        users: users?.map(user => ({
          id: user.id,
          name: user.full_name || 'Unknown',
          email: user.email,
          role: user.role,
          joinedAt: user.created_at
        })) || [],
        usage: {
          dashboards: dashboardCount?.count || 0,
          dataConnections: dataConnectionCount?.count || 0,
          charts: chartCount?.count || 0
        },
        recentActivity: auditLogs?.map(log => ({
          id: log.id,
          action: log.action,
          resourceType: log.resource_type,
          timestamp: log.created_at,
          metadata: log.metadata,
          userId: log.user_id
        })) || []
      };

      return new Response(
        JSON.stringify(accountDetails),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in superadmin-account-details function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});