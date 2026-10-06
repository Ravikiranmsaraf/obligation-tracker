import { supabase } from '../lib/supabase.ts';

export const pushTokenService = {
  async saveToken(userId, token, channel = 'fcm') {
    const deviceType = navigator.userAgent.includes('Mobile') ? 'mobile_web' : 'desktop_web';
    
    const { data, error } = await supabase
      .from('user_push_tokens')
      .upsert({
        user_id: userId,
        fcm_token: token,
        device_type: deviceType,
        updated_at: new Date().toISOString()
      }, { onConflict: 'fcm_token' });

    if (error) throw error;
    return data;
  },

  async deleteToken(token) {
    const { error } = await supabase
      .from('user_push_tokens')
      .delete()
      .eq('fcm_token', token);

    if (error) throw error;
  }
};