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

// Ícone SVG do Telegram
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
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
        enabled ? 'bg-blue-600' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
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
    if (result?.error) {
      showFeedback('error', result.error)
    } else {
      showFeedback('success', 'Configurações salvas!')
      router.refresh()
    }
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
    if (result.error) {
      showFeedback('error', result.error)
    } else if (result.chatId) {
      setForm((p) => ({ ...p, telegramChatId: result.chatId! }))
      showFeedback('success', `Chat ID encontrado: ${result.chatId}`)
    }
  }

  return (
    <div className="space-y-8 max-w-xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bell size={22} /> Notificações
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Configure quando e como receber lembretes de vencimento das contas recorrentes.
        </p>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`flex items-start gap-2 px-4 py-3 rounded-lg text-sm ${
          feedback.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {feedback.type === 'success'
            ? <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
            : <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          }
          {feedback.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Email ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail size={18} className="text-blue-500" />
              <span className="font-medium text-gray-900">Email</span>
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
                value={form.notificationEmail}
                onChange={(e) => setForm((p) => ({ ...p, notificationEmail: e.target.value }))}
                placeholder="seu@email.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                type="button"
                onClick={() => handleTest('email')}
                disabled={testLoading === 'email' || !form.notificationEmail}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-40 disabled:cursor-not-allowed"
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
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TelegramIcon size={18} />
              <span className="font-medium text-gray-900">Telegram</span>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
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
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 space-y-3">
                <p className="text-sm font-semibold text-blue-900 flex items-center gap-1">
                  <Info size={14} /> Como configurar (1 minuto)
                </p>
                <ol className="text-sm text-blue-800 space-y-2 list-none">
                  <li className="flex items-start gap-2">
                    <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">1</span>
                    <span>
                      Abra o Telegram e pesquise por{' '}
                      <strong>@{process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'seu_bot'}</strong>
                      {' '}ou clique:{' '}
                      <a
                        href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'seu_bot'}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-700 underline font-medium"
                      >
                        Abrir bot <ExternalLink size={11} />
                      </a>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">2</span>
                    <span>Envie o comando <strong>/start</strong> para o bot</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">3</span>
                    <span>Clique em <strong>"Detectar meu Chat ID"</strong> abaixo</span>
                  </li>
                </ol>
              </div>

              {/* Chat ID */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.telegramChatId}
                  onChange={(e) => setForm((p) => ({ ...p, telegramChatId: e.target.value }))}
                  placeholder="Chat ID (ex: 123456789)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                  type="button"
                  onClick={handleFetchChatId}
                  disabled={fetchingChatId}
                  className="px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium hover:bg-blue-100 transition disabled:opacity-50 flex items-center gap-1 whitespace-nowrap"
                >
                  {fetchingChatId
                    ? <Loader2 size={14} className="animate-spin" />
                    : null}
                  Detectar Chat ID
                </button>
              </div>

              {/* Teste */}
              {form.telegramChatId && (
                <button
                  type="button"
                  onClick={() => handleTest('telegram')}
                  disabled={testLoading === 'telegram'}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-40"
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
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-medium text-gray-900 mb-1">Antecedência dos lembretes</h2>
          <p className="text-xs text-gray-500 mb-4">
            Você receberá um aviso nos dias marcados antes do vencimento de cada conta.
          </p>
          <div className="flex flex-wrap gap-2">
            {REMINDER_OPTIONS.map(({ days, label }) => (
              <button
                key={days}
                type="button"
                onClick={() => toggleDay(days)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                  form.reminderDays.includes(days)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {form.reminderDays.length === 0 && (
            <p className="text-xs text-red-500 mt-2">Selecione pelo menos 1 opção</p>
          )}
        </div>

        {/* Salvar */}
        <button
          type="submit"
          disabled={saving || form.reminderDays.length === 0}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving && <Loader2 className="animate-spin" size={18} />}
          Salvar configurações
        </button>
      </form>
    </div>
  )
}
