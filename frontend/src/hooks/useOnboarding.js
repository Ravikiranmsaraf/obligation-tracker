import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.ts';

export function useOnboarding(userId) {
  const [needsOnboarding, setNeedsOnboarding] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkStatus() {
      if (!userId) return;

      try {
        // Query database to see if user has active obligations
        const { count, error } = await supabase
          .from('obligations')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId);

        if (error) throw error;

        if (count === 0) {
          // Zero obligations found: reset local storage and trigger onboarding
          localStorage.removeItem(`onboarding_completed_${userId}`);
          setNeedsOnboarding(true);
        } else {
          // User has obligations: set flag and bypass wizard
          localStorage.setItem(`onboarding_completed_${userId}`, 'true');
          setNeedsOnboarding(false);
        }
      } catch (err) {
        console.error('Error checking onboarding status:', err);
        // Fallback to local storage on network error
        const completed = localStorage.getItem(`onboarding_completed_${userId}`);
        setNeedsOnboarding(completed !== 'true');
      } finally {
        setLoading(false);
      }
    }

    checkStatus();
  }, [userId]);

  const completeOnboarding = () => {
    if (userId) {
      localStorage.setItem(`onboarding_completed_${userId}`, 'true');
    }
    setNeedsOnboarding(false);
  };

  return { needsOnboarding, loading, completeOnboarding };
}