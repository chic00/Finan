import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight } from 'lucide-react'
import type { Transaction } from '@/lib/db/schema'

interface RecentTransactionsProps {
  transactions: Array<Transaction & { category?: { name: string; color: string | null } | null; account: { name: string } }>
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        Nenhuma transação este mês
      </div>
    )
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'income':
        return <ArrowUpRight className="text-green-600" size={16} />
      case 'expense':
        return <ArrowDownLeft className="text-red-600" size={16} />
      case 'transfer':
        return <ArrowLeftRight className="text-blue-600" size={16} />
      default:
        return null
    }
  }

  const getAmountColor = (type: string) => {
    switch (type) {
      case 'income':
        return 'text-green-600'
      case 'expense':
        return 'text-red-600'
      case 'transfer':
        return 'text-blue-600'
      default:
        return 'text-gray-900'
    }
  }

  const formatAmount = (amount: string | number, type: string) => {
    const value = parseFloat(amount as string)
    const prefix = type === 'income' ? '+' : type === 'expense' ? '-' : ''
    return `${prefix}${formatCurrency(value)}`
  }

  return (
    <div className="space-y-3">
      {transactions.map((t) => (
        <div
          key={t.id}
          className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              {getIcon(t.type)}
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm">
                {t.description || t.category?.name || 'Transação'}
              </p>
              <p className="text-xs text-gray-500">
                {t.category?.name || 'Sem categoria'} • {t.account.name}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className={`font-medium text-sm ${getAmountColor(t.type)}`}>
              {formatAmount(t.amount, t.type)}
            </p>
            <p className="text-xs text-gray-500">
              {formatDate(t.date)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
