import { ReactNode } from 'react'
import { FiInfo } from 'react-icons/fi'

interface TooltipProps {
  content: string
  children?: ReactNode
  showIcon?: boolean
}

export default function Tooltip({ content, children, showIcon = true }: TooltipProps) {
  return (
    <span className="inline-flex items-center cursor-help" title={content}>
      {children || (showIcon && <FiInfo className="text-slate-400 hover:text-slate-600 transition-colors text-sm ml-1" />)}
    </span>
  )
}
