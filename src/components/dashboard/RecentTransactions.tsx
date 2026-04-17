import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight } from 'lucide-react'
import type { Transaction } from '@/lib/db/schema'

interface RecentTransactionsProps {
  transactions: Array<Transaction & { category?: { name: string; color: string | null } | null; account: { name: string } }>
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma transacao este mes
      </div>
    )
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'income':
        return <ArrowUpRight className="text-success" size={16} />
      case 'expense':
        return <ArrowDownLeft className="text-destructive" size={16} />
      case 'transfer':
        return <ArrowLeftRight className="text-primary" size={16} />
      default:
        return null
    }
  }

  const getIconBg = (type: string) => {
    switch (type) {
      case 'income':
        return 'bg-success/10'
      case 'expense':
        return 'bg-destructive/10'
      case 'transfer':
        return 'bg-primary/10'
      default:
        return 'bg-secondary'
    }
  }

  const getAmountColor = (type: string) => {
    switch (type) {
      case 'income':
        return 'text-success'
      case 'expense':
        return 'text-destructive'
      case 'transfer':
        return 'text-primary'
      default:
        return 'text-foreground'
    }
  }

  const formatAmount = (amount: string | number, type: string) => {
    const value = parseFloat(amount as string)
    const prefix = type === 'income' ? '+' : type === 'expense' ? '-' : ''
    return `${prefix}${formatCurrency(value)}`
  }

  return (
    <div className="space-y-2">
      {transactions.map((t) => (
        <div
          key={t.id}
          className="flex items-center justify-between py-3 px-3 rounded-xl hover:bg-secondary/50 transition-colors border-b border-border last:border-0"
        >
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${getIconBg(t.type)} flex items-center justify-center`}>
              {getIcon(t.type)}
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">
                {t.description || t.category?.name || 'Transacao'}
              </p>
              <p className="text-xs text-muted-foreground">
                {t.category?.name || 'Sem categoria'} · {t.account.name}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className={`font-semibold text-sm ${getAmountColor(t.type)}`}>
              {formatAmount(t.amount, t.type)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDate(t.date)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
