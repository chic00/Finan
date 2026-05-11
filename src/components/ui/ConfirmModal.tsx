'use client'

import { AlertTriangle, Loader2 } from 'lucide-react'

interface ConfirmModalProps {
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel  = 'Cancelar',
  variant      = 'danger',
  loading      = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const color = variant === 'danger' ? 'var(--color-destructive)' : 'var(--color-warning)'
  const colorBg = variant === 'danger'
    ? 'color-mix(in srgb, var(--color-destructive) 10%, transparent)'
    : 'color-mix(in srgb, var(--color-warning) 10%, transparent)'
  const colorBorder = variant === 'danger'
    ? 'color-mix(in srgb, var(--color-destructive) 25%, transparent)'
    : 'color-mix(in srgb, var(--color-warning) 25%, transparent)'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div
        className="relative rounded-2xl w-full max-w-sm mx-4 p-6 space-y-4"
        style={{
          backgroundColor: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-modal)',
        }}
      >
        {/* Icon + title */}
        <div className="flex items-start gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: colorBg, border: `1px solid ${colorBorder}` }}
          >
            <AlertTriangle size={20} style={{ color }} />
          </div>
          <div>
            <h3 className="font-semibold" style={{ color: 'var(--color-foreground)' }}>
              {title}
            </h3>
            <p className="text-sm mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
              {description}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl font-medium text-sm transition-all disabled:opacity-50"
            style={{
              border: '1px solid var(--color-border)',
              color: 'var(--color-foreground)',
              backgroundColor: 'transparent',
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl font-medium text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: color, color: '#fff' }}
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
