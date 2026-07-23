/* global importScripts, firebase, self, clients */
// Firebase Messaging Service Worker.
// Config is passed via URL query params by src/lib/firebaseMessaging.ts so this
// file stays generic and does not embed secrets at build time.

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

const params = new URL(self.location.href).searchParams;
const firebaseConfig = {
  apiKey: params.get('apiKey') || '',
  authDomain: `${params.get('projectId') || ''}.firebaseapp.com`,
  projectId: params.get('projectId') || '',
  messagingSenderId: params.get('senderId') || '',
  appId: params.get('appId') || '',
};

try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title = (payload.notification && payload.notification.title) || (payload.data && payload.data.title) || 'Notification';
    const body = (payload.notification && payload.notification.body) || (payload.data && payload.data.body) || '';
    const clickUrl = (payload.data && (payload.data.click_action || payload.data.url)) || '/';
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: clickUrl, ...(payload.data || {}) },
    });
  });
} catch (e) {
  // Swallow init errors so the SW still installs and can be replaced.
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ('focus' in w) {
          w.navigate(url).catch(() => {});
          return w.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    }),
  );
});