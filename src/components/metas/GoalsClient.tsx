'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createGoal, updateGoal, deleteGoal, contributeToGoal } from '@/actions/goals'
import { Plus, Loader2, Target, Trash2, Pencil, PlusCircle, CheckCircle2 } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useToast } from '@/components/ui/Toast'
import type { Goal, BankAccount } from '@/lib/db/schema'

interface GoalsClientProps { goals: Goal[]; accounts: BankAccount[] }

type GoalForm = { name: string; targetAmount: number; deadline: string }
const defaultGoalForm: GoalForm = { name: '', targetAmount: 0, deadline: '' }
type ContribForm = { amount: number; accountId: string }

export function GoalsClient({ goals, accounts }: GoalsClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [showGoalModal, setShowGoalModal]       = useState(false)
  const [editingGoal, setEditingGoal]           = useState<Goal | null>(null)
  const [goalForm, setGoalForm]                 = useState<GoalForm>(defaultGoalForm)
  const [goalLoading, setGoalLoading]           = useState(false)
  const [goalError, setGoalError]               = useState('')
  const [contributeTarget, setContributeTarget] = useState<Goal | null>(null)
  const [contribForm, setContribForm]           = useState<ContribForm>({ amount: 0, accountId: accounts[0]?.id || '' })
  const [contribLoading, setContribLoading]     = useState(false)
  const [contribError, setContribError]         = useState('')
  const [deletingId, setDeletingId]             = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading]       = useState(false)

  const getProgress = (goal: Goal) => {
    const current = parseFloat(goal.currentAmount as string)
    const target  = parseFloat(goal.targetAmount  as string)
    return target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0
  }

  const handleOpenCreate = () => {
    setEditingGoal(null); setGoalForm(defaultGoalForm); setGoalError(''); setShowGoalModal(true)
  }
  const handleOpenEdit = (goal: Goal) => {
    setEditingGoal(goal)
    setGoalForm({
      name:         goal.name,
      targetAmount: parseFloat(goal.targetAmount as string),
      deadline:     goal.deadline ? new Date(goal.deadline).toISOString().split('T')[0] : '',
    })
    setGoalError(''); setShowGoalModal(true)
  }

  const handleGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setGoalLoading(true); setGoalError('')
    const payload = {
      name:         goalForm.name,
      targetAmount: goalForm.targetAmount,
      deadline:     goalForm.deadline ? new Date(goalForm.deadline) : undefined,
    }
    const result = editingGoal ? await updateGoal(editingGoal.id, payload) : await createGoal(payload)
    if (result?.error) { setGoalError(result.error); setGoalLoading(false); return }
    setShowGoalModal(false); setGoalLoading(false); router.refresh()
  }

  const handleDeleteConfirm = async () => {
    if (!deletingId) return
    setDeleteLoading(true)
    const result = await deleteGoal(deletingId)
    setDeleteLoading(false)
    setDeletingId(null)
    if (result?.error) { toast(result.error, 'error'); return }
    toast('Meta excluída com sucesso')
    router.refresh()
  }

  const handleOpenContribute = (goal: Goal) => {
    setContributeTarget(goal)
    setContribForm({ amount: 0, accountId: accounts[0]?.id || '' })
    setContribError('')
  }

  const handleContributeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contributeTarget) return
    setContribLoading(true); setContribError('')
    const result = await contributeToGoal(contributeTarget.id, contribForm.amount, contribForm.accountId)
    if (result?.error) { setContribError(result.error); setContribLoading(false); return }
    if (result?.isCompleted) alert(`🎉 Parabéns! A meta "${contributeTarget.name}" foi concluída!`)
    setContributeTarget(null); setContribLoading(false); router.refresh()
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>Metas</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted-foreground)' }}>Defina e acompanhe suas metas de economia</p>
        </div>
        <button onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all glow-primary"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>
          <Plus size={18} /> Nova Meta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.map(goal => {
          const progress      = getProgress(goal)
          const current       = parseFloat(goal.currentAmount as string)
          const target        = parseFloat(goal.targetAmount  as string)
          const remaining     = Math.max(target - current, 0)
          const progressColor = goal.isCompleted ? 'var(--color-success)' : 'var(--color-primary)'

          return (
            <div key={goal.id} className="rounded-2xl p-6 transition-all hover:scale-[1.01]"
              style={{
                backgroundColor: 'var(--color-card)',
                border: `1px solid ${goal.isCompleted ? 'color-mix(in srgb, var(--color-success) 25%, var(--color-border))' : 'var(--color-border)'}`,
                boxShadow: 'var(--shadow-card)',
              }}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: goal.isCompleted ? 'color-mix(in srgb, var(--color-success) 15%, transparent)' : 'color-mix(in srgb, var(--color-primary) 15%, transparent)' }}>
                    {goal.isCompleted
                      ? <CheckCircle2 size={20} style={{ color: 'var(--color-success)' }} />
                      : <Target       size={20} style={{ color: 'var(--color-primary)' }} />}
                  </div>
                  <div>
                    <h3 className="font-semibold" style={{ color: 'var(--color-foreground)' }}>{goal.name}</h3>
                    {goal.deadline && (
                      <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                        Prazo: {formatDate(goal.deadline, 'long')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  {!goal.isCompleted && (
                    <button onClick={() => handleOpenEdit(goal)} className="p-1.5 rounded-lg transition-all"
                      style={{ color: 'var(--color-muted-foreground)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-primary)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'color-mix(in srgb, var(--color-primary) 10%, transparent)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-muted-foreground)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}>
                      <Pencil size={14} />
                    </button>
                  )}
                  <button onClick={() => setDeletingId(goal.id)} className="p-1.5 rounded-lg transition-all"
                    style={{ color: 'var(--color-muted-foreground)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-destructive)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'color-mix(in srgb, var(--color-destructive) 10%, transparent)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-muted-foreground)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--color-muted-foreground)' }}>
                  <span>{progress}% concluído</span>
                  <span>{formatCurrency(current)} / {formatCurrency(target)}</span>
                </div>
                <div className="w-full rounded-full h-2.5" style={{ backgroundColor: 'var(--color-border)' }}>
                  <div className="h-2.5 rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: progressColor }} />
                </div>
                {!goal.isCompleted && (
                  <p className="text-xs mt-1.5" style={{ color: 'var(--color-muted-foreground)' }}>
                    Faltam {formatCurrency(remaining)}
                  </p>
                )}
              </div>

              {!goal.isCompleted && accounts.length > 0 && (
                <button onClick={() => handleOpenContribute(goal)}
                  className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-xl transition-all"
                  style={{
                    border: '1px solid color-mix(in srgb, var(--color-primary) 30%, transparent)',
                    color: 'var(--color-primary)',
                    backgroundColor: 'color-mix(in srgb, var(--color-primary) 5%, transparent)',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'color-mix(in srgb, var(--color-primary) 12%, transparent)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'color-mix(in srgb, var(--color-primary) 5%, transparent)'}>
                  <PlusCircle size={15} /> Contribuir
                </button>
              )}

              {goal.isCompleted && (
                <div className="flex items-center justify-center gap-1.5 text-sm font-medium" style={{ color: 'var(--color-success)' }}>
                  <CheckCircle2 size={15} /> Meta concluída!
                </div>
              )}
            </div>
          )
        })}
      </div>

      {goals.length === 0 && (
        <div className="text-center py-16 rounded-2xl"
          style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <Target size={48} className="mx-auto mb-4" style={{ color: 'var(--color-muted-foreground)' }} />
          <p style={{ color: 'var(--color-muted-foreground)' }}>Nenhuma meta cadastrada</p>
          <button onClick={handleOpenCreate} className="mt-4 font-medium" style={{ color: 'var(--color-primary)' }}>
            Criar primeira meta
          </button>
        </div>
      )}

      {/* Confirm delete */}
      {deletingId && (
        <ConfirmModal
          title="Excluir meta"
          description="Esta meta e seu progresso serão removidos permanentemente. As transações de contribuição não serão revertidas."
          confirmLabel="Excluir"
          variant="danger"
          loading={deleteLoading}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingId(null)}
        />
      )}

      {/* Create/Edit modal */}
      {showGoalModal && (
        <Modal title={editingGoal ? 'Editar Meta' : 'Nova Meta'} onClose={() => setShowGoalModal(false)}>
          <form onSubmit={handleGoalSubmit} className="space-y-4">
            {goalError && (
              <div className="px-4 py-3 rounded-xl text-sm"
                style={{ backgroundColor: 'color-mix(in srgb, var(--color-destructive) 10%, transparent)', color: 'var(--color-destructive)' }}>
                {goalError}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>Nome da Meta</label>
              <input type="text" value={goalForm.name} onChange={e => setGoalForm({ ...goalForm, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl outline-none transition-all theme-input"
                placeholder="Ex: Reserva de Emergência" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>Valor Alvo</label>
              <input type="number" step="0.01" min="1" value={goalForm.targetAmount || ''}
                onChange={e => setGoalForm({ ...goalForm, targetAmount: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 rounded-xl outline-none transition-all theme-input"
                placeholder="0,00" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>Prazo (opcional)</label>
              <input type="date" value={goalForm.deadline} onChange={e => setGoalForm({ ...goalForm, deadline: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl outline-none transition-all theme-input" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowGoalModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl font-medium transition-all"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}>
                Cancelar
              </button>
              <button type="submit" disabled={goalLoading}
                className="flex-1 py-2.5 rounded-xl font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2 glow-primary"
                style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>
                {goalLoading && <Loader2 className="animate-spin" size={18} />}
                {editingGoal ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Contribute modal */}
      {contributeTarget && (
        <Modal title={`Contribuir para: ${contributeTarget.name}`} onClose={() => setContributeTarget(null)}>
          <form onSubmit={handleContributeSubmit} className="space-y-4">
            {contribError && (
              <div className="px-4 py-3 rounded-xl text-sm"
                style={{ backgroundColor: 'color-mix(in srgb, var(--color-destructive) 10%, transparent)', color: 'var(--color-destructive)' }}>
                {contribError}
              </div>
            )}
            <div className="px-4 py-3 rounded-xl text-sm"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)', color: 'var(--color-primary)' }}>
              Progresso atual: {formatCurrency(parseFloat(contributeTarget.currentAmount as string))} / {formatCurrency(parseFloat(contributeTarget.targetAmount as string))}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>Conta de Origem</label>
              <select value={contribForm.accountId} onChange={e => setContribForm({ ...contribForm, accountId: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl outline-none transition-all theme-select" required>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} — {formatCurrency(parseFloat(acc.balance as string))}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>Valor da Contribuição</label>
              <input type="number" step="0.01" min="0.01" value={contribForm.amount || ''}
                onChange={e => setContribForm({ ...contribForm, amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 rounded-xl outline-none transition-all theme-input"
                placeholder="0,00" required />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setContributeTarget(null)}
                className="flex-1 px-4 py-2.5 rounded-xl font-medium transition-all"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}>
                Cancelar
              </button>
              <button type="submit" disabled={contribLoading}
                className="flex-1 py-2.5 rounded-xl font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: 'var(--color-success)', color: 'var(--color-success-foreground)' }}>
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
