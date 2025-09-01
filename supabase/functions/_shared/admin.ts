import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1";

/**
 * Create admin Supabase client with service role key
 * Returns client with full database access bypassing RLS
 */
export function adminClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SERVICE_ROLE_MISSING: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in environment');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Standard CORS headers for all edge functions
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Handle CORS preflight requests
 */
export function handleCORS(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}

/**
 * Create error response with CORS headers
 */
export function errorResponse(message: string, status: number = 500, code?: string) {
  return new Response(
    JSON.stringify({ 
      ok: false, 
      success: false, 
      message, 
      ...(code && { code })
    }),
    { 
      status, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

/**
 * Create success response with CORS headers
 */
export function successResponse(data: any, status: number = 200) {
  return new Response(
    JSON.stringify({ 
      ok: true, 
      success: true, 
      ...data 
    }),
    { 
      status, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}