// ChatReal Service Worker — push notifications only
// Версия: 4 (без workbox)

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Удаляем все кэши workbox и старые кэши
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => {
        console.log('[SW] Deleting cache:', key);
        return caches.delete(key);
      }))
    ).then(() => clients.claim())
  );
});

// Принудительная активация если застрял в waiting
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  // Закрыть уведомление когда сообщение прочитано
  if (event.data?.type === 'CLOSE_NOTIFICATION' && event.data.tag) {
    self.registration.getNotifications({ tag: event.data.tag }).then((notifications) => {
      notifications.forEach(n => n.close());
    });
  }
});

// Push notification received
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'ChatReal', body: event.data.text() };
  }

  const options = {
    body: payload.body,
    icon: payload.icon || '/chat/icons/icon-192.png',
    badge: payload.badge || '/chat/icons/badge-72.png',
    tag: payload.tag,
    renotify: true,
    data: payload.data || {},
    actions: [
      { action: 'open', title: 'Открыть' },
      { action: 'dismiss', title: 'Закрыть' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const data = event.notification.data || {};
  let url = '/chat';
  if (data.type === 'room' && data.roomId) url = `/chat?room=${data.roomId}`;
  else if (data.type === 'direct' && data.senderId) url = `/chat?dm=${data.senderId}`;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes('/chat') && 'focus' in client) {
          client.postMessage({ type: 'NAVIGATE', url });
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
