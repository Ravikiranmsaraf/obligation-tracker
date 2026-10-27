import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Turn off automatic URL session detection on native mobile so it doesn't fight
    // with the custom appUrlOpen scheme listener. Keep it true for web.
    detectSessionInUrl: !Capacitor.isNativePlatform(),
  },
});

// Manage session refresh state during native app lifecycle (foregrounding/backgrounding)
if (Capacitor.isNativePlatform()) {
  CapApp.addListener('appStateChange', async (state) => {
    if (state.isActive) {
      await supabase.auth.startAutoRefresh();
    } else {
      await supabase.auth.stopAutoRefresh();
    }
  });
}

export default supabase;