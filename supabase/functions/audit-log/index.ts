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

    const { action, resourceType, resourceId, metadata } = await req.json();
    
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

    // Get client IP and user agent from headers
    const clientIP = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Create audit log entry
    const { error: logError } = await supabase
      .from('audit_logs')
      .insert({
        account_id: profile.account_id,
        user_id: user.id,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        metadata: metadata || {},
        ip_address: clientIP,
        user_agent: userAgent
      });

    if (logError) {
      console.error('Error creating audit log:', logError);
      throw new Error('Failed to create audit log');
    }

    console.log('Audit log created:', { action, resourceType, resourceId, user: user.email });

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Audit log created successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in audit-log function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An unexpected error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});