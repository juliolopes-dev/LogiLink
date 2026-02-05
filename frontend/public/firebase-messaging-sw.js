// Service Worker para Firebase Cloud Messaging
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js')

const firebaseConfig = {
  apiKey: "AIzaSyBpqhYBwPoBdYhn3-uodeSNmCHltYR-XS0",
  authDomain: "logilink-9a32d.firebaseapp.com",
  projectId: "logilink-9a32d",
  storageBucket: "logilink-9a32d.firebasestorage.app",
  messagingSenderId: "794974826776",
  appId: "1:794974826776:web:9aca5b04ec1f4048aeb615"
}

firebase.initializeApp(firebaseConfig)

const messaging = firebase.messaging()

// Handler para mensagens em segundo plano
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || 'LogiLink'
  const notificationOptions = {
    body: payload.notification?.body || 'Nova notificação',
    icon: '/logo.svg',
    badge: '/logo.svg',
    tag: payload.data?.tag || 'logilink-notification',
    data: payload.data,
    requireInteraction: true,
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'dismiss', title: 'Dispensar' }
    ]
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
})

// Handler para clique na notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') {
    return
  }

  // Abrir ou focar na janela do app
  const urlToOpen = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Verificar se já existe uma janela aberta
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          if (urlToOpen !== '/') {
            client.navigate(urlToOpen)
          }
          return
        }
      }
      // Se não existe, abrir nova janela
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})
