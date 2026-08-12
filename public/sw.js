// Service Worker for Background & Lock-Screen Push Notifications (Like Zalo/Facebook)
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Cache seen notification IDs in Service Worker memory
const seenNotifIdsInSW = new Set();

// Background Notification Poller (Hoạt động độc lập ngay cả khi tắt ứng dụng trên PWA Màn hình chính)
async function pollBackgroundNotifications() {
  try {
    const res = await fetch('/api/mobile/notifications?t=' + Date.now(), { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.notifications && data.notifications.length > 0) {
        const newest = data.notifications[0];

        if (!seenNotifIdsInSW.has(newest.id)) {
          seenNotifIdsInSW.add(newest.id);

          // Kiểm tra xem ứng dụng có đang mở và được focus ở màn hình chính không
          const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
          const isAppFocused = windowClients.some(client => client.visibilityState === 'visible');

          // Nếu ứng dụng đang TẮT hoặc ĐANG Ở CHẾ ĐỘ NỀN -> Phát thông báo ra màn hình chính/khóa!
          if (!isAppFocused) {
            const notifTitle = newest.title || 'Phê duyệt nhu cầu mua hàng';
            self.registration.showNotification(notifTitle, {
              body: newest.message || 'Có đề nghị nhu cầu mua hàng mới cần bạn phê duyệt.',
              icon: '/images/sapo_logo.png',
              badge: '/images/sapo_logo.png',
              vibrate: [200, 100, 200],
              tag: `notif_approval_${newest.id}`, // Tag duy nhất đảm bảo chỉ báo 1 lần
              renotify: false,
              data: {
                url: newest.link || '/phe-duyet/de-nghi-mua-hang'
              },
              actions: [
                { action: 'open', title: 'Xem chi tiết' }
              ]
            });
          }
        }
      }
    }
  } catch (e) {
    // Bỏ qua lỗi kết nối khi mất mạng
  }
}

// Chạy vòng lặp kiểm tra ngầm mỗi 8 giây trong Service Worker
setInterval(() => {
  pollBackgroundNotifications();
}, 8000);

// Listen for Push Events from FCM / Server
self.addEventListener('push', (event) => {
  let data = { title: 'Phê duyệt nhu cầu mua hàng', body: 'Có đề nghị mới cần bạn xử lý.', link: '/mobile' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || 'Bạn có đề nghị mới cần phê duyệt.',
    icon: '/images/sapo_logo.png',
    badge: '/images/sapo_logo.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: data.id ? `notif_approval_${data.id}` : undefined,
    renotify: false,
    data: {
      url: data.link || '/mobile'
    },
    actions: [
      { action: 'open', title: 'Xem chi tiết' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Sapo Mobile', options)
  );
});

// Listen for notification click on lock screen or notification drawer
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/mobile';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url.includes('/mobile') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
