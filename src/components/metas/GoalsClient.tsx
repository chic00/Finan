'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createGoal, deleteGoal } from '@/actions/goals'
import { Plus, Loader2, Target, Trash2, TrendingUp } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import type { Goal } from '@/lib/db/schema'

interface GoalsClientProps {
  goals: Goal[]
}

export function GoalsClient({ goals }: GoalsClientProps) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    targetAmount: 0,
    deadline: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const result = await createGoal({
      ...form,
      targetAmount: parseFloat(form.targetAmount.toString()),
      deadline: form.deadline ? new Date(form.deadline) : undefined,
    })

    if (result?.error) {
      setLoading(false)
      return
    }

    setShowModal(false)
    setForm({ name: '', targetAmount: 0, deadline: '' })
    setLoading(false)
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta meta?')) return
    await deleteGoal(id)
    router.refresh()
  }

  const getProgress = (goal: Goal) => {
    const current = parseFloat(goal.currentAmount as string)
    const target = parseFloat(goal.targetAmount as string)
    return Math.min(Math.round((current / target) * 100), 100)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Metas</h1>
          <p className="text-gray-500">Defina e acompanhe suas metas de economia</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition"
        >
          <Plus size={18} />
          Nova Meta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.map((goal) => {
          const progress = getProgress(goal)
          const current = parseFloat(goal.currentAmount as string)
          const target = parseFloat(goal.targetAmount as string)
          const remaining = Math.max(target - current, 0)

          return (
            <div key={goal.id} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Target className="text-green-600" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{goal.name}</h3>
                    {goal.deadline && (
                      <p className="text-xs text-gray-500">
                        Prazo: {formatDate(goal.deadline, 'long')}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(goal.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">{progress}% concluído</span>
                  <span className="font-medium text-gray-900">{formatCurrency(current)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-green-600 h-2.5 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Faltam {formatCurrency(remaining)}
                </p>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">Meta</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(target)}</p>
              </div>
            </div>
          )
        })}
      </div>

      {goals.length === 0 && (
        <div className="text-center py-12">
          <Target className="mx-auto text-gray-300" size={48} />
          <p className="mt-4 text-gray-500">Nenhuma meta cadastrada</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 text-blue-600 hover:underline font-medium"
          >
            Criar primeira meta
          </button>
        </div>
      )}

      {showModal && (
        <Modal title="Nova Meta" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Meta</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ex: Reserva de Emergência"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor Alvo</label>
              <input
                type="number"
                step="0.01"
                min="1"
                value={form.targetAmount}
                onChange={(e) => setForm({ ...form, targetAmount: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prazo (opcional)</label>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
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
                Criar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
