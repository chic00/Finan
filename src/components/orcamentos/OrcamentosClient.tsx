'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createOrUpdateBudget, updateBudget, deleteBudget } from '@/actions/budgets'
import { Plus, Loader2, AlertTriangle, Trash2, Pencil } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import type { Category } from '@/lib/db/schema'

interface BudgetWithSpent {
  id: string
  amount: string
  month: number
  year: number
  spent: number
  percent: number
  isOverBudget: boolean
  isNearLimit: boolean
  category: { id: string; name: string; color: string | null }
}

interface OrcamentosClientProps {
  budgets: BudgetWithSpent[]
  categories: Category[]
  currentMonth: number
  currentYear: number
}

const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

export function OrcamentosClient({ budgets, categories, currentMonth, currentYear }: OrcamentosClientProps) {
  const router = useRouter()
  const [showCreateModal, setShowCreateModal]   = useState(false)
  const [createLoading, setCreateLoading]       = useState(false)
  const [createError, setCreateError]           = useState('')
  const [createForm, setCreateForm]             = useState({ categoryId: '', amount: 0, month: currentMonth, year: currentYear })
  const [editingBudget, setEditingBudget]       = useState<BudgetWithSpent | null>(null)
  const [editAmount, setEditAmount]             = useState(0)
  const [editLoading, setEditLoading]           = useState(false)
  const [editError, setEditError]               = useState('')
  const [deletingId, setDeletingId]             = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading]       = useState(false)

  const alerts            = budgets.filter(b => b.percent >= 80)
  const expenseCategories = categories.filter(c => c.type === 'expense')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setCreateLoading(true); setCreateError('')
    const result = await createOrUpdateBudget(createForm)
    setCreateLoading(false)
    if (result?.error) { setCreateError(result.error); return }
    setShowCreateModal(false)
    setCreateForm({ categoryId: '', amount: 0, month: currentMonth, year: currentYear })
    router.refresh()
  }

  const handleOpenEdit = (b: BudgetWithSpent) => {
    setEditingBudget(b); setEditAmount(parseFloat(b.amount)); setEditError('')
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingBudget) return
    setEditLoading(true); setEditError('')
    const result = await updateBudget(editingBudget.id, editAmount)
    setEditLoading(false)
    if (result?.error) { setEditError(result.error); return }
    setEditingBudget(null); router.refresh()
  }

  const handleDeleteConfirm = async () => {
    if (!deletingId) return
    setDeleteLoading(true)
    const result = await deleteBudget(deletingId)
    setDeleteLoading(false)
    setDeletingId(null)
    if (result?.error) { alert(result.error); return }
    router.refresh()
  }

  const getBarColor = (b: BudgetWithSpent) => {
    if (b.isOverBudget) return 'var(--color-destructive)'
    if (b.isNearLimit)  return 'var(--color-warning)'
    return 'var(--color-success)'
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>Orçamentos</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
            {MONTHS[currentMonth - 1]} {currentYear} — {budgets.length} orçamento(s)
          </p>
        </div>
        <button onClick={() => { setCreateError(''); setShowCreateModal(true) }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all glow-primary"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>
          <Plus size={18} /> Novo Orçamento
        </button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map(b => (
            <div key={b.id} className="flex items-start gap-3 px-4 py-3 rounded-xl"
              style={{
                backgroundColor: b.isOverBudget ? 'color-mix(in srgb, var(--color-destructive) 10%, transparent)' : 'color-mix(in srgb, var(--color-warning) 10%, transparent)',
                border: `1px solid ${b.isOverBudget ? 'color-mix(in srgb, var(--color-destructive) 25%, transparent)' : 'color-mix(in srgb, var(--color-warning) 25%, transparent)'}`,
              }}>
              <AlertTriangle size={18} style={{ color: b.isOverBudget ? 'var(--color-destructive)' : 'var(--color-warning)', flexShrink: 0, marginTop: 1 }} />
              <p className="text-sm" style={{ color: b.isOverBudget ? 'var(--color-destructive)' : 'var(--color-warning)' }}>
                <strong>{b.category.name}:</strong>{' '}
                {b.isOverBudget
                  ? `Orçamento estourado! Gasto ${formatCurrency(b.spent)} de ${formatCurrency(parseFloat(b.amount))} (${b.percent}%)`
                  : `Atenção: ${b.percent}% do orçamento utilizado`}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {budgets.map(budget => {
          const budgetAmount = parseFloat(budget.amount)
          const remaining    = Math.max(budgetAmount - budget.spent, 0)
          return (
            <div key={budget.id} className="rounded-2xl p-6 transition-all hover:scale-[1.01]"
              style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex-shrink-0"
                    style={{ backgroundColor: budget.category.color || '#6B7280' }} />
                  <div>
                    <h3 className="font-semibold" style={{ color: 'var(--color-foreground)' }}>{budget.category.name}</h3>
                    <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{MONTHS[budget.month - 1]} {budget.year}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleOpenEdit(budget)} className="p-1.5 rounded-lg transition-all"
                    style={{ color: 'var(--color-muted-foreground)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-primary)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'color-mix(in srgb, var(--color-primary) 10%, transparent)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-muted-foreground)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}>
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => setDeletingId(budget.id)} className="p-1.5 rounded-lg transition-all"
                    style={{ color: 'var(--color-muted-foreground)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-destructive)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'color-mix(in srgb, var(--color-destructive) 10%, transparent)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-muted-foreground)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--color-muted-foreground)' }}>
                  <span>{budget.percent}% utilizado</span>
                  <span>{formatCurrency(budget.spent)} / {formatCurrency(budgetAmount)}</span>
                </div>
                <div className="w-full rounded-full h-2" style={{ backgroundColor: 'var(--color-border)' }}>
                  <div className="h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(budget.percent, 100)}%`, backgroundColor: getBarColor(budget) }} />
                </div>
              </div>

              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--color-muted-foreground)' }}>Restante</span>
                <span className="font-medium"
                  style={{ color: budget.isOverBudget ? 'var(--color-destructive)' : 'var(--color-foreground)' }}>
                  {budget.isOverBudget
                    ? `−${formatCurrency(budget.spent - budgetAmount)}`
                    : formatCurrency(remaining)}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {budgets.length === 0 && (
        <div className="text-center py-16 rounded-2xl"
          style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <p className="mb-4" style={{ color: 'var(--color-muted-foreground)' }}>Nenhum orçamento definido para este mês</p>
          <button onClick={() => setShowCreateModal(true)} className="font-medium" style={{ color: 'var(--color-primary)' }}>
            Criar primeiro orçamento
          </button>
        </div>
      )}

      {/* Confirm delete */}
      {deletingId && (
        <ConfirmModal
          title="Excluir orçamento"
          description="Este orçamento será removido. Os gastos já registrados não serão afetados."
          confirmLabel="Excluir"
          variant="danger"
          loading={deleteLoading}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingId(null)}
        />
      )}

      {/* Modal CRIAR */}
      {showCreateModal && (
        <Modal title="Novo Orçamento" onClose={() => setShowCreateModal(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            {createError && (
              <div className="px-4 py-3 rounded-xl text-sm"
                style={{ backgroundColor: 'color-mix(in srgb, var(--color-destructive) 10%, transparent)', color: 'var(--color-destructive)' }}>
                {createError}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>Categoria</label>
              <select value={createForm.categoryId} onChange={e => setCreateForm({ ...createForm, categoryId: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl outline-none transition-all theme-select" required>
                <option value="">Selecione uma categoria</option>
                {expenseCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>Valor do Orçamento</label>
              <input type="number" step="0.01" min="0.01" value={createForm.amount || ''}
                onChange={e => setCreateForm({ ...createForm, amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 rounded-xl outline-none transition-all theme-input"
                placeholder="0,00" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>Mês</label>
                <select value={createForm.month} onChange={e => setCreateForm({ ...createForm, month: parseInt(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl outline-none transition-all theme-select">
                  {MONTHS.map((name, i) => <option key={i + 1} value={i + 1}>{name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>Ano</label>
                <select value={createForm.year} onChange={e => setCreateForm({ ...createForm, year: parseInt(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl outline-none transition-all theme-select">
                  {[currentYear - 1, currentYear, currentYear + 1].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl font-medium transition-all"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}>
                Cancelar
              </button>
              <button type="submit" disabled={createLoading}
                className="flex-1 py-2.5 rounded-xl font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2 glow-primary"
                style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>
                {createLoading && <Loader2 className="animate-spin" size={18} />}
                Salvar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal EDITAR */}
      {editingBudget && (
        <Modal title={`Editar orçamento — ${editingBudget.category.name}`} onClose={() => setEditingBudget(null)}>
          <form onSubmit={handleEdit} className="space-y-4">
            {editError && (
              <div className="px-4 py-3 rounded-xl text-sm"
                style={{ backgroundColor: 'color-mix(in srgb, var(--color-destructive) 10%, transparent)', color: 'var(--color-destructive)' }}>
                {editError}
              </div>
            )}
            <div className="px-4 py-3 rounded-xl text-sm"
              style={{ backgroundColor: 'var(--color-secondary)', color: 'var(--color-muted-foreground)' }}>
              {MONTHS[editingBudget.month - 1]} {editingBudget.year} — já gasto:{' '}
              <strong style={{ color: 'var(--color-foreground)' }}>{formatCurrency(editingBudget.spent)}</strong>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>Novo valor do orçamento</label>
              <input type="number" step="0.01" min="0.01" value={editAmount || ''}
                onChange={e => setEditAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2.5 rounded-xl outline-none transition-all theme-input"
                placeholder="0,00" required autoFocus />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEditingBudget(null)}
                className="flex-1 px-4 py-2.5 rounded-xl font-medium transition-all"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}>
                Cancelar
              </button>
              <button type="submit" disabled={editLoading}
                className="flex-1 py-2.5 rounded-xl font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2 glow-primary"
                style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>
                {editLoading && <Loader2 className="animate-spin" size={18} />}
                Salvar alterações
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
