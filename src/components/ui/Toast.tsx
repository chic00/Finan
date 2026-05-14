'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning'

interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  const remove = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Portal */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onRemove={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast: t, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Animate in
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const icon = {
    success: <CheckCircle2 size={16} style={{ color: 'var(--color-success)', flexShrink: 0 }} />,
    error:   <XCircle      size={16} style={{ color: 'var(--color-destructive)', flexShrink: 0 }} />,
    warning: <AlertTriangle size={16} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />,
  }[t.type]

  const borderColor = {
    success: 'color-mix(in srgb, var(--color-success) 30%, transparent)',
    error:   'color-mix(in srgb, var(--color-destructive) 30%, transparent)',
    warning: 'color-mix(in srgb, var(--color-warning) 30%, transparent)',
  }[t.type]

  return (
    <div
      className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl text-sm max-w-sm shadow-lg"
      style={{
        backgroundColor: 'var(--color-card)',
        border: `1px solid ${borderColor}`,
        boxShadow: 'var(--shadow-modal)',
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.95)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.2s ease, opacity 0.2s ease',
      }}
    >
      {icon}
      <span className="flex-1" style={{ color: 'var(--color-foreground)' }}>{t.message}</span>
      <button
        onClick={() => onRemove(t.id)}
        className="p-0.5 rounded-lg transition-colors"
        style={{ color: 'var(--color-muted-foreground)' }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--color-foreground)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--color-muted-foreground)'}
      >
        <X size={14} />
      </button>
    </div>
  )
}
