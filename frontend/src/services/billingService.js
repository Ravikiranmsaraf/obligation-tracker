// src/services/billingService.js
import { supabase } from '../lib/supabase';

export const billingService = {
  // Simulate purchase or trigger Google Play billing bridge later
  async purchasePro(userId, planType = 'monthly') {
    try {
      // MOCK STUB: In production Android app, this will call CapacitorGooglePlayBilling.purchase()
      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_status: 'active',
          subscription_plan: planType,
          subscription_gateway: 'mock', // Will become 'google_play' later
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Billing purchase error:', err);
      return { success: false, error: err.message };
    }
  },

  // Check or restore purchases (useful for Android app startup / settings)
  async restorePurchases(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_status, subscription_plan')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      return { success: true, isPro: data?.subscription_status === 'active' };
    } catch (err) {
      console.error('Restore purchases error:', err);
      return { success: false, error: err.message };
    }
  }
};