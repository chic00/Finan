'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createOrUpdateBudget, deleteBudget } from '@/actions/budgets'
import { Plus, Loader2, AlertTriangle, CheckCircle, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
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
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export function OrcamentosClient({
  budgets,
  categories,
  currentMonth,
  currentYear,
}: OrcamentosClientProps) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    categoryId: '',
    amount: 0,
    month: currentMonth,
    year: currentYear,
  })

  const alerts = budgets.filter((b) => b.percent >= 80)
  const expenseCategories = categories.filter((c) => c.type === 'expense')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await createOrUpdateBudget(form)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    setShowModal(false)
    setForm({ categoryId: '', amount: 0, month: currentMonth, year: currentYear })
    setLoading(false)
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este orçamento?')) return
    const result = await deleteBudget(id)
    if (result?.error) { alert(result.error); return }
    router.refresh()
  }

  const getBarColor = (b: BudgetWithSpent) => {
    if (b.isOverBudget) return 'bg-red-500'
    if (b.isNearLimit) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orçamentos</h1>
          <p className="text-gray-500">
            {MONTHS[currentMonth - 1]} {currentYear} — {budgets.length} orçamento(s)
          </p>
        </div>
        <button
          onClick={() => { setError(''); setShowModal(true) }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition"
        >
          <Plus size={18} />
          Novo Orçamento
        </button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((b) => (
            <div
              key={b.id}
              className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${
                b.isOverBudget
                  ? 'bg-red-50 border-red-200'
                  : 'bg-yellow-50 border-yellow-200'
              }`}
            >
              <AlertTriangle
                className={b.isOverBudget ? 'text-red-500' : 'text-yellow-500'}
                size={18}
              />
              <p className={`text-sm ${b.isOverBudget ? 'text-red-700' : 'text-yellow-700'}`}>
                <strong>{b.category.name}:</strong>{' '}
                {b.isOverBudget
                  ? `Orçamento estourado! Gasto ${formatCurrency(b.spent)} de ${formatCurrency(parseFloat(b.amount))} (${b.percent}%)`
                  : `Atenção: ${b.percent}% do orçamento utilizado`}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Budget cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {budgets.map((budget) => {
          const budgetAmount = parseFloat(budget.amount)
          const remaining = Math.max(budgetAmount - budget.spent, 0)

          return (
            <div key={budget.id} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: budget.category.color || '#6B7280' }}
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900">{budget.category.name}</h3>
                    <p className="text-xs text-gray-500">{MONTHS[budget.month - 1]} {budget.year}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(budget.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{budget.percent}% utilizado</span>
                  <span>{formatCurrency(budget.spent)} / {formatCurrency(budgetAmount)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${getBarColor(budget)}`}
                    style={{ width: `${Math.min(budget.percent, 100)}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Restante</span>
                <span className={`font-medium ${budget.isOverBudget ? 'text-red-600' : 'text-gray-900'}`}>
                  {budget.isOverBudget
                    ? `−${formatCurrency(budget.spent - budgetAmount)}`
                    : formatCurrency(remaining)}
                </span>
              </div>

              {budget.percent >= 100 && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-red-600">
                  <AlertTriangle size={12} />
                  Orçamento esgotado
                </div>
              )}
            </div>
          )
        })}
      </div>

      {budgets.length === 0 && (
        <div className="text-center py-12">
          <CheckCircle className="mx-auto text-gray-300" size={48} />
          <p className="mt-4 text-gray-500">Nenhum orçamento definido para este mês</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 text-blue-600 hover:underline font-medium"
          >
            Criar primeiro orçamento
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <Modal title="Novo Orçamento" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              >
                <option value="">Selecione uma categoria</option>
                {expenseCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor do Orçamento</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.amount || ''}
                onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0,00"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mês</label>
                <select
                  value={form.month}
                  onChange={(e) => setForm({ ...form, month: parseInt(e.target.value) })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {MONTHS.map((name, i) => (
                    <option key={i + 1} value={i + 1}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
                <select
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="animate-spin" size={18} />}
                Salvar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
