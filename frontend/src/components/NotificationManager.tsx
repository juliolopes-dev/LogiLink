import { useEffect, useState } from 'react'
import { FiBell, FiBellOff } from 'react-icons/fi'
import { 
  requestNotificationPermission, 
  onForegroundMessage, 
  isNotificationSupported,
  getNotificationPermission 
} from '../lib/firebase'

interface NotificationManagerProps {
  onNotification?: (payload: any) => void
}

export default function NotificationManager({ onNotification }: NotificationManagerProps) {
  const [permission, setPermission] = useState<NotificationPermission | null>(null)
  const [loading, setLoading] = useState(false)
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    // Verificar suporte
    const isSupported = isNotificationSupported()
    setSupported(isSupported)

    if (isSupported) {
      setPermission(getNotificationPermission())

      // Registrar service worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/firebase-messaging-sw.js')
          .then((registration) => {
            if (import.meta.env.DEV) {
              console.log('Service Worker registrado:', registration)
            }
          })
          .catch((error) => {
            console.error('Erro ao registrar Service Worker:', error)
          })
      }

      // Listener para mensagens em primeiro plano
      onForegroundMessage((payload) => {
        // Mostrar notificação mesmo em primeiro plano
        if (Notification.permission === 'granted') {
          new Notification(payload.notification?.title || 'LogiLink', {
            body: payload.notification?.body || 'Nova notificação',
            icon: '/logo-192.png'
          })
        }
        onNotification?.(payload)
      })
    }
  }, [onNotification])

  const handleRequestPermission = async () => {
    setLoading(true)
    try {
      const token = await requestNotificationPermission()
      if (token) {
        setPermission('granted')
      } else {
        setPermission(Notification.permission)
      }
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!supported) {
    return null // Não mostrar nada se não suportar
  }

  if (permission === 'granted') {
    return (
      <button
        className="p-2 rounded-md text-success hover:bg-success-subtle transition-colors"
        title="Notificações ativadas"
      >
        <FiBell size={18} />
      </button>
    )
  }

  if (permission === 'denied') {
    return (
      <button
        className="p-2 rounded-md text-slate-400 cursor-not-allowed"
        title="Notificações bloqueadas pelo navegador"
        disabled
      >
        <FiBellOff size={18} />
      </button>
    )
  }

  return (
    <button
      onClick={handleRequestPermission}
      disabled={loading}
      className="p-2 rounded-md text-slate-500 hover:text-accent hover:bg-accent-subtle transition-colors"
      title="Ativar notificações"
    >
      {loading ? (
        <div className="animate-spin rounded-full h-[18px] w-[18px] border-b-2 border-accent" />
      ) : (
        <FiBell size={18} />
      )}
    </button>
  )
}
