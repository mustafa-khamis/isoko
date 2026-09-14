/* global importScripts, firebase, self */
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

const params = new URLSearchParams(self.location.search);
const config = JSON.parse(decodeURIComponent(params.get('config') || '%7B%7D'));
firebase.initializeApp(config);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const title = data.title || 'RwanMart';
  const options = {
    body: data.body || '',
    icon: '/favicon.ico',
    tag: data.notificationId || 'rwanmart-notification',
    data: { url: data.url || '/notifications' },
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || '/notifications', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find(client => 'focus' in client);
      if (existing) {
        existing.navigate(targetUrl);
        return existing.focus();
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});