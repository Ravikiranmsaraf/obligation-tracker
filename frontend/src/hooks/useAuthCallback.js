// src/hooks/useAuthCallback.js
import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { supabase } from '../lib/supabase';

export function useAuthCallback() {
  useEffect(() => {
    const handleDeepLink = async (event) => {
      const url = new URL(event.url);

      // Only handle our auth callback
      if (url.hostname !== 'auth' || url.pathname !== '/callback') {
        return;
      }

      // Supabase returns tokens in the hash for custom schemes
      const hashParams = new URLSearchParams(url.hash.slice(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (!accessToken || !refreshToken) {
        return;
      }

      try {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        // Optional: you could navigate here if you add a router dependency later
      } catch (err) {
        console.error('Error setting session from deep link:', err);
      }
    };

    const listener = App.addListener('appUrlOpen', handleDeepLink);

    return () => {
      listener.then((l) => l.remove());
    };
  }, []);
}