"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, ensureAdminSession } from '@/lib/supabaseClient';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<Session | null>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
  refreshSession: async () => null,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshSession = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return null;
    }
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      let activeSession = currentSession;
      if (!activeSession) {
        activeSession = await ensureAdminSession();
      }
      setSession(activeSession);
      setUser(activeSession?.user ?? null);
      return activeSession;
    } catch (err) {
      console.error('Error refreshing auth session:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      if (isSupabaseConfigured && supabase) {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        console.log("CURRENT SESSION:", initialSession);
        if (initialSession) {
          console.log("CURRENT USER ID (auth.uid()):", initialSession.user?.id);
        }

        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          setLoading(false);
        }
      } else {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    if (isSupabaseConfigured && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
        if (mounted) {
          console.log("AUTH STATE CHANGED SESSION:", newSession);
          setSession(newSession);
          setUser(newSession?.user ?? null);
          setLoading(false);
        }
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    }
  }, []);

  const signOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
