'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  createRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
  toggleRecurringTransaction,
  togglePaid,
} from '@/actions/recurring'
import {
  Plus, Pencil, Trash2, Loader2, RefreshCw,
  CheckCircle2, Circle, PauseCircle, PlayCircle,
  Calendar, AlertCircle, ChevronDown, ChevronUp,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useToast } from '@/components/ui/Toast'
import type { BankAccount, Category } from '@/lib/db/schema'

interface RecurringWithRelations {
  id: string
  type: string
  amount: string
  description: string | null
  frequency: string
  nextDueDate: Date
  isActive: boolean
  isPaid: boolean
  paidAt: Date | null
  account: { id: string; name: string; color: string | null }
  category?: { id: string; name: string; color: string | null } | null
}

interface Props {
  recorrentes: RecurringWithRelations[]
  accounts: BankAccount[]
  categories: Category[]
}

type FormState = {
  accountId: string
  categoryId: string
  type: 'expense' | 'income'
  amount: number
  description: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  startDate: string
  endDate: string
}

const defaultForm = (accountId = ''): FormState => ({
  accountId,
  categoryId: '',
  type: 'expense',
  amount: 0,
  description: '',
  frequency: 'monthly',
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
})

const frequencyLabel: Record<string, string> = {
  daily: 'Diária', weekly: 'Semanal', monthly: 'Mensal', yearly: 'Anual',
}

// Força meio-dia local para evitar bug de timezone (UTC vs local)
function toLocalNoon(date: Date): Date {
  const d = new Date(date)
  d.setHours(12, 0, 0, 0)
  return d
}

function daysUntil(date: Date): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due   = toLocalNoon(date)
  due.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}


function dueBadgeStyle(days: number, isPaid: boolean): { label: string; color: string; bg: string } {
  if (isPaid) return { label: 'Pago', color: 'var(--color-success)', bg: 'color-mix(in srgb, var(--color-success) 15%, transparent)' }
  if (days < 0)   return { label: `Vencida há ${Math.abs(days)}d`, color: 'var(--color-destructive)', bg: 'color-mix(in srgb, var(--color-destructive) 15%, transparent)' }
  if (days === 0) return { label: 'Vence hoje!',  color: 'var(--color-destructive)', bg: 'color-mix(in srgb, var(--color-destructive) 15%, transparent)' }
  if (days === 1) return { label: 'Vence amanhã', color: 'var(--color-warning)',     bg: 'color-mix(in srgb, var(--color-warning) 15%, transparent)' }
  if (days <= 5)  return { label: `${days} dias`,  color: 'var(--color-warning)',     bg: 'color-mix(in srgb, var(--color-warning) 15%, transparent)' }
  if (days <= 10) return { label: `${days} dias`,  color: 'var(--color-primary)',     bg: 'color-mix(in srgb, var(--color-primary) 15%, transparent)' }
  return               { label: `${days} dias`,   color: 'var(--color-muted-foreground)', bg: 'var(--color-secondary)' }
}

// ─── Section Header ────────────────────────────────────────────────
function SectionHeader({
  title, count, accentColor, defaultOpen = true, children
}: {
  title: string; count: number; accentColor: string; defaultOpen?: boolean; children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 mb-3 w-full group"
      >
        <div className="w-1 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: accentColor }} />
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
          {title}
        </h2>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: 'var(--color-secondary)', color: 'var(--color-muted-foreground)' }}
        >
          {count}
        </span>
        <div className="ml-auto" style={{ color: 'var(--color-muted-foreground)' }}>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>
      {open && children}
    </div>
  )
}

export function RecorrentesClient({ recorrentes, accounts, categories }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [showModal, setShowModal]     = useState(false)
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [loading, setLoading]         = useState(false)
  const [togglingId, setTogglingId]   = useState<string | null>(null)
  const [deletingId, setDeletingId]   = useState<string | null>(null)  // id pendente de exclusão
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [error, setError]             = useState('')
  const [form, setForm]               = useState<FormState>(defaultForm(accounts[0]?.id))

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear  = now.getFullYear()
  const nextMonth    = currentMonth === 11 ? 0 : currentMonth + 1
  const nextYear     = currentMonth === 11 ? currentYear + 1 : currentYear

  // Separação em grupos — usa toLocalNoon para evitar bug de timezone
  const active = recorrentes.filter(r => r.isActive)
  const paused = recorrentes.filter(r => !r.isActive)

  const currentMonthItems = active.filter(r => {
    const due = toLocalNoon(new Date(r.nextDueDate))
    const isThisMonth     = due.getMonth() === currentMonth && due.getFullYear() === currentYear
    const isOverdueUnpaid = due < new Date(currentYear, currentMonth, 1) && !r.isPaid
    return isThisMonth || isOverdueUnpaid
  })

  const nextMonthItems = active.filter(r => {
    const due = toLocalNoon(new Date(r.nextDueDate))
    return due.getMonth() === nextMonth && due.getFullYear() === nextYear
  })

  const futureItems = active.filter(r => {
    const due = toLocalNoon(new Date(r.nextDueDate))
    const monthDiff = (due.getFullYear() - currentYear) * 12 + (due.getMonth() - currentMonth)
    return monthDiff > 1
  })

  const filteredCategories = categories.filter((c) => c.type === form.type)

  const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

  // Summary stats (only current month)
  const summaryItems = [
    {
      label: 'A pagar este mês',
      value: currentMonthItems.filter(r => !r.isPaid && r.type === 'expense').length.toString(),
      sub: 'despesas pendentes',
      color: 'var(--color-destructive)'
    },
    {
      label: 'Pagas este mês',
      value: currentMonthItems.filter(r => r.isPaid).length.toString(),
      sub: `de ${currentMonthItems.length} total`,
      color: 'var(--color-success)'
    },
    {
      label: 'Total despesas',
      value: formatCurrency(currentMonthItems.filter(r => r.type === 'expense').reduce((s, r) => s + parseFloat(r.amount), 0)),
      sub: 'neste mês',
      color: 'var(--color-destructive)'
    },
    {
      label: 'Total receitas',
      value: formatCurrency(currentMonthItems.filter(r => r.type === 'income').reduce((s, r) => s + parseFloat(r.amount), 0)),
      sub: 'neste mês',
      color: 'var(--color-success)'
    },
  ]

  const handleOpenCreate = () => {
    setEditingId(null)
    setForm(defaultForm(accounts[0]?.id))
    setError('')
    setShowModal(true)
  }

  const handleOpenEdit = (r: RecurringWithRelations) => {
    setEditingId(r.id)
    setForm({
      accountId:   r.account.id,
      categoryId:  r.category?.id || '',
      type:        r.type as 'expense' | 'income',
      amount:      parseFloat(r.amount),
      description: r.description || '',
      frequency:   r.frequency as FormState['frequency'],
      startDate:   new Date(r.nextDueDate).toISOString().split('T')[0],
      endDate:     '',
    })
    setError('')
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const payload = {
      ...form,
      startDate:  new Date(form.startDate + 'T12:00:00'),
      endDate:    form.endDate ? new Date(form.endDate + 'T12:00:00') : undefined,
      categoryId: form.categoryId || undefined,
    }
    const result = editingId
      ? await updateRecurringTransaction(editingId, payload)
      : await createRecurringTransaction(payload)
    setLoading(false)
    if (result?.error) { setError(result.error); return }
    setShowModal(false)
    setEditingId(null)
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingId) return
    setDeleteLoading(true)
    await deleteRecurringTransaction(deletingId)
    setDeleteLoading(false)
    setDeletingId(null)
    toast('Recorrência excluída com sucesso')
    router.refresh()
  }

  const handleToggleActive = async (id: string) => {
    await toggleRecurringTransaction(id)
    router.refresh()
  }

  const handleTogglePaid = async (id: string) => {
    setTogglingId(id)
    const result = await togglePaid(id)
    setTogglingId(null)
    if (result?.error) { toast(result.error, 'error'); return }
    router.refresh()
  }

  const renderCard = (r: RecurringWithRelations, allowPay = true) => {
    const days = daysUntil(new Date(r.nextDueDate))
    const badge = dueBadgeStyle(days, r.isPaid)
    const isToggling = togglingId === r.id
    const isLate = !r.isPaid && days < 0
    const isExpense = r.type === 'expense'

    const cardBorderColor = !r.isActive
      ? 'var(--color-border)'
      : r.isPaid
        ? 'color-mix(in srgb, var(--color-success) 25%, var(--color-border))'
        : isLate
          ? 'color-mix(in srgb, var(--color-destructive) 30%, var(--color-border))'
          : days <= 2
            ? 'color-mix(in srgb, var(--color-warning) 25%, var(--color-border))'
            : 'var(--color-border)'

    return (
      <div
        key={r.id}
        className="rounded-2xl p-5 transition-all"
        style={{
          backgroundColor: 'var(--color-card)',
          border: `1px solid ${cardBorderColor}`,
          boxShadow: 'var(--shadow-card)',
          opacity: !r.isActive ? 0.65 : 1,
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-start gap-3 min-w-0">
            {/* Colored dot */}
            <div
              className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
              style={{ backgroundColor: r.account.color || 'var(--color-primary)' }}
            />
            <div className="min-w-0">
              <p className="font-semibold truncate" style={{ color: 'var(--color-foreground)' }}>
                {r.description || 'Sem descrição'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
                {frequencyLabel[r.frequency]}
                {r.account.name && ` · ${r.account.name}`}
                {r.category && ` · ${r.category.name}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => handleToggleActive(r.id)}
              className="p-1.5 rounded-lg transition-all"
              style={{ color: 'var(--color-muted-foreground)' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.color = 'var(--color-warning)'
                ;(e.currentTarget as HTMLElement).style.backgroundColor = 'color-mix(in srgb, var(--color-warning) 10%, transparent)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.color = 'var(--color-muted-foreground)'
                ;(e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
              }}
              title={r.isActive ? 'Pausar' : 'Reativar'}
            >
              {r.isActive ? <PauseCircle size={15} /> : <PlayCircle size={15} />}
            </button>
            <button
              onClick={() => handleOpenEdit(r)}
              className="p-1.5 rounded-lg transition-all"
              style={{ color: 'var(--color-muted-foreground)' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.color = 'var(--color-primary)'
                ;(e.currentTarget as HTMLElement).style.backgroundColor = 'color-mix(in srgb, var(--color-primary) 10%, transparent)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.color = 'var(--color-muted-foreground)'
                ;(e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
              }}
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={() => handleDelete(r.id)}
              className="p-1.5 rounded-lg transition-all"
              style={{ color: 'var(--color-muted-foreground)' }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.color = 'var(--color-destructive)'
                ;(e.currentTarget as HTMLElement).style.backgroundColor = 'color-mix(in srgb, var(--color-destructive) 10%, transparent)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.color = 'var(--color-muted-foreground)'
                ;(e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
              }}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* Amount + due date */}
        <div className="flex items-center justify-between mb-4">
          <p
            className="text-xl font-bold"
            style={{ color: isExpense ? 'var(--color-destructive)' : 'var(--color-success)' }}
          >
            {isExpense ? '-' : '+'}{formatCurrency(parseFloat(r.amount))}
          </p>
          <div className="text-right">
            <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
              {r.isPaid ? 'Próximo vencimento' : 'Vencimento'}
            </p>
            <p
              className="text-sm font-semibold flex items-center gap-1 justify-end"
              style={{ color: 'var(--color-foreground)' }}
            >
              <Calendar size={13} />
              {formatDate(new Date(r.nextDueDate))}
            </p>
          </div>
        </div>

        {/* Status strip */}
        {r.isActive && (
          <div
            className="flex items-center justify-between rounded-xl px-3 py-2.5"
            style={{
              backgroundColor: r.isPaid
                ? 'color-mix(in srgb, var(--color-success) 10%, transparent)'
                : isLate
                  ? 'color-mix(in srgb, var(--color-destructive) 8%, transparent)'
                  : 'var(--color-secondary)',
              border: `1px solid ${r.isPaid
                ? 'color-mix(in srgb, var(--color-success) 20%, transparent)'
                : isLate
                  ? 'color-mix(in srgb, var(--color-destructive) 20%, transparent)'
                  : 'var(--color-border)'}`,
            }}
          >
            <div className="flex items-center gap-2">
              {r.isPaid ? (
                <>
                  <CheckCircle2 size={16} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-success)' }}>Pago</p>
                    {r.paidAt && (
                      <p className="text-xs" style={{ color: 'var(--color-success)' }}>
                        em {formatDate(new Date(r.paidAt))}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Circle size={16} style={{ color: isLate ? 'var(--color-destructive)' : 'var(--color-muted-foreground)', flexShrink: 0 }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>Não pago</p>
                    <span
                      className="text-xs font-medium px-1.5 py-0.5 rounded-full"
                      style={{ color: badge.color, backgroundColor: badge.bg }}
                    >
                      {badge.label}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Only show pay button if allowPay */}
            {allowPay && (
              <button
                onClick={() => handleTogglePaid(r.id)}
                disabled={isToggling}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                style={{
                  color: r.isPaid ? 'var(--color-foreground)' : 'var(--color-success)',
                  backgroundColor: r.isPaid
                    ? 'var(--color-secondary)'
                    : 'color-mix(in srgb, var(--color-success) 12%, transparent)',
                  border: `1px solid ${r.isPaid
                    ? 'var(--color-border)'
                    : 'color-mix(in srgb, var(--color-success) 30%, transparent)'}`,
                }}
              >
                {isToggling
                  ? <Loader2 size={13} className="animate-spin" />
                  : r.isPaid ? 'Desfazer' : 'Marcar pago'
                }
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold flex items-center gap-2"
            style={{ color: 'var(--color-foreground)' }}
          >
            <RefreshCw size={22} style={{ color: 'var(--color-primary)' }} />
            Contas Recorrentes
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
            Marque cada conta manualmente quando pagar. O próximo vencimento é calculado automaticamente.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all glow-primary"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
        >
          <Plus size={18} /> Nova recorrente
        </button>
      </div>

      {/* Summary cards */}
      {recorrentes.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {summaryItems.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl p-4 transition-all"
              style={{
                backgroundColor: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <p className="text-xs mb-1" style={{ color: 'var(--color-muted-foreground)' }}>{s.label}</p>
              <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Mês atual ─────────────────────────────────────────────── */}
      {currentMonthItems.length > 0 && (
        <SectionHeader
          title={`${MONTH_NAMES[currentMonth]} ${currentYear}`}
          count={currentMonthItems.length}
          accentColor="var(--color-primary)"
          defaultOpen
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentMonthItems
              .slice()
              .sort((a, b) => {
                if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1
                return new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime()
              })
              .map(r => renderCard(r, true))}
          </div>
        </SectionHeader>
      )}

      {/* ── Próximo mês ───────────────────────────────────────────── */}
      {nextMonthItems.length > 0 && (
        <SectionHeader
          title={`${MONTH_NAMES[nextMonth]} ${nextYear}`}
          count={nextMonthItems.length}
          accentColor="var(--color-muted-foreground)"
          defaultOpen={false}
        >
          <div
            className="rounded-2xl p-4 mb-3 flex items-center gap-2 text-sm"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-warning) 8%, transparent)',
              border: '1px solid color-mix(in srgb, var(--color-warning) 20%, transparent)',
              color: 'var(--color-warning)',
            }}
          >
            <Calendar size={14} className="flex-shrink-0" />
            Estas contas vencem no mês que vem. O botão de pagamento ficará disponível a partir de{' '}
            <strong>1º de {MONTH_NAMES[nextMonth]}</strong>.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-75">
            {nextMonthItems
              .slice()
              .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime())
              .map(r => renderCard(r, false))}
          </div>
        </SectionHeader>
      )}

      {/* ── Meses futuros ─────────────────────────────────────────── */}
      {futureItems.length > 0 && (
        <SectionHeader
          title="Próximos meses"
          count={futureItems.length}
          accentColor="var(--color-border)"
          defaultOpen={false}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
            {futureItems
              .slice()
              .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime())
              .map(r => renderCard(r, false))}
          </div>
        </SectionHeader>
      )}

      {/* ── Pausadas ──────────────────────────────────────────────── */}
      {paused.length > 0 && (
        <SectionHeader
          title="Pausadas"
          count={paused.length}
          accentColor="var(--color-border)"
          defaultOpen={false}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paused.map(r => renderCard(r, false))}
          </div>
        </SectionHeader>
      )}

      {/* Empty state */}
      {recorrentes.length === 0 && (
        <div
          className="text-center py-16 rounded-2xl"
          style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
        >
          <RefreshCw size={48} className="mx-auto mb-4" style={{ color: 'var(--color-muted-foreground)' }} />
          <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--color-foreground)' }}>
            Nenhuma conta recorrente
          </h3>
          <p className="text-sm mb-6" style={{ color: 'var(--color-muted-foreground)' }}>
            Cadastre suas contas fixas para acompanhar o pagamento.
          </p>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all glow-primary"
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
          >
            <Plus size={18} /> Cadastrar primeira recorrente
          </button>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {deletingId && (
        <ConfirmModal
          title="Excluir recorrência"
          description="Esta ação não pode ser desfeita. A recorrência e seu histórico serão removidos permanentemente."
          confirmLabel="Excluir"
          variant="danger"
          loading={deleteLoading}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingId(null)}
        />
      )}

      {/* Modal criar/editar */}
      {showModal && (
        <Modal
          title={editingId ? 'Editar recorrente' : 'Nova conta recorrente'}
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-destructive) 10%, transparent)',
                  color: 'var(--color-destructive)',
                }}
              >
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>
                Descrição *
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl outline-none transition-all theme-input"
                placeholder="Ex: Netflix, Aluguel, Internet..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>Tipo</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as 'expense' | 'income', categoryId: '' }))}
                  className="w-full px-4 py-2.5 rounded-xl outline-none transition-all theme-select"
                >
                  <option value="expense">Despesa</option>
                  <option value="income">Receita</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>Frequência</label>
                <select
                  value={form.frequency}
                  onChange={(e) => setForm((p) => ({ ...p, frequency: e.target.value as FormState['frequency'] }))}
                  className="w-full px-4 py-2.5 rounded-xl outline-none transition-all theme-select"
                >
                  <option value="daily">Diária</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensal</option>
                  <option value="yearly">Anual</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>Valor *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.amount || ''}
                onChange={(e) => setForm((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                className="w-full px-4 py-2.5 rounded-xl outline-none transition-all theme-input"
                placeholder="0,00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>
                Conta bancária *
              </label>
              <select
                value={form.accountId}
                onChange={(e) => setForm((p) => ({ ...p, accountId: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl outline-none transition-all theme-select"
                required
              >
                <option value="">Selecione...</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>Categoria</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl outline-none transition-all theme-select"
              >
                <option value="">Sem categoria</option>
                {filteredCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>
                  {editingId ? 'Próximo vencimento *' : 'Primeiro vencimento *'}
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl outline-none transition-all theme-input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>
                  Encerra em (opcional)
                </label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl outline-none transition-all theme-input"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl font-medium transition-all"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2 glow-primary"
                style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
              >
                {loading && <Loader2 className="animate-spin" size={18} />}
                {editingId ? 'Salvar alterações' : 'Criar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
