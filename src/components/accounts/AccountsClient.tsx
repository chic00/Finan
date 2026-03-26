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

const accountTypes = [
  { value: 'checking',   label: 'Conta Corrente', icon: Wallet,      color: '#3B82F6' },
  { value: 'savings',    label: 'Poupança',        icon: PiggyBank,   color: '#22C55E' },
  { value: 'wallet',     label: 'Carteira',        icon: CreditCard,  color: '#F59E0B' },
  { value: 'investment', label: 'Investimento',    icon: TrendingUp,  color: '#8B5CF6' },
]

interface AccountsClientProps {
  accounts: BankAccount[]
}

type FormState = {
  name: string
  type: 'checking' | 'savings' | 'wallet' | 'investment'
  balance: number
  color: string
}

const defaultForm: FormState = {
  name: '',
  type: 'checking',
  balance: 0,
  color: '#3B82F6',
}

export function AccountsClient({ accounts }: AccountsClientProps) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<FormState>(defaultForm)

  const totalBalance = accounts.reduce(
    (sum, acc) => sum + parseFloat(acc.balance as string),
    0
  )

  const handleOpenCreate = () => {
    setEditingAccount(null)
    setForm(defaultForm)
    setError('')
    setShowModal(true)
  }

  const handleOpenEdit = (account: BankAccount) => {
    setEditingAccount(account)
    setForm({
      name: account.name,
      type: account.type as FormState['type'],
      balance: parseFloat(account.balance as string),
      color: account.color || '#3B82F6',
    })
    setError('')
    setShowModal(true)
  }

  const handleClose = () => {
    setShowModal(false)
    setEditingAccount(null)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // FIX: chama updateAccount quando editando, createAccount quando criando
    const result = editingAccount
      ? await updateAccount(editingAccount.id, form)
      : await createAccount(form)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    setShowModal(false)
    setEditingAccount(null)
    setForm(defaultForm)
    setLoading(false)
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza? Todas as transações desta conta também serão excluídas.')) return
    const result = await deleteAccount(id)
    if (result?.error) {
      alert(result.error)
      return
    }
    router.refresh()
  }

  const getAccountIcon = (type: string) => {
    const found = accountTypes.find((t) => t.value === type)
    return found?.icon || Wallet
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contas</h1>
          <p className="text-gray-500">Gerencie suas contas bancárias</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition"
        >
          <Plus size={18} />
          Nova Conta
        </button>
      </div>

      {/* Total Balance */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
        <p className="text-sm opacity-80">Saldo Total</p>
        <p className="text-3xl font-bold">{formatCurrency(totalBalance)}</p>
        <p className="text-sm opacity-70 mt-1">{accounts.length} conta(s) cadastrada(s)</p>
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((account) => {
          const Icon = getAccountIcon(account.type)
          const balance = parseFloat(account.balance as string)
          const typeLabel = accountTypes.find((t) => t.value === account.type)?.label || account.type

          return (
            <div
              key={account.id}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: account.color || '#3B82F6' }}
                  >
                    <Icon className="text-white" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{account.name}</h3>
                    <p className="text-sm text-gray-500">{typeLabel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(account)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Editar conta"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(account.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Excluir conta"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">Saldo atual</p>
                <p className={`text-xl font-bold ${balance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                  {formatCurrency(balance)}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {accounts.length === 0 && (
        <div className="text-center py-12">
          <Wallet className="mx-auto text-gray-300" size={48} />
          <p className="mt-4 text-gray-500">Nenhuma conta cadastrada</p>
          <button
            onClick={handleOpenCreate}
            className="mt-4 text-blue-600 hover:underline font-medium"
          >
            Criar primeira conta
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <Modal
          title={editingAccount ? 'Editar Conta' : 'Nova Conta'}
          onClose={handleClose}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ex: Banco do Brasil"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as FormState['type'] })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {accountTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {editingAccount ? 'Saldo Atual' : 'Saldo Inicial'}
              </label>
              <input
                type="number"
                step="0.01"
                value={form.balance}
                onChange={(e) => setForm({ ...form, balance: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cor</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="w-12 h-12 border border-gray-300 rounded-lg cursor-pointer"
                />
                <span className="text-sm text-gray-500">{form.color}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
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
