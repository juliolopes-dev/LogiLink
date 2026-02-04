import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: "AIzaSyBpqhYBwPoBdYhn3-uodeSNmCHltYR-XS0",
  authDomain: "logilink-9a32d.firebaseapp.com",
  projectId: "logilink-9a32d",
  storageBucket: "logilink-9a32d.firebasestorage.app",
  messagingSenderId: "794974826776",
  appId: "1:794974826776:web:9aca5b04ec1f4048aeb615" // App Web LogiLink
}

// VAPID Key para Web Push
const VAPID_KEY = "BPox873Po6dhdXu4Qy0Vykq_o60SrRvS8d8AeUDWY6ieFEBnpbEiDY1co83h3n23KAPqXrzvQ-RCCTd7aHXXfnY"

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
      console.log('Token FCM:', token)
      
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
    console.log('✅ Token registrado no servidor')
  } catch (error) {
    console.error('❌ Erro ao salvar token:', error)
  }
}

// Listener para mensagens em primeiro plano
export function onForegroundMessage(callback: (payload: any) => void) {
  if (!messaging) return

  onMessage(messaging, (payload) => {
    console.log('Mensagem recebida em primeiro plano:', payload)
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
