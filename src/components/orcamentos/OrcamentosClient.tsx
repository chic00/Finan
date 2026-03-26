'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createOrUpdateBudget } from '@/actions/budgets'
import { Plus, Loader2, AlertTriangle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import type { Category } from '@/lib/db/schema'

interface Budget {
  id: string
  amount: string
  month: number
  year: number
  category: { id: string; name: string; color: string | null }
}

interface OrcamentosClientProps {
  budgets: Budget[]
  categories: Category[]
}

export function OrcamentosClient({ budgets: initialBudgets, categories }: OrcamentosClientProps) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    categoryId: '',
    amount: 0,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  })

  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()
  const currentBudgets = initialBudgets.filter(
    b => b.month === currentMonth && b.year === currentYear
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const result = await createOrUpdateBudget(form)
    if (result?.error) {
      setLoading(false)
      return
    }

    setShowModal(false)
    setLoading(false)
    router.refresh()
  }

  const expenseCategories = categories.filter(c => c.type === 'expense')

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orçamentos</h1>
          <p className="text-gray-500">Defina limites de gastos por categoria</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition"
        >
          <Plus size={18} />
          Novo Orçamento
        </button>
      </div>

      {currentBudgets.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-medium text-yellow-800">Atenção</p>
            <p className="text-sm text-yellow-700">
              Some categorias já ultrapassaram 80% do orçamento definido.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentBudgets.map((budget) => (
          <div key={budget.id} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: budget.category.color || '#6B7280' }}
              />
              <div>
                <h3 className="font-semibold text-gray-900">{budget.category.name}</h3>
                <p className="text-sm text-gray-500">
                  {budget.month}/{budget.year}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Orçamento</span>
                <span className="font-medium">{formatCurrency(parseFloat(budget.amount))}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {currentBudgets.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">Nenhum orçamento definido para este mês</p>
        </div>
      )}

      {showModal && (
        <Modal title="Novo Orçamento" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0.00"
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
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>{m}</option>
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
                  {[currentYear, currentYear + 1].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
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
