importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyADaPeBRIF0V8zfTr3RmzGBevuhmNRjDg4",
  authDomain: "obligation-tracker-19de9.firebaseapp.com",
  projectId: "obligation-tracker-19de9",
  storageBucket: "obligation-tracker-19de9.firebasestorage.app",
  messagingSenderId: "894777437404",
  appId: "1:894777437404:web:44500f1b6bd450d0879819"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[Wraprio SW] Background Notification:', payload);
  const notificationTitle = payload.notification?.title || 'Wraprio Alert';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: payload.notification?.icon || '/pwa-192x192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});