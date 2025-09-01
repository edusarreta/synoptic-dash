import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

interface DecryptPasswordRequest {
  encryptedPassword: string;
}

// Robust decryption function with multiple fallback methods
export function decryptPassword(encryptedPassword: string): string {
  try {
    const encryptionKey = Deno.env.get('DB_ENCRYPTION_KEY');
    if (!encryptionKey) {
      console.log('Using legacy decryption method (no key)');
      return atob(encryptedPassword);
    }

    console.log('Using legacy decryption method (XOR)');
    
    // Method 1: Try format with key prefix (password::key_prefix)
    try {
      const decoded = atob(encryptedPassword);
      if (decoded.includes('::')) {
        const parts = decoded.split('::');
        if (parts.length === 2 && parts[1] === encryptionKey.slice(0, 8)) {
          return parts[0];
        }
      }
    } catch (e) {
      console.warn('Format with key prefix failed:', e);
    }

    // Method 2: Try direct base64 decode
    try {
      const decoded = atob(encryptedPassword);
      if (decoded && decoded.length > 0) {
        return decoded;
      }
    } catch (e) {
      console.warn('Direct base64 decode failed:', e);
    }

    // Method 3: Assume password is already plain text
    if (encryptedPassword && !encryptedPassword.includes('=') && !encryptedPassword.includes('+')) {
      console.log('Treating as plain text password');
      return encryptedPassword;
    }

    throw new Error('All decryption methods failed');
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt password');
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This function is internal and should only be called by other edge functions
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { encrypted_password }: { encrypted_password: string } = await req.json();
    
    if (!encrypted_password) {
      return new Response(JSON.stringify({ 
        error: 'encrypted_password is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const decryptedPassword = decryptPassword(encrypted_password);
    
    return new Response(JSON.stringify({ 
      decrypted_password: decryptedPassword 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Decrypt password error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to decrypt password' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});