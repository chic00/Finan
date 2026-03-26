'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createTransaction, deleteTransaction } from '@/actions/transactions'
import { Plus, Pencil, Trash2, Loader2, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Filter } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import type { BankAccount, Category } from '@/lib/db/schema'

interface TransactionWithDetails {
  id: string
  type: string
  amount: string
  description: string | null
  date: Date
  account: { id: string; name: string }
  toAccount?: { id: string; name: string } | null
  category?: { id: string; name: string; color: string } | null
}

interface TransactionsClientProps {
  transactions: TransactionWithDetails[]
  accounts: BankAccount[]
  categories: Category[]
}

export function TransactionsClient({ transactions, accounts, categories }: TransactionsClientProps) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [filterType, setFilterType] = useState<string>('all')
  const [form, setForm] = useState({
    accountId: '',
    toAccountId: '',
    categoryId: '',
    type: 'expense' as 'income' | 'expense' | 'transfer',
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0],
  })

  const filteredTransactions = filterType === 'all'
    ? transactions
    : transactions.filter(t => t.type === filterType)

  const getIcon = (type: string) => {
    switch (type) {
      case 'income': return <ArrowUpRight className="text-green-600" size={16} />
      case 'expense': return <ArrowDownLeft className="text-red-600" size={16} />
      case 'transfer': return <ArrowLeftRight className="text-blue-600" size={16} />
      default: return null
    }
  }

  const getAmountColor = (type: string) => {
    switch (type) {
      case 'income': return 'text-green-600'
      case 'expense': return 'text-red-600'
      case 'transfer': return 'text-blue-600'
      default: return 'text-gray-900'
    }
  }

  const formatAmount = (amount: string | number, type: string) => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount
    const prefix = type === 'income' ? '+' : type === 'expense' ? '-' : ''
    return `${prefix}${formatCurrency(value)}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const result = await createTransaction({
      ...form,
      amount: parseFloat(form.amount.toString()),
      date: new Date(form.date),
    })

    if (result?.error) {
      setLoading(false)
      return
    }

    setShowModal(false)
    setForm({
      accountId: '',
      toAccountId: '',
      categoryId: '',
      type: 'expense',
      amount: 0,
      description: '',
      date: new Date().toISOString().split('T')[0],
    })
    setLoading(false)
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) return
    await deleteTransaction(id)
    router.refresh()
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transações</h1>
          <p className="text-gray-500">Gerencie suas receitas e despesas</p>
        </div>
        <button
          onClick={() => {
            setForm({
              accountId: accounts[0]?.id || '',
              toAccountId: '',
              categoryId: '',
              type: 'expense',
              amount: 0,
              description: '',
              date: new Date().toISOString().split('T')[0],
            })
            setShowModal(true)
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition"
        >
          <Plus size={18} />
          Nova Transação
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="text-gray-400" size={18} />
        {['all', 'income', 'expense', 'transfer'].map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filterType === type
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {type === 'all' ? 'Todas' : type === 'income' ? 'Receitas' : type === 'expense' ? 'Despesas' : 'Transferências'}
          </button>
        ))}
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {filteredTransactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  {getIcon(t.type)}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {t.description || t.category?.name || 'Transação'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {t.category?.name || 'Sem categoria'} • {t.account.name}
                    {t.toAccount && ` → ${t.toAccount.name}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className={`font-medium ${getAmountColor(t.type)}`}>
                    {formatAmount(t.amount, t.type)}
                  </p>
                  <p className="text-sm text-gray-500">{formatDate(t.date)}</p>
                </div>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredTransactions.length === 0 && (
          <div className="text-center py-12">
            <ArrowLeftRight className="mx-auto text-gray-300" size={48} />
            <p className="mt-4 text-gray-500">Nenhuma transação encontrada</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <Modal title="Nova Transação" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as typeof form.type })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="expense">Despesa</option>
                <option value="income">Receita</option>
                <option value="transfer">Transferência</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Conta</label>
              <select
                value={form.accountId}
                onChange={(e) => setForm({ ...form, accountId: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              >
                <option value="">Selecione uma conta</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>

            {form.type === 'transfer' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Conta Destino</label>
                <select
                  value={form.toAccountId}
                  onChange={(e) => setForm({ ...form, toAccountId: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                >
                  <option value="">Selecione a conta destino</option>
                  {accounts.filter(a => a.id !== form.accountId).map((acc) => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>
            )}

            {form.type !== 'transfer' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Sem categoria</option>
                  {categories
                    .filter(c => c.type === form.type || (form.type === 'transfer' && c.type === 'transfer'))
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ex: Supermercado Extra"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
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
                Criar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
