import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { fcmAdapter } from '../modules/notifications/fcmAdapter';
import { pushTokenService } from '../services/pushTokenService';
import { obligationsService } from '../services/obligationsService';
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
            await pushTokenService.saveToken(user.id, token.value, 'fcm');
            console.log('[useNotifications] Native FCM token saved to Supabase successfully.');
          });

          // 4. Handle registration errors
          PushNotifications.addListener('registrationError', (error) => {
            console.error('[useNotifications] Error on native push registration:', error);
          });

          // 5. Handle notification click / action button performed
          PushNotifications.addListener('pushNotificationActionPerformed', async (notification) => {
            console.log('[useNotifications] Push notification action performed:', notification);
            
            const data = notification.notification.data;
            const reminderId = data?.reminderId;
            const actionType = data?.action;

            if (reminderId) {
              try {
                if (actionType === 'MARK_COMPLETE' || actionType === 'MARK_PAID') {
                  await supabase
                    .from('obligation_cycles')
                    .update({ status: 'paid', paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
                    .eq('id', reminderId)
                    .eq('user_id', user.id);
                } else if (actionType === 'SKIP_TODAY') {
                  await obligationsService.deferCycle(reminderId, { type: 'skip' }, user.id);
                } else if (actionType === 'PLUS_1H') {
                  await obligationsService.deferCycle(reminderId, { type: 'snooze', hours: 1 }, user.id);
                } else if (actionType === 'PLUS_1D') {
                  await obligationsService.deferCycle(reminderId, { type: 'snooze', days: 1 }, user.id);
                } else if (actionType === 'TOMORROW_9AM') {
                  await obligationsService.deferCycle(reminderId, { type: 'snooze', target: 'tomorrow_9am' }, user.id);
                }
              } catch (err) {
                console.error('[useNotifications] Error handling background tray action:', err);
              }

              // Route user straight to home view with modal pre-loaded
              window.location.replace(`/?reminderId=${reminderId}`);
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