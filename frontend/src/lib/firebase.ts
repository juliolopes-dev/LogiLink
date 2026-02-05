import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging'

// Firebase Configuration via Environment Variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

// VAPID Key para Web Push via Environment Variable
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || ''

// Inicializar Firebase
const app = initializeApp(firebaseConfig)

// Messaging (só funciona em navegadores que suportam)
let messaging: Messaging | null = null

if (typeof window !== 'undefined' && 'Notification' in window) {
  try {
    messaging = getMessaging(app)
  } catch (error) {
    console.warn('Firebase Messaging não suportado:', error)
  }
}

// Solicitar permissão e obter token
export async function requestNotificationPermission(): Promise<string | null> {
  if (!messaging) {
    console.warn('Messaging não disponível')
    return null
  }

  try {
    const permission = await Notification.requestPermission()
    
    if (permission === 'granted') {
      const token = await getToken(messaging, { vapidKey: VAPID_KEY })
      if (import.meta.env.DEV) {
        console.log('Token FCM:', token)
      }
      
      // Salvar token no backend para enviar notificações depois
      await saveTokenToServer(token)
      
      return token
    } else {
      console.log('Permissão de notificação negada')
      return null
    }
  } catch (error) {
    console.error('Erro ao obter token:', error)
    return null
  }
}

// Salvar token no servidor
async function saveTokenToServer(token: string) {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || '/api'
    await fetch(`${apiUrl}/notifications/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
    if (import.meta.env.DEV) {
      console.log('✅ Token registrado no servidor')
    }
  } catch (error) {
    console.error('❌ Erro ao salvar token:', error)
  }
}

// Listener para mensagens em primeiro plano
export function onForegroundMessage(callback: (payload: any) => void) {
  if (!messaging) return

  onMessage(messaging, (payload) => {
    if (import.meta.env.DEV) {
      console.log('Mensagem recebida em primeiro plano:', payload)
    }
    callback(payload)
  })
}

// Verificar se notificações estão habilitadas
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator
}

// Verificar status da permissão
export function getNotificationPermission(): NotificationPermission | null {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    return Notification.permission
  }
  return null
}

export { app, messaging }
