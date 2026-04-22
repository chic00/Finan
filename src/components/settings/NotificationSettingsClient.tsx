'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  saveNotificationSettings,
  sendTestNotification,
  fetchTelegramChatId,
} from '@/actions/notifications'
import {
  Bell, Mail, Send, AlertCircle, CheckCircle,
  Loader2, Info, ExternalLink,
} from 'lucide-react'
import type { UserNotificationSettings } from '@/lib/db/schema'

interface Props {
  settings: UserNotificationSettings | null
  userEmail: string
}

const REMINDER_OPTIONS = [
  { days: 1,  label: '1 dia antes' },
  { days: 2,  label: '2 dias antes' },
  { days: 3,  label: '3 dias antes' },
  { days: 5,  label: '5 dias antes' },
  { days: 7,  label: '1 semana antes' },
  { days: 10, label: '10 dias antes' },
  { days: 15, label: '15 dias antes' },
  { days: 30, label: '1 mês antes' },
]

function TelegramIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.17 13.37l-2.99-.93c-.65-.204-.664-.65.136-.96l11.676-4.503c.54-.194 1.016.12.902.244z"/>
    </svg>
  )
}

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
      style={{ backgroundColor: enabled ? 'var(--color-primary)' : 'var(--color-border)' }}
    >
      <span
        className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
        style={{ transform: enabled ? 'translateX(1.5rem)' : 'translateX(0.25rem)' }}
      />
    </button>
  )
}

export function NotificationSettingsClient({ settings, userEmail }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [testLoading, setTestLoading] = useState<'email' | 'telegram' | null>(null)
  const [fetchingChatId, setFetchingChatId] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [form, setForm] = useState({
    emailEnabled: settings?.emailEnabled ?? true,
    notificationEmail: settings?.notificationEmail ?? userEmail,
    telegramEnabled: settings?.telegramEnabled ?? false,
    telegramChatId: settings?.telegramChatId ?? '',
    reminderDays: settings?.reminderDays
      ? (JSON.parse(settings.reminderDays) as number[])
      : [1, 2, 5, 10],
  })

  const toggleDay = (day: number) =>
    setForm((p) => ({
      ...p,
      reminderDays: p.reminderDays.includes(day)
        ? p.reminderDays.filter((d) => d !== day)
        : [...p.reminderDays, day].sort((a, b) => a - b),
    }))

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message })
    setTimeout(() => setFeedback(null), 6000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const result = await saveNotificationSettings(form)
    setSaving(false)
    if (result?.error) showFeedback('error', result.error)
    else { showFeedback('success', 'Configurações salvas!'); router.refresh() }
  }

  const handleTest = async (channel: 'email' | 'telegram') => {
    setTestLoading(channel)
    const result = await sendTestNotification(channel)
    setTestLoading(null)
    if (result?.error) showFeedback('error', result.error)
    else if (result?.message) showFeedback('success', result.message)
  }

  const handleFetchChatId = async () => {
    setFetchingChatId(true)
    const result = await fetchTelegramChatId()
    setFetchingChatId(false)
    if (result.error) showFeedback('error', result.error)
    else if (result.chatId) {
      setForm((p) => ({ ...p, telegramChatId: result.chatId! }))
      showFeedback('success', `Chat ID encontrado: ${result.chatId}`)
    }
  }

  return (
    <div className="space-y-8 max-w-xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--color-foreground)' }}>
          <Bell size={22} style={{ color: 'var(--color-primary)' }} /> Notificações
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          Configure quando e como receber lembretes de vencimento das contas recorrentes.
        </p>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className="flex items-start gap-2 px-4 py-3 rounded-xl text-sm"
          style={{
            backgroundColor: feedback.type === 'success'
              ? 'color-mix(in srgb, var(--color-success) 12%, transparent)'
              : 'color-mix(in srgb, var(--color-destructive) 12%, transparent)',
            color: feedback.type === 'success' ? 'var(--color-success)' : 'var(--color-destructive)',
            border: `1px solid ${feedback.type === 'success'
              ? 'color-mix(in srgb, var(--color-success) 25%, transparent)'
              : 'color-mix(in srgb, var(--color-destructive) 25%, transparent)'}`,
          }}
        >
          {feedback.type === 'success'
            ? <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
            : <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          }
          {feedback.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Email ──────────────────────────────────────────────── */}
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail size={18} style={{ color: 'var(--color-primary)' }} />
              <span className="font-medium" style={{ color: 'var(--color-foreground)' }}>Email</span>
            </div>
            <Toggle
              enabled={form.emailEnabled}
              onToggle={() => setForm((p) => ({ ...p, emailEnabled: !p.emailEnabled }))}
            />
          </div>

          {form.emailEnabled && (
            <div className="space-y-3 pt-1">
              <input
                type="email"
                value={form.notificationEmail ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, notificationEmail: e.target.value }))}
                placeholder="seu@email.com"
                className="w-full px-3 py-2.5 rounded-xl text-sm theme-input"
              />
              <button
                type="button"
                onClick={() => handleTest('email')}
                disabled={testLoading === 'email' || !form.notificationEmail}
                className="flex items-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                style={{ color: 'var(--color-primary)' }}
              >
                {testLoading === 'email'
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Send size={14} />}
                Enviar email de teste
              </button>
            </div>
          )}
        </div>

        {/* ── Telegram ───────────────────────────────────────────── */}
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TelegramIcon size={18} />
              <span className="font-medium" style={{ color: 'var(--color-foreground)' }}>Telegram</span>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-success) 12%, transparent)',
                  color: 'var(--color-success)',
                }}
              >
                Gratuito
              </span>
            </div>
            <Toggle
              enabled={form.telegramEnabled}
              onToggle={() => setForm((p) => ({ ...p, telegramEnabled: !p.telegramEnabled }))}
            />
          </div>

          {form.telegramEnabled && (
            <div className="space-y-4 pt-1">
              {/* Passo a passo */}
              <div
                className="rounded-xl p-4 space-y-3"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-primary) 8%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)',
                }}
              >
                <p className="text-sm font-semibold flex items-center gap-1" style={{ color: 'var(--color-primary)' }}>
                  <Info size={14} /> Como configurar (1 minuto)
                </p>
                <ol className="text-sm space-y-2 list-none" style={{ color: 'var(--color-foreground)' }}>
                  <li className="flex items-start gap-2">
                    <span
                      className="rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
                    >1</span>
                    <span style={{ color: 'var(--color-muted-foreground)' }}>
                      Abra o Telegram e pesquise por{' '}
                      <strong style={{ color: 'var(--color-foreground)' }}>@{process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'seu_bot'}</strong>
                      {' '}ou clique:{' '}
                      <a
                        href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'seu_bot'}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 underline font-medium"
                        style={{ color: 'var(--color-primary)' }}
                      >
                        Abrir bot <ExternalLink size={11} />
                      </a>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span
                      className="rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
                    >2</span>
                    <span style={{ color: 'var(--color-muted-foreground)' }}>
                      Envie o comando <strong style={{ color: 'var(--color-foreground)' }}>/start</strong> para o bot
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span
                      className="rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
                    >3</span>
                    <span style={{ color: 'var(--color-muted-foreground)' }}>
                      Clique em <strong style={{ color: 'var(--color-foreground)' }}>"Detectar meu Chat ID"</strong> abaixo
                    </span>
                  </li>
                </ol>
              </div>

              {/* Chat ID input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.telegramChatId ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, telegramChatId: e.target.value }))}
                  placeholder="Chat ID (ex: 123456789)"
                  className="flex-1 px-3 py-2.5 rounded-xl text-sm theme-input"
                />
                <button
                  type="button"
                  onClick={handleFetchChatId}
                  disabled={fetchingChatId}
                  className="px-3 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                    color: 'var(--color-primary)',
                    border: '1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)',
                  }}
                >
                  {fetchingChatId ? <Loader2 size={14} className="animate-spin" /> : null}
                  Detectar Chat ID
                </button>
              </div>

              {/* Teste Telegram */}
              {form.telegramChatId && (
                <button
                  type="button"
                  onClick={() => handleTest('telegram')}
                  disabled={testLoading === 'telegram'}
                  className="flex items-center gap-2 text-sm disabled:opacity-40 transition-opacity"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {testLoading === 'telegram'
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Send size={14} />}
                  Enviar mensagem de teste
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Antecedência ───────────────────────────────────────── */}
        <div
          className="rounded-2xl p-5"
          style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}
        >
          <h2 className="font-medium mb-1" style={{ color: 'var(--color-foreground)' }}>Antecedência dos lembretes</h2>
          <p className="text-xs mb-4" style={{ color: 'var(--color-muted-foreground)' }}>
            Você receberá um aviso nos dias marcados antes do vencimento de cada conta.
          </p>
          <div className="flex flex-wrap gap-2">
            {REMINDER_OPTIONS.map(({ days, label }) => {
              const active = form.reminderDays.includes(days)
              return (
                <button
                  key={days}
                  type="button"
                  onClick={() => toggleDay(days)}
                  className="px-3 py-1.5 rounded-xl text-sm font-medium transition-all"
                  style={{
                    backgroundColor: active
                      ? 'var(--color-primary)'
                      : 'var(--color-secondary)',
                    color: active
                      ? 'var(--color-primary-foreground)'
                      : 'var(--color-muted-foreground)',
                    border: active
                      ? '1px solid var(--color-primary)'
                      : '1px solid var(--color-border)',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
          {form.reminderDays.length === 0 && (
            <p className="text-xs mt-2" style={{ color: 'var(--color-destructive)' }}>
              Selecione pelo menos 1 opção
            </p>
          )}
        </div>

        {/* Salvar */}
        <button
          type="submit"
          disabled={saving || form.reminderDays.length === 0}
          className="w-full py-3 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 glow-primary"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
        >
          {saving && <Loader2 className="animate-spin" size={18} />}
          Salvar configurações
        </button>
      </form>
    </div>
  )
}
