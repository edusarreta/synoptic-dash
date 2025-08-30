import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

interface DecryptPasswordRequest {
  encryptedPassword: string;
}

// Internal function for decrypting passwords (not exposed as public endpoint)
export function decryptPassword(encryptedPassword: string): string {
  try {
    const encryptionKey = Deno.env.get('DB_ENCRYPTION_KEY');
    if (!encryptionKey) {
      throw new Error('Encryption key not configured');
    }

    // Simple decryption matching the encryption function
    const decoded = atob(encryptedPassword);
    const parts = decoded.split('::');
    
    if (parts.length !== 2 || parts[1] !== encryptionKey.slice(0, 8)) {
      throw new Error('Invalid encrypted password format');
    }

    return parts[0];
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt password');
  }
}

// This function should not be exposed as a public endpoint for security
serve(async (req) => {
  return new Response(
    JSON.stringify({ error: 'This endpoint is not available' }),
    { 
      status: 404, 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
});