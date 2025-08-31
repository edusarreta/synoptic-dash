import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestRestConnectionRequest {
  org_id: string;
  workspace_id?: string;
  base_url: string;
  auth_type: 'none' | 'bearer' | 'header';
  auth_token?: string;
  headers_json?: string;
  test_path: string;
}

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

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const { org_id, base_url, auth_type, auth_token, headers_json, test_path }: TestRestConnectionRequest = await req.json();

    // Validate org membership
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (!profile || profile.org_id !== org_id) {
      return new Response(JSON.stringify({ error: 'Not authorized for this organization' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare request headers
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Synoptic-Dashboard/1.0'
    };

    // Add auth headers
    if (auth_type === 'bearer' && auth_token) {
      requestHeaders['Authorization'] = `Bearer ${auth_token}`;
    } else if (auth_type === 'header' && auth_token) {
      requestHeaders['X-API-Key'] = auth_token;
    }

    // Add custom headers from JSON
    if (headers_json) {
      try {
        const customHeaders = JSON.parse(headers_json);
        Object.assign(requestHeaders, customHeaders);
      } catch (e) {
        return new Response(JSON.stringify({ 
          ok: false, 
          error_code: 'INVALID_HEADERS',
          message: 'Invalid headers JSON format' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Make test request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const testUrl = `${base_url.replace(/\/$/, '')}${test_path.startsWith('/') ? test_path : `/${test_path}`}`;
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: requestHeaders,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return new Response(JSON.stringify({ 
          ok: false, 
          error_code: 'HTTP_ERROR',
          message: `HTTP ${response.status}: ${response.statusText}` 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const contentType = response.headers.get('content-type') || '';
      
      // Check if response is JSON
      if (!contentType.includes('application/json')) {
        return new Response(JSON.stringify({ 
          ok: false, 
          error_code: 'NON_JSON_RESPONSE',
          message: `Expected JSON response, got ${contentType}` 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Try to parse JSON
      const responseData = await response.json();
      const sampleLen = JSON.stringify(responseData).length;

      return new Response(JSON.stringify({ 
        ok: true, 
        contentType,
        sampleLen: sampleLen > 1000 ? '1000+' : sampleLen.toString(),
        message: 'Connection successful'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        return new Response(JSON.stringify({ 
          ok: false, 
          error_code: 'TIMEOUT',
          message: 'Request timed out after 10 seconds' 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ 
        ok: false, 
        error_code: 'NETWORK_ERROR',
        message: `Network error: ${fetchError.message}` 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('REST connection test error:', error);
    return new Response(JSON.stringify({ 
      ok: false, 
      error_code: 'INTERNAL_ERROR',
      message: 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});