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
  Calendar, AlertCircle,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import type { BankAccount, Category } from '@/lib/db/schema'

interface RecurringWithRelations {
  id: string
  type: string
  amount: string
  description: string | null
  frequency: string
  nextDueDate: Date
  isActive: boolean
  isPaid: boolean          // ✅ novo campo
  paidAt: Date | null      // ✅ novo campo
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

function daysUntil(date: Date): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due   = new Date(date); due.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function dueBadge(days: number) {
  if (days < 0)   return { label: 'Vencida',      cls: 'bg-red-100 text-red-700 border border-red-200' }
  if (days === 0) return { label: 'Vence hoje!',  cls: 'bg-red-100 text-red-700 border border-red-200' }
  if (days === 1) return { label: 'Vence amanhã', cls: 'bg-orange-100 text-orange-700 border border-orange-200' }
  if (days <= 5)  return { label: `${days} dias`, cls: 'bg-yellow-100 text-yellow-700 border border-yellow-200' }
  if (days <= 10) return { label: `${days} dias`, cls: 'bg-blue-100 text-blue-700 border border-blue-200' }
  return           { label: `${days} dias`,        cls: 'bg-gray-100 text-gray-500 border border-gray-200' }
}

export function RecorrentesClient({ recorrentes, accounts, categories }: Props) {
  const router = useRouter()
  const [showModal, setShowModal]     = useState(false)
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [loading, setLoading]         = useState(false)
  const [togglingId, setTogglingId]   = useState<string | null>(null)
  const [error, setError]             = useState('')
  const [form, setForm]               = useState<FormState>(defaultForm(accounts[0]?.id))

  const active = recorrentes.filter((r) => r.isActive)
  const paused = recorrentes.filter((r) => !r.isActive)
  const filteredCategories = categories.filter((c) => c.type === form.type)

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
    if (!confirm('Excluir esta recorrência?')) return
    await deleteRecurringTransaction(id)
    router.refresh()
  }

  const handleToggleActive = async (id: string) => {
    await toggleRecurringTransaction(id)
    router.refresh()
  }

  // ✅ NOVO: toggle pago/não pago
  const handleTogglePaid = async (id: string) => {
    setTogglingId(id)
    const result = await togglePaid(id)
    setTogglingId(null)
    if (result?.error) { alert(result.error); return }
    router.refresh()
  }

  const renderCard = (r: RecurringWithRelations) => {
    const days  = daysUntil(new Date(r.nextDueDate))
    const badge = dueBadge(days)
    const isToggling = togglingId === r.id

    return (
      <div
        key={r.id}
        className={`bg-white rounded-xl border p-5 transition hover:shadow-md ${
          !r.isActive  ? 'opacity-60 border-gray-200' :
          r.isPaid     ? 'border-green-200 bg-green-50/20' :
          days < 0     ? 'border-red-300 bg-red-50/30' :
          days <= 2    ? 'border-orange-200' :
                         'border-gray-200'
        }`}
      >
        {/* Cabeçalho: nome + botões */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
              style={{ backgroundColor: r.account.color || '#3B82F6' }} />
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">
                {r.description || 'Sem descrição'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                📅 {frequencyLabel[r.frequency]} · {r.account.name}
                {r.category && ` · ${r.category.name}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => handleToggleActive(r.id)}
              className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition"
              title={r.isActive ? 'Pausar' : 'Reativar'}>
              {r.isActive ? <PauseCircle size={15} /> : <PlayCircle size={15} />}
            </button>
            <button onClick={() => handleOpenEdit(r)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
              title="Editar">
              <Pencil size={15} />
            </button>
            <button onClick={() => handleDelete(r.id)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
              title="Excluir">
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* Valor + vencimento */}
        <div className="flex items-center justify-between mb-4">
          <p className={`text-xl font-bold ${r.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
            {r.type === 'income' ? '+' : '-'}{formatCurrency(parseFloat(r.amount))}
          </p>
          <div className="text-right">
            <p className="text-xs text-gray-500">
              {r.isPaid ? 'Próximo vencimento' : 'Vencimento'}
            </p>
            <p className="text-sm font-semibold text-gray-800 flex items-center gap-1 justify-end">
              <Calendar size={13} />
              {formatDate(new Date(r.nextDueDate))}
            </p>
          </div>
        </div>

        {/* ✅ ÁREA DE STATUS PAGO/NÃO PAGO */}
        {r.isActive && (
          <div className={`flex items-center justify-between rounded-lg px-3 py-2.5 border ${
            r.isPaid
              ? 'bg-green-50 border-green-200'
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center gap-2">
              {r.isPaid ? (
                <>
                  <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-green-700">Pago</p>
                    {r.paidAt && (
                      <p className="text-xs text-green-600">
                        em {formatDate(new Date(r.paidAt))}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Circle size={16} className="text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-600">Não pago</p>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Botão toggle */}
            <button
              onClick={() => handleTogglePaid(r.id)}
              disabled={isToggling}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition disabled:opacity-50 ${
                r.isPaid
                  ? 'text-gray-600 bg-white border-gray-300 hover:bg-gray-100'
                  : 'text-green-700 bg-green-600/10 border-green-300 hover:bg-green-100'
              }`}
            >
              {isToggling
                ? <Loader2 size={13} className="animate-spin" />
                : r.isPaid
                  ? 'Desfazer'
                  : 'Marcar pago'
              }
            </button>
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
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <RefreshCw size={22} /> Contas Recorrentes
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Marque cada conta manualmente quando pagar. Ao marcar como pago, o próximo vencimento é calculado automaticamente.
          </p>
        </div>
        <button onClick={handleOpenCreate}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition">
          <Plus size={18} /> Nova recorrente
        </button>
      </div>

      {/* Resumo */}
      {recorrentes.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total ativas',     value: active.length.toString(),  sub: 'recorrências',  color: 'text-blue-600' },
            { label: 'A pagar',          value: active.filter((r) => !r.isPaid && daysUntil(new Date(r.nextDueDate)) <= 7).length.toString(), sub: 'em 7 dias', color: 'text-orange-600' },
            { label: 'Gasto mensal',     value: formatCurrency(active.filter((r) => r.type === 'expense' && r.frequency === 'monthly').reduce((s, r) => s + parseFloat(r.amount), 0)), sub: 'estimado', color: 'text-red-600' },
            { label: 'Receita mensal',   value: formatCurrency(active.filter((r) => r.type === 'income'  && r.frequency === 'monthly').reduce((s, r) => s + parseFloat(r.amount), 0)), sub: 'estimada', color: 'text-green-600' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-400">{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Ativas */}
      {active.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Ativas ({active.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {active.map(renderCard)}
          </div>
        </div>
      )}

      {/* Pausadas */}
      {paused.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Pausadas ({paused.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paused.map(renderCard)}
          </div>
        </div>
      )}

      {/* Empty */}
      {recorrentes.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <RefreshCw className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-700">Nenhuma conta recorrente</h3>
          <p className="text-gray-400 text-sm mt-1 mb-6">
            Cadastre suas contas fixas para acompanhar o pagamento.
          </p>
          <button onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition">
            <Plus size={18} /> Cadastrar primeira recorrente
          </button>
        </div>
      )}

      {/* Modal criar / editar */}
      {showModal && (
        <Modal
          title={editingId ? 'Editar recorrente' : 'Nova conta recorrente'}
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
              <input type="text" value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ex: Netflix, Aluguel, Internet..." required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select value={form.type}
                  onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as 'expense' | 'income', categoryId: '' }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="expense">Despesa</option>
                  <option value="income">Receita</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frequência</label>
                <select value={form.frequency}
                  onChange={(e) => setForm((p) => ({ ...p, frequency: e.target.value as FormState['frequency'] }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="daily">Diária</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensal</option>
                  <option value="yearly">Anual</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor *</label>
              <input type="number" step="0.01" min="0.01" value={form.amount || ''}
                onChange={(e) => setForm((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0,00" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Conta bancária *</label>
              <select value={form.accountId}
                onChange={(e) => setForm((p) => ({ ...p, accountId: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required>
                <option value="">Selecione...</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select value={form.categoryId}
                onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">Sem categoria</option>
                {filteredCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {editingId ? 'Próximo vencimento *' : 'Primeiro vencimento *'}
                </label>
                <input type="date" value={form.startDate}
                  onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Encerra em (opcional)</label>
                <input type="date" value={form.endDate}
                  onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
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
