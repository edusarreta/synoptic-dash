import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TestRestConnectionRequest {
  org_id: string;
  base_url: string;
  auth_type: 'anon' | 'service' | 'bearer' | 'header';
  auth_token?: string;
  headers?: string;
  test_path?: string;
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

    // Get the user from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid authorization' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const requestBody: TestRestConnectionRequest = await req.json();
    const { org_id, base_url, auth_type, auth_token, headers, test_path } = requestBody;

    // Validate user's organization membership
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.org_id !== org_id) {
      return new Response(
        JSON.stringify({ success: false, message: 'Access denied' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Prepare request headers
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add authentication based on type
    switch (auth_type) {
      case 'anon':
      case 'service':
        if (auth_token) {
          requestHeaders['apikey'] = auth_token;
          requestHeaders['Authorization'] = `Bearer ${auth_token}`;
        }
        break;
      case 'bearer':
        if (auth_token) {
          requestHeaders['Authorization'] = `Bearer ${auth_token}`;
        }
        break;
      case 'header':
        if (headers) {
          try {
            const customHeaders = JSON.parse(headers);
            Object.assign(requestHeaders, customHeaders);
          } catch (e) {
            return new Response(
              JSON.stringify({ success: false, message: 'Invalid headers JSON' }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          }
        }
        break;
    }

    // Build test URL
    const testUrl = test_path ? `${base_url.replace(/\/$/, '')}/${test_path.replace(/^\//, '')}` : base_url;

    console.log(`Testing REST API connection to: ${testUrl}`);

    // Test the connection with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: requestHeaders,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check if response is successful
      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        const isJson = contentType.includes('application/json');
        
        let sampleData = null;
        if (isJson) {
          const data = await response.text();
          sampleData = data.length > 200 ? data.substring(0, 200) + '...' : data;
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: `Conexão bem-sucedida! Status: ${response.status}`,
            status_code: response.status,
            content_type: contentType,
            sample_data_length: sampleData?.length || 0
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      } else {
        return new Response(
          JSON.stringify({
            success: false,
            message: `Erro HTTP: ${response.status} - ${response.statusText}`,
            status_code: response.status
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Timeout: A conexão demorou mais de 10 segundos para responder'
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          message: `Erro de rede: ${fetchError.message}`
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error: any) {
    console.error('Error testing REST connection:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: `Erro interno: ${error.message}`
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});