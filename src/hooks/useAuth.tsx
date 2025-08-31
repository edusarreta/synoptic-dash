import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { UserProfile } from '@/modules/core/types';

interface AuthContextType {
  user: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, accountName: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ 
  children 
}: { 
  children: (user: UserProfile | null, loading: boolean) => ReactNode;
}) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        
        if (session?.user) {
          try {
            // Fetch user profile with organization info
            const { data: profile, error } = await supabase
              .from('profiles')
              .select(`
                *,
                organizations:org_id (
                  id,
                  name,
                  slug,
                  status,
                  plan_type
                )
              `)
              .eq('id', session.user.id)
              .single();

            if (error) {
              console.error('Error fetching user profile:', error);
              setUser(null);
            } else if (profile) {
              setUser({
                id: profile.id,
                email: profile.email,
                full_name: profile.full_name,
                role: profile.role as 'MASTER' | 'ADMIN' | 'EDITOR' | 'VIEWER',
                org_id: profile.org_id,
                permissions: profile.permissions || [],
                is_active: profile.is_active
              });
            }
          } catch (error) {
            console.error('Error processing user profile:', error);
            setUser(null);
          }
        } else {
          setUser(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Trigger the auth state change handler
        setSession(session);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string, accountName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          account_name: accountName,
        }
      }
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children(user, loading)}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}