// src/hooks/useSubscription.js
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useSubscription(userId) {
  const [subscription, setSubscription] = useState({
    isPro: false,
    status: 'free',
    plan: null,
    gateway: 'mock',
    loading: true
  });

  useEffect(() => {
    if (!userId) {
      setSubscription(prev => ({ ...prev, loading: false }));
      return;
    }

    async function fetchSubscription() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('subscription_status, subscription_plan, subscription_gateway')
          .eq('id', userId)
          .maybeSingle();

        if (error) throw error;

        const isProActive = data?.subscription_status === 'active';
        setSubscription({
          isPro: isProActive,
          status: data?.subscription_status || 'free',
          plan: data?.subscription_plan || null,
          gateway: data?.subscription_gateway || 'mock',
          loading: false
        });
      } catch (err) {
        console.error('Error fetching subscription:', err);
        setSubscription(prev => ({ ...prev, loading: false }));
      }
    }

    fetchSubscription();
  }, [userId]);

  // DEV MOCK TOGGLE: Allows you to instantly flip Pro status on/off for testing paywalls
  const toggleMockPro = async () => {
    const newStatus = !subscription.isPro;
    const newDbStatus = newStatus ? 'active' : 'free';
    
    // Optimistic UI update
    setSubscription(prev => ({
      ...prev,
      isPro: newStatus,
      status: newDbStatus,
      plan: newStatus ? 'monthly' : null
    }));

    // Persist mock change to Supabase profiles table
    if (userId) {
      await supabase
        .from('profiles')
        .update({ 
          subscription_status: newDbStatus,
          subscription_plan: newStatus ? 'monthly' : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
    }
  };

  return { subscription, toggleMockPro };
}