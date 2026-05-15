'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createTransaction, updateTransaction, deleteTransaction } from '@/actions/transactions'
import {
  Plus, Pencil, Trash2, Loader2,
  ArrowUpRight, ArrowDownLeft, ArrowLeftRight,
  Filter, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useToast } from '@/components/ui/Toast'
import type { BankAccount, Category } from '@/lib/db/schema'

interface TransactionWithDetails {
  id: string
  type: string
  amount: string
  description: string | null
  date: Date
  account: { id: string; name: string }
  toAccount?: { id: string; name: string } | null
  category?: { id: string; name: string; color: string | null } | null
}

interface TransactionsClientProps {
  transactions: TransactionWithDetails[]
  accounts: BankAccount[]
  categories: Category[]
  currentMonth: number
  currentYear: number
}

type FormState = {
  accountId: string
  toAccountId: string
  categoryId: string
  type: 'income' | 'expense' | 'transfer'
  amount: number
  description: string
  date: string
}

const defaultForm = (accountId = ''): FormState => ({
  accountId,
  toAccountId: '',
  categoryId: '',
  type: 'expense',
  amount: 0,
  description: '',
  date: new Date().toISOString().split('T')[0],
})

const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

const PAGE_SIZE = 20

export function TransactionsClient({
  transactions,
  accounts,
  categories,
  currentMonth,
  currentYear,
}: TransactionsClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [showModal, setShowModal]         = useState(false)
  const [editingId, setEditingId]         = useState<string | null>(null)
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState('')
  const [filterType, setFilterType]       = useState<string>('all')
  const [month, setMonth]                 = useState(currentMonth)
  const [year, setYear]                   = useState(currentYear)
  const [form, setForm]                   = useState<FormState>(defaultForm(accounts[0]?.id))
  const [page, setPage]                   = useState(1)
  const [deletingId, setDeletingId]       = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Filtragem
  const filtered = filterType === 'all'
    ? transactions
    : transactions.filter(t => t.type === filterType)

  // Paginação
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleFilterChange = (type: string) => {
    setFilterType(type)
    setPage(1)
  }

  const getTypeColor = (type: string) => {
    if (type === 'income')   return 'var(--color-success)'
    if (type === 'expense')  return 'var(--color-destructive)'
    return 'var(--color-primary)'
  }

  const getIconBg = (type: string) => {
    if (type === 'income')  return 'color-mix(in srgb, var(--color-success) 15%, transparent)'
    if (type === 'expense') return 'color-mix(in srgb, var(--color-destructive) 15%, transparent)'
    return 'color-mix(in srgb, var(--color-primary) 15%, transparent)'
  }

  const formatAmount = (amount: string | number, type: string) => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount
    const prefix = type === 'income' ? '+' : type === 'expense' ? '-' : ''
    return `${prefix}${formatCurrency(value)}`
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    let newMonth = month + (direction === 'next' ? 1 : -1)
    let newYear  = year
    if (newMonth > 11) { newMonth = 0; newYear++ }
    if (newMonth < 0)  { newMonth = 11; newYear-- }
    setMonth(newMonth)
    setYear(newYear)
    setPage(1)
    router.push(`/dashboard/transacoes?month=${newMonth}&year=${newYear}`)
  }

  const handleOpenCreate = () => {
    setEditingId(null); setForm(defaultForm(accounts[0]?.id)); setError(''); setShowModal(true)
  }

  const handleOpenEdit = (t: TransactionWithDetails) => {
    setEditingId(t.id)
    setForm({
      accountId:   t.account.id,
      toAccountId: t.toAccount?.id || '',
      categoryId:  t.category?.id || '',
      type:        t.type as FormState['type'],
      amount:      parseFloat(t.amount),
      description: t.description || '',
      date:        new Date(t.date).toISOString().split('T')[0],
    })
    setError(''); setShowModal(true)
  }

  const handleClose = () => { setShowModal(false); setEditingId(null); setError('') }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('')
    const payload = {
      ...form,
      amount:      parseFloat(form.amount.toString()),
      date:        new Date(form.date + 'T12:00:00'),
      toAccountId: form.toAccountId || undefined,
      categoryId:  form.categoryId  || undefined,
    }
    const result = editingId
      ? await updateTransaction(editingId, payload)
      : await createTransaction(payload)
    if (result?.error) { setError(result.error); setLoading(false); return }
    setShowModal(false); setEditingId(null); setLoading(false)
    router.refresh()
  }

  const handleDeleteConfirm = async () => {
    if (!deletingId) return
    setDeleteLoading(true)
    const result = await deleteTransaction(deletingId)
    setDeleteLoading(false)
    setDeletingId(null)
    if (result?.error) { toast(result.error, 'error'); return }
    toast('Transação excluída com sucesso')
    router.refresh()
  }

  const filteredCategories = categories.filter(c => c.type === form.type)

  const filterOptions = [
    { value: 'all',      label: 'Todas' },
    { value: 'income',   label: 'Receitas' },
    { value: 'expense',  label: 'Despesas' },
    { value: 'transfer', label: 'Transferências' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>Transações</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted-foreground)' }}>Gerencie suas receitas e despesas</p>
        </div>
        <button onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all glow-primary"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>
          <Plus size={18} /> Nova Transação
        </button>
      </div>

      {/* Month navigator */}
      <div className="flex items-center gap-4 rounded-2xl px-4 py-3"
        style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <button onClick={() => navigateMonth('prev')} className="p-1.5 rounded-lg transition-all"
          style={{ color: 'var(--color-foreground)' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-secondary)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}>
          <ChevronLeft size={18} />
        </button>
        <span className="font-semibold flex-1 text-center" style={{ color: 'var(--color-foreground)' }}>
          {MONTHS[month]} {year}
        </span>
        <button onClick={() => navigateMonth('next')} className="p-1.5 rounded-lg transition-all"
          style={{ color: month === new Date().getMonth() && year === new Date().getFullYear() ? 'var(--color-muted-foreground)' : 'var(--color-foreground)' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-secondary)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}
          disabled={month === new Date().getMonth() && year === new Date().getFullYear()}>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        {(['income', 'expense', 'transfer'] as const).map((type) => {
          const total = transactions.filter(t => t.type === type).reduce((s, t) => s + parseFloat(t.amount), 0)
          const label = type === 'income' ? 'Receitas' : type === 'expense' ? 'Despesas' : 'Transferências'
          return (
            <div key={type} className="rounded-2xl p-4"
              style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--color-muted-foreground)' }}>{label}</p>
              <p className="text-lg font-bold" style={{ color: getTypeColor(type) }}>{formatCurrency(total)}</p>
            </div>
          )
        })}
      </div>

      {/* Type filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={16} style={{ color: 'var(--color-muted-foreground)' }} />
        {filterOptions.map(({ value, label }) => (
          <button key={value} onClick={() => handleFilterChange(value)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              backgroundColor: filterType === value ? 'color-mix(in srgb, var(--color-primary) 15%, transparent)' : 'transparent',
              color:           filterType === value ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
              border:          filterType === value ? '1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)' : '1px solid transparent',
            }}>
            {label}
          </button>
        ))}
        {filtered.length > 0 && (
          <span className="ml-auto text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            {filtered.length} transação{filtered.length !== 1 ? 'ões' : ''}
          </span>
        )}
      </div>

      {/* Transactions list */}
      <div className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        {paginated.map((t, i) => (
          <div key={t.id} className="flex items-center justify-between p-4 transition-colors"
            style={{ borderBottom: i < paginated.length - 1 ? '1px solid var(--color-border)' : 'none' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-secondary)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: getIconBg(t.type) }}>
                {t.type === 'income'   && <ArrowUpRight   size={16} style={{ color: 'var(--color-success)' }} />}
                {t.type === 'expense'  && <ArrowDownLeft  size={16} style={{ color: 'var(--color-destructive)' }} />}
                {t.type === 'transfer' && <ArrowLeftRight size={16} style={{ color: 'var(--color-primary)' }} />}
              </div>
              <div>
                <p className="font-medium text-sm" style={{ color: 'var(--color-foreground)' }}>
                  {t.description || t.category?.name || 'Transação'}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
                  {t.category?.name || 'Sem categoria'} • {t.account.name}
                  {t.toAccount && ` → ${t.toAccount.name}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="font-semibold text-sm" style={{ color: getTypeColor(t.type) }}>
                  {formatAmount(t.amount, t.type)}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{formatDate(t.date)}</p>
              </div>
              <button onClick={() => handleOpenEdit(t)} className="p-1.5 rounded-lg transition-all"
                style={{ color: 'var(--color-muted-foreground)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-primary)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'color-mix(in srgb, var(--color-primary) 10%, transparent)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-muted-foreground)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}>
                <Pencil size={14} />
              </button>
              <button onClick={() => setDeletingId(t.id)} className="p-1.5 rounded-lg transition-all"
                style={{ color: 'var(--color-muted-foreground)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-destructive)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'color-mix(in srgb, var(--color-destructive) 10%, transparent)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-muted-foreground)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}

        {paginated.length === 0 && (
          <div className="text-center py-16">
            <ArrowLeftRight size={48} className="mx-auto mb-4" style={{ color: 'var(--color-muted-foreground)' }} />
            <p style={{ color: 'var(--color-muted-foreground)' }}>Nenhuma transação encontrada</p>
            <button onClick={handleOpenCreate} className="mt-3 text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
              Adicionar transação
            </button>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            Página {page} de {totalPages} · {filtered.length} transações
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-xl transition-all disabled:opacity-40"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-foreground)', backgroundColor: 'var(--color-card)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-secondary)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-card)'}>
              <ChevronLeft size={16} />
            </button>

            {/* Page numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...')
                acc.push(p)
                return acc
              }, [])
              .map((p, i) =>
                p === '...'
                  ? <span key={`ellipsis-${i}`} className="px-2 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>…</span>
                  : (
                    <button key={p} onClick={() => setPage(p as number)}
                      className="w-9 h-9 rounded-xl text-sm font-medium transition-all"
                      style={{
                        backgroundColor: page === p ? 'var(--color-primary)' : 'var(--color-card)',
                        color:           page === p ? 'var(--color-primary-foreground)' : 'var(--color-foreground)',
                        border:          page === p ? 'none' : '1px solid var(--color-border)',
                      }}>
                      {p}
                    </button>
                  )
              )}

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-xl transition-all disabled:opacity-40"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-foreground)', backgroundColor: 'var(--color-card)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-secondary)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-card)'}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {deletingId && (
        <ConfirmModal
          title="Excluir transação"
          description="O saldo da conta será revertido. Esta ação não pode ser desfeita."
          confirmLabel="Excluir"
          variant="danger"
          loading={deleteLoading}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingId(null)}
        />
      )}

      {/* Modal criar/editar */}
      {showModal && (
        <Modal title={editingId ? 'Editar Transação' : 'Nova Transação'} onClose={handleClose}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="px-4 py-3 rounded-xl text-sm"
                style={{ backgroundColor: 'color-mix(in srgb, var(--color-destructive) 10%, transparent)', color: 'var(--color-destructive)' }}>
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>Tipo</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as FormState['type'], categoryId: '' })}
                className="w-full px-4 py-2.5 rounded-xl outline-none transition-all theme-select">
                <option value="expense">Despesa</option>
                <option value="income">Receita</option>
                <option value="transfer">Transferência</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>
                {form.type === 'transfer' ? 'Conta Origem' : 'Conta'}
              </label>
              <select value={form.accountId} onChange={e => setForm({ ...form, accountId: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl outline-none transition-all theme-select" required>
                <option value="">Selecione uma conta</option>
                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
              </select>
            </div>
            {form.type === 'transfer' && (
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>Conta Destino</label>
                <select value={form.toAccountId} onChange={e => setForm({ ...form, toAccountId: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl outline-none transition-all theme-select" required>
                  <option value="">Selecione a conta destino</option>
                  {accounts.filter(a => a.id !== form.accountId).map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
              </div>
            )}
            {form.type !== 'transfer' && (
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>Categoria</label>
                <select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl outline-none transition-all theme-select">
                  <option value="">Sem categoria</option>
                  {filteredCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>Valor</label>
              <input type="number" step="0.01" min="0.01" value={form.amount || ''}
                onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 rounded-xl outline-none transition-all theme-input"
                placeholder="0,00" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>Descrição</label>
              <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl outline-none transition-all theme-input"
                placeholder="Ex: Supermercado" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>Data</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl outline-none transition-all theme-input" required />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={handleClose} className="flex-1 px-4 py-2.5 rounded-xl font-medium transition-all"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}>
                Cancelar
              </button>
              <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2 glow-primary"
                style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>
                {loading && <Loader2 className="animate-spin" size={18} />}
                {editingId ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
