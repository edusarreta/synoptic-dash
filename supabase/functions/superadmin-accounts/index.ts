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

    // Parse URL to get action and parameters
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // Extract search parameter for filtering
    const searchQuery = url.searchParams.get('search') || '';

    // Handle different endpoints
    if (req.method === 'GET') {
      // GET /api/superadmin/accounts
      let query = supabase
        .from('accounts')
        .select(`
          id,
          name,
          slug,
          status,
          created_at,
          suspended_at,
          suspended_by,
          profiles!inner(
            id,
            full_name,
            email,
            role,
            created_at
          ),
          subscriptions(
            id,
            status,
            plan_type,
            current_period_start,
            current_period_end,
            trial_end
          )
        `);

      // Apply search filter if provided
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,profiles.email.ilike.%${searchQuery}%,profiles.full_name.ilike.%${searchQuery}%`);
      }

      const { data: accounts, error: accountsError } = await query
        .order('created_at', { ascending: false });

      if (accountsError) {
        console.error('Error fetching accounts:', accountsError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch accounts' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Transform the data to match expected structure
      const transformedAccounts = accounts.map(account => ({
        id: account.id,
        name: account.name,
        slug: account.slug,
        status: account.status,
        createdAt: account.created_at,
        suspendedAt: account.suspended_at,
        suspendedBy: account.suspended_by,
        adminUser: {
          id: account.profiles?.[0]?.id,
          name: account.profiles?.[0]?.full_name || 'Unknown',
          email: account.profiles?.[0]?.email || 'Unknown',
          role: account.profiles?.[0]?.role,
          joinedAt: account.profiles?.[0]?.created_at
        },
        subscription: account.subscriptions?.[0] ? {
          status: account.subscriptions[0].status,
          plan: account.subscriptions[0].plan_type,
          billingCycle: 'monthly', // Default assumption
          nextBilling: account.subscriptions[0].current_period_end,
          trialEnd: account.subscriptions[0].trial_end
        } : null,
        // Count users (we'll get this in a separate query for better performance)
        userCount: 1 // Default to at least 1 (the admin)
      }));

      // Get user counts for each account
      for (const account of transformedAccounts) {
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('account_id', account.id);
        
        account.userCount = count || 1;
      }

      return new Response(
        JSON.stringify(transformedAccounts),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in superadmin-accounts function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});