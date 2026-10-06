import { useEffect } from 'react';
import { fcmAdapter } from '../modules/notifications/fcmAdapter';
import { pushTokenService } from '../services/pushTokenService';

export const useNotifications = (user) => {
  useEffect(() => {
    console.log('[useNotifications] Hook triggered. User ID:', user?.id || 'No user yet');

    if (!user) return;

    const initPush = async () => {
      try {
        console.log('[useNotifications] 1. Requesting FCM permission & token...');
        const token = await fcmAdapter.requestPermissionAndGetToken();
        console.log('[useNotifications] 2. FCM Token received:', token);

        if (token) {
          console.log('[useNotifications] 3. Saving token to Supabase...');
          await pushTokenService.saveToken(user.id, token, 'fcm');
          console.log('[useNotifications] 4. SUCCESS! Token saved to user_push_tokens table.');
        }
      } catch (err) {
        console.error('[useNotifications] ERROR during notification setup:', err);
      }
    };

    initPush();
  }, [user?.id]); // Triggers automatically as soon as Supabase resolves user.id
};