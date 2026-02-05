import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// Plugin para gerar o Service Worker do Firebase com variáveis de ambiente
function firebaseSwPlugin() {
  return {
    name: 'firebase-sw-plugin',
    writeBundle(options: any) {
      const outDir = options.dir || 'dist'
      const swContent = `// Service Worker para Firebase Cloud Messaging
// Gerado automaticamente pelo build - NÃO EDITAR MANUALMENTE
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js')

const firebaseConfig = {
  apiKey: "${process.env.VITE_FIREBASE_API_KEY || ''}",
  authDomain: "${process.env.VITE_FIREBASE_AUTH_DOMAIN || ''}",
  projectId: "${process.env.VITE_FIREBASE_PROJECT_ID || ''}",
  storageBucket: "${process.env.VITE_FIREBASE_STORAGE_BUCKET || ''}",
  messagingSenderId: "${process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || ''}",
  appId: "${process.env.VITE_FIREBASE_APP_ID || ''}"
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

  const urlToOpen = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          if (urlToOpen !== '/') {
            client.navigate(urlToOpen)
          }
          return
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})
`
      fs.writeFileSync(path.join(outDir, 'firebase-messaging-sw.js'), swContent)
    }
  }
}

export default defineConfig(({ mode }) => {
  // Carregar variáveis de ambiente
  const env = loadEnv(mode, process.cwd(), '')
  
  // Disponibilizar para o plugin
  Object.assign(process.env, env)
  
  return {
    plugins: [react(), firebaseSwPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          entryFileNames: `assets/[name].[hash].js`,
          chunkFileNames: `assets/[name].[hash].js`,
          assetFileNames: `assets/[name].[hash].[ext]`
        }
      }
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3333',
          changeOrigin: true,
        },
      },
    },
  }
})
