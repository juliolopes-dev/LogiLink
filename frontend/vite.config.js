import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
// Plugin para gerar o Service Worker do Firebase com variáveis de ambiente
function firebaseSwPlugin() {
    return {
        name: 'firebase-sw-plugin',
        writeBundle: function (options) {
            var outDir = options.dir || 'dist';
            var swContent = "// Service Worker para Firebase Cloud Messaging\n// Gerado automaticamente pelo build - N\u00C3O EDITAR MANUALMENTE\nimportScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js')\nimportScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js')\n\nconst firebaseConfig = {\n  apiKey: \"".concat(process.env.VITE_FIREBASE_API_KEY || '', "\",\n  authDomain: \"").concat(process.env.VITE_FIREBASE_AUTH_DOMAIN || '', "\",\n  projectId: \"").concat(process.env.VITE_FIREBASE_PROJECT_ID || '', "\",\n  storageBucket: \"").concat(process.env.VITE_FIREBASE_STORAGE_BUCKET || '', "\",\n  messagingSenderId: \"").concat(process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '', "\",\n  appId: \"").concat(process.env.VITE_FIREBASE_APP_ID || '', "\"\n}\n\nfirebase.initializeApp(firebaseConfig)\n\nconst messaging = firebase.messaging()\n\n// Handler para mensagens em segundo plano\nmessaging.onBackgroundMessage((payload) => {\n  const notificationTitle = payload.notification?.title || 'LogiLink'\n  const notificationOptions = {\n    body: payload.notification?.body || 'Nova notifica\u00E7\u00E3o',\n    icon: '/logo.svg',\n    badge: '/logo.svg',\n    tag: payload.data?.tag || 'logilink-notification',\n    data: payload.data,\n    requireInteraction: true,\n    actions: [\n      { action: 'open', title: 'Abrir' },\n      { action: 'dismiss', title: 'Dispensar' }\n    ]\n  }\n\n  self.registration.showNotification(notificationTitle, notificationOptions)\n})\n\n// Handler para clique na notifica\u00E7\u00E3o\nself.addEventListener('notificationclick', (event) => {\n  event.notification.close()\n\n  if (event.action === 'dismiss') {\n    return\n  }\n\n  const urlToOpen = event.notification.data?.url || '/'\n\n  event.waitUntil(\n    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {\n      for (const client of windowClients) {\n        if (client.url.includes(self.location.origin) && 'focus' in client) {\n          client.focus()\n          if (urlToOpen !== '/') {\n            client.navigate(urlToOpen)\n          }\n          return\n        }\n      }\n      if (clients.openWindow) {\n        return clients.openWindow(urlToOpen)\n      }\n    })\n  )\n})\n");
            fs.writeFileSync(path.join(outDir, 'firebase-messaging-sw.js'), swContent);
        }
    };
}
export default defineConfig(function (_a) {
    var mode = _a.mode;
    // Carregar variáveis de ambiente
    var env = loadEnv(mode, process.cwd(), '');
    // Disponibilizar para o plugin
    Object.assign(process.env, env);
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
                    entryFileNames: "assets/[name].[hash].js",
                    chunkFileNames: "assets/[name].[hash].js",
                    assetFileNames: "assets/[name].[hash].[ext]"
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
    };
});
