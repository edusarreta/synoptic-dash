import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EncryptPasswordRequest {
  password: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Security: Use a strong encryption key from environment
    const encryptionKey = Deno.env.get('DB_ENCRYPTION_KEY');
    if (!encryptionKey) {
      throw new Error('Encryption key not configured');
    }

    // Initialize Supabase client for auth
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { password }: EncryptPasswordRequest = await req.json();

    if (!password) {
      return new Response(
        JSON.stringify({ error: 'Password is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Simple encryption using crypto API (replace with proper encryption library in production)
    const encoder = new TextEncoder();
    const keyData = encoder.encode(encryptionKey);
    const passwordData = encoder.encode(password);

    // Create a simple encrypted version (base64 encoded for now)
    // In production, use proper AES encryption
    const encryptedPassword = btoa(password + '::' + encryptionKey.slice(0, 8));

    console.log(`Password encrypted for user ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        encryptedPassword: encryptedPassword
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Encryption error:', error);
    return new Response(
      JSON.stringify({ error: 'Encryption failed' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});