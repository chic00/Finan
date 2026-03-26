'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createTransaction, updateTransaction, deleteTransaction } from '@/actions/transactions'
import {
  Plus, Pencil, Trash2, Loader2,
  ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Filter, ChevronLeft, ChevronRight,
} from 'lucide-react'
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
  category?: { id: string; name: string; color: string | null } | null
}

interface TransactionsClientProps {
  transactions: TransactionWithDetails[]
  accounts: BankAccount[]
  categories: Category[]
  currentMonth: number
  currentYear: number
}

type FormState = {
  accountId: string
  toAccountId: string
  categoryId: string
  type: 'income' | 'expense' | 'transfer'
  amount: number
  description: string
  date: string
}

const defaultForm = (accountId = ''): FormState => ({
  accountId,
  toAccountId: '',
  categoryId: '',
  type: 'expense',
  amount: 0,
  description: '',
  date: new Date().toISOString().split('T')[0],
})

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export function TransactionsClient({
  transactions,
  accounts,
  categories,
  currentMonth,
  currentYear,
}: TransactionsClientProps) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [month, setMonth] = useState(currentMonth)
  const [year, setYear] = useState(currentYear)
  const [form, setForm] = useState<FormState>(defaultForm(accounts[0]?.id))

  const filteredTransactions = filterType === 'all'
    ? transactions
    : transactions.filter((t) => t.type === filterType)

  const getIcon = (type: string) => {
    if (type === 'income') return <ArrowUpRight className="text-green-600" size={16} />
    if (type === 'expense') return <ArrowDownLeft className="text-red-600" size={16} />
    return <ArrowLeftRight className="text-blue-600" size={16} />
  }

  const getAmountColor = (type: string) =>
    type === 'income' ? 'text-green-600' : type === 'expense' ? 'text-red-600' : 'text-blue-600'

  const formatAmount = (amount: string | number, type: string) => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount
    const prefix = type === 'income' ? '+' : type === 'expense' ? '-' : ''
    return `${prefix}${formatCurrency(value)}`
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    let newMonth = month + (direction === 'next' ? 1 : -1)
    let newYear = year
    if (newMonth > 11) { newMonth = 0; newYear++ }
    if (newMonth < 0) { newMonth = 11; newYear-- }
    setMonth(newMonth)
    setYear(newYear)
    router.push(`/dashboard/transacoes?month=${newMonth}&year=${newYear}`)
  }

  const handleOpenCreate = () => {
    setEditingId(null)
    setForm(defaultForm(accounts[0]?.id))
    setError('')
    setShowModal(true)
  }

  const handleOpenEdit = (t: TransactionWithDetails) => {
    setEditingId(t.id)
    setForm({
      accountId: t.account.id,
      toAccountId: t.toAccount?.id || '',
      categoryId: t.category?.id || '',
      type: t.type as FormState['type'],
      amount: parseFloat(t.amount),
      description: t.description || '',
      date: new Date(t.date).toISOString().split('T')[0],
    })
    setError('')
    setShowModal(true)
  }

  const handleClose = () => {
    setShowModal(false)
    setEditingId(null)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const payload = {
      ...form,
      amount: parseFloat(form.amount.toString()),
      date: new Date(form.date + 'T12:00:00'),
      toAccountId: form.toAccountId || undefined,
      categoryId: form.categoryId || undefined,
    }

    const result = editingId
      ? await updateTransaction(editingId, payload)
      : await createTransaction(payload)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    setShowModal(false)
    setEditingId(null)
    setLoading(false)
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) return
    const result = await deleteTransaction(id)
    if (result?.error) { alert(result.error); return }
    router.refresh()
  }

  const filteredCategories = categories.filter(
    (c) => c.type === form.type || (form.type !== 'transfer' && c.type === form.type)
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transações</h1>
          <p className="text-gray-500">Gerencie suas receitas e despesas</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition"
        >
          <Plus size={18} />
          Nova Transação
        </button>
      </div>

      {/* Month navigator */}
      <div className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 px-4 py-3">
        <button
          onClick={() => navigateMonth('prev')}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="font-medium text-gray-900 flex-1 text-center">
          {MONTHS[month]} {year}
        </span>
        <button
          onClick={() => navigateMonth('next')}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition"
          disabled={month === new Date().getMonth() && year === new Date().getFullYear()}
        >
          <ChevronRight size={18} className={
            month === new Date().getMonth() && year === new Date().getFullYear()
              ? 'text-gray-300'
              : ''
          } />
        </button>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        {(['income', 'expense', 'transfer'] as const).map((type) => {
          const total = transactions
            .filter((t) => t.type === type)
            .reduce((s, t) => s + parseFloat(t.amount), 0)
          const label = type === 'income' ? 'Receitas' : type === 'expense' ? 'Despesas' : 'Transferências'
          const color = type === 'income' ? 'text-green-600' : type === 'expense' ? 'text-red-600' : 'text-blue-600'
          return (
            <div key={type} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">{label}</p>
              <p className={`text-lg font-bold ${color}`}>{formatCurrency(total)}</p>
            </div>
          )
        })}
      </div>

      {/* Type filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="text-gray-400" size={18} />
        {[
          { value: 'all', label: 'Todas' },
          { value: 'income', label: 'Receitas' },
          { value: 'expense', label: 'Despesas' },
          { value: 'transfer', label: 'Transferências' },
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilterType(value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filterType === value
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Transactions list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {filteredTransactions.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between p-4 hover:bg-gray-50"
            >
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
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className={`font-medium ${getAmountColor(t.type)}`}>
                    {formatAmount(t.amount, t.type)}
                  </p>
                  <p className="text-sm text-gray-500">{formatDate(t.date)}</p>
                </div>
                <button
                  onClick={() => handleOpenEdit(t)}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  title="Editar"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="Excluir"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredTransactions.length === 0 && (
          <div className="text-center py-12">
            <ArrowLeftRight className="mx-auto text-gray-300" size={48} />
            <p className="mt-4 text-gray-500">Nenhuma transação encontrada</p>
            <button onClick={handleOpenCreate} className="mt-3 text-blue-600 hover:underline text-sm">
              Adicionar transação
            </button>
          </div>
        )}
      </div>

      {/* Modal criar/editar */}
      {showModal && (
        <Modal
          title={editingId ? 'Editar Transação' : 'Nova Transação'}
          onClose={handleClose}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as FormState['type'], categoryId: '' })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="expense">Despesa</option>
                <option value="income">Receita</option>
                <option value="transfer">Transferência</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {form.type === 'transfer' ? 'Conta Origem' : 'Conta'}
              </label>
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
                  {accounts
                    .filter((a) => a.id !== form.accountId)
                    .map((acc) => (
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
                  {filteredCategories.map((cat) => (
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
                value={form.amount || ''}
                onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0,00"
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
                placeholder="Ex: Supermercado"
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

            <div className="flex gap-3 pt-2">
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
                {editingId ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
