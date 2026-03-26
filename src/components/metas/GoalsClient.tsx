'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createGoal, updateGoal, deleteGoal, contributeToGoal } from '@/actions/goals'
import {
  Plus, Loader2, Target, Trash2, Pencil, PlusCircle, CheckCircle2,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import type { Goal, BankAccount } from '@/lib/db/schema'

interface GoalsClientProps {
  goals: Goal[]
  accounts: BankAccount[]
}

type GoalForm = { name: string; targetAmount: number; deadline: string }
const defaultGoalForm: GoalForm = { name: '', targetAmount: 0, deadline: '' }

type ContribForm = { amount: number; accountId: string }

export function GoalsClient({ goals, accounts }: GoalsClientProps) {
  const router = useRouter()

  // Create / edit modal
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [goalForm, setGoalForm] = useState<GoalForm>(defaultGoalForm)
  const [goalLoading, setGoalLoading] = useState(false)
  const [goalError, setGoalError] = useState('')

  // Contribute modal
  const [contributeTarget, setContributeTarget] = useState<Goal | null>(null)
  const [contribForm, setContribForm] = useState<ContribForm>({
    amount: 0,
    accountId: accounts[0]?.id || '',
  })
  const [contribLoading, setContribLoading] = useState(false)
  const [contribError, setContribError] = useState('')

  const getProgress = (goal: Goal) => {
    const current = parseFloat(goal.currentAmount as string)
    const target = parseFloat(goal.targetAmount as string)
    return target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0
  }

  // ── Goal CRUD ────────────────────────────────────────────────────
  const handleOpenCreate = () => {
    setEditingGoal(null)
    setGoalForm(defaultGoalForm)
    setGoalError('')
    setShowGoalModal(true)
  }

  const handleOpenEdit = (goal: Goal) => {
    setEditingGoal(goal)
    setGoalForm({
      name: goal.name,
      targetAmount: parseFloat(goal.targetAmount as string),
      deadline: goal.deadline
        ? new Date(goal.deadline).toISOString().split('T')[0]
        : '',
    })
    setGoalError('')
    setShowGoalModal(true)
  }

  const handleGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGoalLoading(true)
    setGoalError('')

    const payload = {
      name: goalForm.name,
      targetAmount: goalForm.targetAmount,
      deadline: goalForm.deadline ? new Date(goalForm.deadline) : undefined,
    }

    const result = editingGoal
      ? await updateGoal(editingGoal.id, payload)
      : await createGoal(payload)

    if (result?.error) {
      setGoalError(result.error)
      setGoalLoading(false)
      return
    }

    setShowGoalModal(false)
    setGoalLoading(false)
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta meta?')) return
    const result = await deleteGoal(id)
    if (result?.error) { alert(result.error); return }
    router.refresh()
  }

  // ── Contribute ───────────────────────────────────────────────────
  const handleOpenContribute = (goal: Goal) => {
    setContributeTarget(goal)
    setContribForm({ amount: 0, accountId: accounts[0]?.id || '' })
    setContribError('')
  }

  const handleContributeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contributeTarget) return
    setContribLoading(true)
    setContribError('')

    const result = await contributeToGoal(
      contributeTarget.id,
      contribForm.amount,
      contribForm.accountId
    )

    if (result?.error) {
      setContribError(result.error)
      setContribLoading(false)
      return
    }

    if (result?.isCompleted) {
      alert(`🎉 Parabéns! A meta "${contributeTarget.name}" foi concluída!`)
    }

    setContributeTarget(null)
    setContribLoading(false)
    router.refresh()
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Metas</h1>
          <p className="text-gray-500">Defina e acompanhe suas metas de economia</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition"
        >
          <Plus size={18} />
          Nova Meta
        </button>
      </div>

      {/* Goal cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.map((goal) => {
          const progress = getProgress(goal)
          const current = parseFloat(goal.currentAmount as string)
          const target = parseFloat(goal.targetAmount as string)
          const remaining = Math.max(target - current, 0)

          return (
            <div
              key={goal.id}
              className={`bg-white rounded-xl border p-6 ${
                goal.isCompleted ? 'border-green-200 bg-green-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    goal.isCompleted ? 'bg-green-100' : 'bg-blue-100'
                  }`}>
                    {goal.isCompleted
                      ? <CheckCircle2 className="text-green-600" size={20} />
                      : <Target className="text-blue-600" size={20} />
                    }
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
                <div className="flex gap-1">
                  {!goal.isCompleted && (
                    <button
                      onClick={() => handleOpenEdit(goal)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(goal.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Excluir"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{progress}% concluído</span>
                  <span>{formatCurrency(current)} / {formatCurrency(target)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all ${
                      goal.isCompleted ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {!goal.isCompleted && (
                  <p className="text-xs text-gray-500 mt-1">
                    Faltam {formatCurrency(remaining)}
                  </p>
                )}
              </div>

              {/* Contribute button */}
              {!goal.isCompleted && accounts.length > 0 && (
                <button
                  onClick={() => handleOpenContribute(goal)}
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition"
                >
                  <PlusCircle size={15} />
                  Contribuir
                </button>
              )}

              {goal.isCompleted && (
                <div className="flex items-center justify-center gap-1.5 text-sm text-green-600 font-medium">
                  <CheckCircle2 size={15} />
                  Meta concluída!
                </div>
              )}
            </div>
          )
        })}
      </div>

      {goals.length === 0 && (
        <div className="text-center py-12">
          <Target className="mx-auto text-gray-300" size={48} />
          <p className="mt-4 text-gray-500">Nenhuma meta cadastrada</p>
          <button
            onClick={handleOpenCreate}
            className="mt-4 text-blue-600 hover:underline font-medium"
          >
            Criar primeira meta
          </button>
        </div>
      )}

      {/* Create / Edit modal */}
      {showGoalModal && (
        <Modal
          title={editingGoal ? 'Editar Meta' : 'Nova Meta'}
          onClose={() => setShowGoalModal(false)}
        >
          <form onSubmit={handleGoalSubmit} className="space-y-4">
            {goalError && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{goalError}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Meta</label>
              <input
                type="text"
                value={goalForm.name}
                onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })}
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
                value={goalForm.targetAmount || ''}
                onChange={(e) => setGoalForm({ ...goalForm, targetAmount: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0,00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prazo (opcional)</label>
              <input
                type="date"
                value={goalForm.deadline}
                onChange={(e) => setGoalForm({ ...goalForm, deadline: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowGoalModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={goalLoading}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {goalLoading && <Loader2 className="animate-spin" size={18} />}
                {editingGoal ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Contribute modal */}
      {contributeTarget && (
        <Modal
          title={`Contribuir para: ${contributeTarget.name}`}
          onClose={() => setContributeTarget(null)}
        >
          <form onSubmit={handleContributeSubmit} className="space-y-4">
            {contribError && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{contribError}</div>
            )}

            <div className="bg-blue-50 rounded-lg px-4 py-3 text-sm text-blue-700">
              Progresso atual: {formatCurrency(parseFloat(contributeTarget.currentAmount as string))} /{' '}
              {formatCurrency(parseFloat(contributeTarget.targetAmount as string))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Conta de Origem</label>
              <select
                value={contribForm.accountId}
                onChange={(e) => setContribForm({ ...contribForm, accountId: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} — {formatCurrency(parseFloat(acc.balance as string))}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor da Contribuição</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={contribForm.amount || ''}
                onChange={(e) => setContribForm({ ...contribForm, amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0,00"
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setContributeTarget(null)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={contribLoading}
                className="flex-1 bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {contribLoading && <Loader2 className="animate-spin" size={18} />}
                Contribuir
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
