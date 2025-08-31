import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = "https://wioxxtyaxfvgnexuslky.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indpb3h4dHlheGZ2Z25leHVzbGt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1NTU4OTAsImV4cCI6MjA2MjEzMTg5MH0.MBy2zyLPBfIqkbEIdpepd9HYt1TK22UzVU8MaHGMlK8";

export const createBrowserClient = () => {
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    }
  });
};

// Safe singleton for frontend use
export const supabase = createBrowserClient();

// Auth state change listener setup
let authStateListener: any = null;

export const setupAuthListener = (callback: (event: string, session: any) => void) => {
  if (authStateListener) {
    authStateListener.subscription?.unsubscribe();
  }
  
  authStateListener = supabase.auth.onAuthStateChange(callback);
  return authStateListener;
};