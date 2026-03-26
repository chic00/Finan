'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createAccount, deleteAccount } from '@/actions/accounts'
import { Plus, Pencil, Trash2, Loader2, Wallet, PiggyBank, CreditCard, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { BankAccount } from '@/lib/db/schema'
import { Modal } from '@/components/ui/Modal'

const accountTypes = [
  { value: 'checking', label: 'Conta Corrente', icon: Wallet, color: 'bg-blue-500' },
  { value: 'savings', label: 'Poupança', icon: PiggyBank, color: 'bg-green-500' },
  { value: 'wallet', label: 'Carteira', icon: CreditCard, color: 'bg-yellow-500' },
  { value: 'investment', label: 'Investimento', icon: TrendingUp, color: 'bg-purple-500' },
]

interface AccountsClientProps {
  accounts: BankAccount[]
}

export function AccountsClient({ accounts }: AccountsClientProps) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    type: 'checking' as const,
    balance: 0,
    color: '#3B82F6',
  })

  const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance as string), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const result = editingAccount
      ? await createAccount(form)
      : await createAccount(form)

    if (result?.error) {
      setLoading(false)
      return
    }

    setShowModal(false)
    setEditingAccount(null)
    setForm({ name: '', type: 'checking', balance: 0, color: '#3B82F6' })
    setLoading(false)
    router.refresh()
  }

  const handleEdit = (account: BankAccount) => {
    setEditingAccount(account)
    setForm({
      name: account.name,
      type: account.type as typeof form.type,
      balance: parseFloat(account.balance as string),
      color: account.color || '#3B82F6',
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conta?')) return
    await deleteAccount(id)
    router.refresh()
  }

  const getAccountIcon = (type: string) => {
    const accType = accountTypes.find(t => t.value === type)
    return accType?.icon || Wallet
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contas</h1>
          <p className="text-gray-500">Gerencie suas contas bancárias</p>
        </div>
        <button
          onClick={() => {
            setEditingAccount(null)
            setForm({ name: '', type: 'checking', balance: 0, color: '#3B82F6' })
            setShowModal(true)
          }}
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
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((account) => {
          const Icon = getAccountIcon(account.type)
          return (
            <div key={account.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${account.color || 'bg-blue-500'} flex items-center justify-center`}>
                    <Icon className="text-white" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{account.name}</h3>
                    <p className="text-sm text-gray-500">
                      {accountTypes.find(t => t.value === account.type)?.label || account.type}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(account)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(account.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">Saldo atual</p>
                <p className={`text-xl font-bold ${parseFloat(account.balance as string) >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                  {formatCurrency(parseFloat(account.balance as string))}
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
            onClick={() => setShowModal(true)}
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
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Ex: Banco do Brasil"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as typeof form.type })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                {accountTypes.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Saldo Inicial</label>
              <input
                type="number"
                step="0.01"
                value={form.balance}
                onChange={(e) => setForm({ ...form, balance: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cor</label>
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="w-full h-12 border border-gray-300 rounded-lg cursor-pointer"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowModal(false)}
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
                {editingAccount ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
