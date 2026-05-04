// expo-service-worker.js
// Service Worker customizado para suporte a Push Notifications na Web (Volly)

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      console.log('Notificação recebida em formato texto:', event.data.text());
      data = { body: event.data.text() };
    }
  }

  const title = data.title || 'Volly Connect';
  const options = {
    body: data.body || 'Você tem uma nova atualização!',
    icon: '/assets/images/icons/icone-volly-logo.png', // Certifique-se que este caminho existe
    badge: '/favicon.ico',
    data: data.data || {}, // Dados extras para deep linking
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Tenta focar em uma aba aberta do app ou abre uma nova
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      if (windowClients.length > 0) {
        return windowClients[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});
