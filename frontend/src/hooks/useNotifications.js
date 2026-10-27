import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { fcmAdapter } from '../modules/notifications/fcmAdapter';
import { pushTokenService } from '../services/pushTokenService';
import { supabase } from '../lib/supabase';

export const useNotifications = (user) => {
  useEffect(() => {
    console.log('[useNotifications] Hook triggered. User ID:', user?.id || 'No user yet');

    if (!user) return;

    const initPush = async () => {
      if (Capacitor.isNativePlatform()) {
        // --- NATIVE MOBILE PUSH HANDLING ---
        try {
          console.log('[useNotifications] Initializing Native Push Notifications...');

          // 1. Request OS permissions
          const permStatus = await PushNotifications.requestPermissions();
          if (permStatus.receive !== 'granted') {
            console.warn('[useNotifications] Push notification permission denied by user.');
            return;
          }

          // 2. Register with FCM via native OS bridge
          await PushNotifications.register();

          // 3. Listen for the native FCM token delivery
          PushNotifications.addListener('registration', async (token) => {
            console.log('[useNotifications] Native FCM Token received:', token.value);
            
            // Save to Supabase using your existing service
            await pushTokenService.saveToken(user.id, token.value, 'fcm');
            console.log('[useNotifications] Native FCM token saved to Supabase successfully.');
          });

          // 4. Handle registration errors
          PushNotifications.addListener('registrationError', (error) => {
            console.error('[useNotifications] Error on native push registration:', error);
          });

          // 5. Handle notification click actions (when user taps the notification)
          PushNotifications.addListener('pushNotificationActionPerformed', async (notification) => {
            console.log('[useNotifications] Push notification action performed (clicked):', notification);
            
            const data = notification.notification.data;
            if (data?.reminderId) {
              // Optional: Handle quick action if passed
              if (data?.action === 'MARK_COMPLETE' || data?.action === 'MARK_PAID') {
                await supabase
                  .from('reminders')
                  .update({ status: 'completed', updated_at: new Date().toISOString() })
                  .eq('id', data.reminderId);
              }
              // Route user straight to the reminder view inside the app
              window.location.replace(`/dashboard?reminderId=${data.reminderId}`);
            }
          });

        } catch (err) {
          console.error('[useNotifications] ERROR during native notification setup:', err);
        }

      } else {
        // --- WEB BROWSER PUSH HANDLING ---
        try {
          console.log('[useNotifications] 1. Requesting Web FCM permission & token...');
          const token = await fcmAdapter.requestPermissionAndGetToken();
          console.log('[useNotifications] 2. Web FCM Token received:', token);

          if (token) {
            console.log('[useNotifications] 3. Saving token to Supabase...');
            await pushTokenService.saveToken(user.id, token, 'fcm');
            console.log('[useNotifications] 4. SUCCESS! Token saved to user_push_tokens table.');
          }
        } catch (err) {
          console.error('[useNotifications] ERROR during web notification setup:', err);
        }
      }
    };

    initPush();
  }, [user?.id]);
};