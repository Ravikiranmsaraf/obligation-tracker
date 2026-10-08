import { useEffect, useState } from 'react';
import supabase from '../lib/supabase';

export function useOnboarding(userId) {
  const [needsOnboarding, setNeedsOnboarding] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function checkStatus() {
      if (!userId) {
        if (!cancelled) {
          setNeedsOnboarding(false);
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      try {
        const { count, error } = await supabase
          .from('obligations')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_active', true);

        if (error) throw error;

        const needsSetup = (count || 0) === 0;
        if (!cancelled) {
          setNeedsOnboarding(needsSetup);
          if (needsSetup) localStorage.removeItem(`onboarding_completed_${userId}`);
          else localStorage.setItem(`onboarding_completed_${userId}`, 'true');
        }
      } catch (error) {
        console.error('Could not check onboarding status:', error);
        if (!cancelled) {
          setNeedsOnboarding(localStorage.getItem(`onboarding_completed_${userId}`) !== 'true');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    checkStatus();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const completeOnboarding = async () => {
    if (!userId) throw new Error('You must be signed in.');
    localStorage.setItem(`onboarding_completed_${userId}`, 'true');
    setNeedsOnboarding(false);
  };

  return { needsOnboarding, loading, completeOnboarding };
}
