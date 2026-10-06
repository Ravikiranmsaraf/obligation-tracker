import { getToken, onMessage } from 'firebase/messaging';
import { messaging, VAPID_KEY } from '../../lib/firebase';

export const fcmAdapter = {
  async requestPermissionAndGetToken() {
    if (!('Notification' in window)) {
      throw new Error('This browser does not support web push notifications.');
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission denied.');
    }

    // Register service worker explicitly from public/
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    await navigator.serviceWorker.ready;

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    return token;
  },

  onForegroundMessage(callback) {
    if (!messaging) return () => {};
    return onMessage(messaging, (payload) => {
      callback({
        title: payload.notification?.title || 'Wraprio Alert',
        body: payload.notification?.body || '',
        icon: payload.notification?.icon || '/pwa-192x192.png',
        rawPayload: payload
      });
    });
  }
};