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

    async function checkOnboardingStatus() {
      try {
        // 1. Check if the user has any reminders in the obligations table
        const { count, error: countError } = await supabase
          .from('obligations')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId);

        if (countError) throw countError;

        // If they have 0 obligations, they definitely need onboarding
        if (count === 0) {
          setNeedsOnboarding(true);
          setLoading(false);
          return;
        }

        // 2. Fallback check: verify if their profile is missing key setup data (like phone number)
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('phone_number')
          .eq('id', userId)
          .maybeSingle();

        if (profileError) throw profileError;

        if (!profileData || !profileData.phone_number) {
          setNeedsOnboarding(true);
        } else {
          setNeedsOnboarding(false);
        }
      } catch (err) {
        console.error('Error checking onboarding status:', err);
        setNeedsOnboarding(true); // Fallback to wizard on error
      } finally {
        setLoading(false);
      }
    }

    checkOnboardingStatus();
  }, [userId]);

  const completeOnboarding = () => {
    setNeedsOnboarding(false);
  };

  return { needsOnboarding, loading, completeOnboarding };
}