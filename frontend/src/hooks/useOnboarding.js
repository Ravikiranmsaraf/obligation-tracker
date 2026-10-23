// src/hooks/useOnboarding.js
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useOnboarding(userId) {
  const [needsOnboarding, setNeedsOnboarding] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    async function checkProfile() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('phone_number, theme_preference, currency_symbol')
          .eq('id', userId)
          .maybeSingle();

        if (error) throw error;

        // If profile doesn't exist or phone_number is missing/empty, trigger onboarding wizard
        if (!data || !data.phone_number) {
          setNeedsOnboarding(true);
        } else {
          setNeedsOnboarding(false);
        }
      } catch (err) {
        console.error('Error checking onboarding profile:', err);
        setNeedsOnboarding(true); // Fallback to wizard on error
      } finally {
        setLoading(false);
      }
    }

    checkProfile();
  }, [userId]);

  const completeOnboarding = () => {
    setNeedsOnboarding(false);
  };

  return { needsOnboarding, loading, completeOnboarding };
}