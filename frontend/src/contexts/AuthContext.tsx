import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  const handleAuthDeepLink = async (url: string) => {
  if (!url.startsWith('com.ravikiran.settld://auth/callback')) {
    return;
  }

  const parsedUrl = new URL(url);
  const params = new URLSearchParams(
    parsedUrl.hash.startsWith('#')
      ? parsedUrl.hash.substring(1)
      : parsedUrl.search.substring(1)
  );

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (!accessToken || !refreshToken) {
    console.error('OAuth callback did not include session tokens');
    return;
  }

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    console.error('Unable to restore mobile OAuth session:', error.message);
  }
  };
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });
    let appUrlListener: Awaited<ReturnType<typeof App.addListener>> | undefined;

    if (Capacitor.isNativePlatform()) {
      App.addListener('appUrlOpen', ({ url }) => {
        void handleAuthDeepLink(url);
      }).then((listener) => {
        appUrlListener = listener;
      });
    }

  return () => {
  subscription.unsubscribe();
  void appUrlListener?.remove();
  };
  }, []);

  const signInWithGoogle = async () => {
  const redirectTo = Capacitor.isNativePlatform()
    ? 'com.ravikiran.settld://auth/callback'
    : window.location.origin;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: Capacitor.isNativePlatform(),
    },
  });

  if (error) {
    console.error('Google sign-in failed:', error.message);
    return;
  }

  if (Capacitor.isNativePlatform() && data?.url) {
    await Browser.open({ url: data.url });
  }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}