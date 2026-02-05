import { useEffect } from 'react'
import { FiCheckCircle, FiAlertCircle, FiInfo, FiX } from 'react-icons/fi'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  onClose: () => void
  duration?: number
}

export default function Toast({ message, type = 'success', onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const styles = {
    success: {
      bg: 'bg-success-subtle',
      border: 'border-success',
      text: 'text-success-text',
      icon: FiCheckCircle
    },
    error: {
      bg: 'bg-danger-subtle',
      border: 'border-danger',
      text: 'text-danger-text',
      icon: FiAlertCircle
    },
    info: {
      bg: 'bg-info-subtle',
      border: 'border-info',
      text: 'text-info-text',
      icon: FiInfo
    }
  }

  const style = styles[type]
  const Icon = style.icon

  return (
    <div
      className={`${style.bg} ${style.text} border ${style.border} rounded-md px-4 py-3 shadow-sm flex items-center gap-3 min-w-[320px] max-w-md`}
      style={{ animation: 'fadeIn 0.3s ease-out' }}
    >
      <Icon size={20} className="flex-shrink-0" />
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={onClose}
        className="flex-shrink-0 hover:opacity-70 transition-opacity"
      >
        <FiX size={18} />
      </button>
    </div>
  )
}
