'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createAccount, updateAccount, deleteAccount } from '@/actions/accounts'
import {
  Plus, Pencil, Trash2, Loader2,
  Wallet, PiggyBank, CreditCard, TrendingUp,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { BankAccount } from '@/lib/db/schema'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useToast } from '@/components/ui/Toast'

const accountTypes = [
  { value: 'checking',   label: 'Conta Corrente', icon: Wallet,      color: '#3B82F6' },
  { value: 'savings',    label: 'Poupança',        icon: PiggyBank,   color: '#22C55E' },
  { value: 'wallet',     label: 'Carteira',        icon: CreditCard,  color: '#F59E0B' },
  { value: 'investment', label: 'Investimento',    icon: TrendingUp,  color: '#8B5CF6' },
]

interface AccountsClientProps { accounts: BankAccount[] }

type FormState = {
  name: string
  type: 'checking' | 'savings' | 'wallet' | 'investment'
  balance: number
  color: string
}

const defaultForm: FormState = { name: '', type: 'checking', balance: 0, color: '#3B82F6' }

export function AccountsClient({ accounts }: AccountsClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [showModal, setShowModal]       = useState(false)
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [form, setForm]                 = useState<FormState>(defaultForm)
  const [deletingId, setDeletingId]     = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance as string), 0)

  const handleOpenCreate = () => {
    setEditingAccount(null); setForm(defaultForm); setError(''); setShowModal(true)
  }
  const handleOpenEdit = (account: BankAccount) => {
    setEditingAccount(account)
    setForm({ name: account.name, type: account.type as FormState['type'], balance: parseFloat(account.balance as string), color: account.color || '#3B82F6' })
    setError(''); setShowModal(true)
  }
  const handleClose = () => { setShowModal(false); setEditingAccount(null); setError('') }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('')
    const result = editingAccount ? await updateAccount(editingAccount.id, form) : await createAccount(form)
    if (result?.error) { setError(result.error); setLoading(false); return }
    setShowModal(false); setEditingAccount(null); setForm(defaultForm); setLoading(false)
    router.refresh()
  }

  const handleDeleteConfirm = async () => {
    if (!deletingId) return
    setDeleteLoading(true)
    const result = await deleteAccount(deletingId)
    setDeleteLoading(false)
    setDeletingId(null)
    if (result?.error) { toast(result.error, 'error'); return }
    toast('Conta excluída com sucesso')
    router.refresh()
  }

  const getAccountIcon = (type: string) => accountTypes.find(t => t.value === type)?.icon || Wallet

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>Contas</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted-foreground)' }}>Gerencie suas contas bancárias</p>
        </div>
        <button onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all glow-primary"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>
          <Plus size={18} /> Nova Conta
        </button>
      </div>

      <div className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, color-mix(in srgb, var(--color-primary) 70%, #003366) 100%)' }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, white 0%, transparent 60%)' }} />
        <p className="text-sm opacity-80 relative">Saldo Total</p>
        <p className="text-3xl font-bold relative" style={{ color: 'var(--color-primary-foreground)' }}>{formatCurrency(totalBalance)}</p>
        <p className="text-sm opacity-70 mt-1 relative" style={{ color: 'var(--color-primary-foreground)' }}>{accounts.length} conta(s) cadastrada(s)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((account) => {
          const Icon = getAccountIcon(account.type)
          const balance = parseFloat(account.balance as string)
          const typeLabel = accountTypes.find(t => t.value === account.type)?.label || account.type
          return (
            <div key={account.id} className="rounded-2xl p-6 transition-all hover:scale-[1.01]"
              style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: account.color || '#3B82F6' }}>
                    <Icon className="text-white" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold" style={{ color: 'var(--color-foreground)' }}>{account.name}</h3>
                    <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>{typeLabel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleOpenEdit(account)} className="p-2 rounded-xl transition-all" style={{ color: 'var(--color-muted-foreground)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-primary)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'color-mix(in srgb, var(--color-primary) 10%, transparent)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-muted-foreground)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}>
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => setDeletingId(account.id)} className="p-2 rounded-xl transition-all" style={{ color: 'var(--color-muted-foreground)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-destructive)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'color-mix(in srgb, var(--color-destructive) 10%, transparent)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-muted-foreground)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Saldo atual</p>
                <p className="text-xl font-bold" style={{ color: balance >= 0 ? 'var(--color-foreground)' : 'var(--color-destructive)' }}>{formatCurrency(balance)}</p>
              </div>
            </div>
          )
        })}
      </div>

      {accounts.length === 0 && (
        <div className="text-center py-16 rounded-2xl" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <Wallet size={48} className="mx-auto mb-4" style={{ color: 'var(--color-muted-foreground)' }} />
          <p style={{ color: 'var(--color-muted-foreground)' }}>Nenhuma conta cadastrada</p>
          <button onClick={handleOpenCreate} className="mt-4 font-medium" style={{ color: 'var(--color-primary)' }}>Criar primeira conta</button>
        </div>
      )}

      {deletingId && (
        <ConfirmModal
          title="Excluir conta"
          description="Todas as transações desta conta também serão excluídas. Esta ação não pode ser desfeita."
          confirmLabel="Excluir conta"
          variant="danger"
          loading={deleteLoading}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingId(null)}
        />
      )}

      {showModal && (
        <Modal title={editingAccount ? 'Editar Conta' : 'Nova Conta'} onClose={handleClose}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="px-4 py-3 rounded-xl text-sm"
                style={{ backgroundColor: 'color-mix(in srgb, var(--color-destructive) 10%, transparent)', color: 'var(--color-destructive)', border: '1px solid color-mix(in srgb, var(--color-destructive) 20%, transparent)' }}>
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>Nome</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl outline-none transition-all theme-input" placeholder="Ex: Banco do Brasil" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>Tipo</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as FormState['type'] })}
                className="w-full px-4 py-2.5 rounded-xl outline-none transition-all theme-select">
                {accountTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>{editingAccount ? 'Saldo Atual' : 'Saldo Inicial'}</label>
              <input type="number" step="0.01" value={form.balance} onChange={e => setForm({ ...form, balance: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 rounded-xl outline-none transition-all theme-input" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>Cor</label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })}
                  className="w-12 h-10 rounded-lg cursor-pointer border" style={{ borderColor: 'var(--color-border)' }} />
                <span className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>{form.color}</span>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={handleClose} className="flex-1 px-4 py-2.5 rounded-xl font-medium transition-all"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-foreground)', backgroundColor: 'transparent' }}>Cancelar</button>
              <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2 glow-primary"
                style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>
                {loading && <Loader2 className="animate-spin" size={18} />}
                {editingAccount ? 'Salvar alterações' : 'Criar conta'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
