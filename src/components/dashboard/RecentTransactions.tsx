import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight } from 'lucide-react'
import type { Transaction } from '@/lib/db/schema'

interface RecentTransactionsProps {
  transactions: Array<Transaction & { category?: { name: string; color: string | null } | null; account: { name: string } }>
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-8" style={{ color: 'var(--color-muted-foreground)' }}>
        Nenhuma transacao este mes
      </div>
    )
  }

  const getIconStyle = (type: string) => {
    if (type === 'income') return {
      bg: 'color-mix(in srgb, var(--color-success) 20%, transparent)',
      color: 'var(--color-success)',
    }
    if (type === 'expense') return {
      bg: 'color-mix(in srgb, var(--color-destructive) 20%, transparent)',
      color: 'var(--color-destructive)',
    }
    return {
      bg: 'color-mix(in srgb, var(--color-primary) 20%, transparent)',
      color: 'var(--color-primary)',
    }
  }

  const getAmountColor = (type: string) => {
    if (type === 'income') return 'var(--color-success)'
    if (type === 'expense') return 'var(--color-destructive)'
    return 'var(--color-primary)'
  }

  const formatAmount = (amount: string | number, type: string) => {
    const value = parseFloat(amount as string)
    const prefix = type === 'income' ? '+' : type === 'expense' ? '-' : ''
    return `${prefix}${formatCurrency(value)}`
  }

  return (
    <div className="space-y-1">
      {transactions.map((t, i) => {
        const iconStyle = getIconStyle(t.type)
        return (
          <div
            key={t.id}
            className="flex items-center justify-between py-3 px-3 rounded-xl transition-colors"
            style={{ borderBottom: i < transactions.length - 1 ? '1px solid var(--color-border)' : 'none' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-secondary)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}
          >
            <div className="flex items-center gap-3">
              {/* Icon with explicit background — always visible */}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: iconStyle.bg }}
              >
                {t.type === 'income' && <ArrowUpRight size={16} style={{ color: iconStyle.color }} />}
                {t.type === 'expense' && <ArrowDownLeft size={16} style={{ color: iconStyle.color }} />}
                {t.type === 'transfer' && <ArrowLeftRight size={16} style={{ color: iconStyle.color }} />}
              </div>
              <div>
                <p className="font-medium text-sm" style={{ color: 'var(--color-foreground)' }}>
                  {t.description || t.category?.name || 'Transacao'}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
                  {t.category?.name || 'Sem categoria'} · {t.account.name}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-sm" style={{ color: getAmountColor(t.type) }}>
                {formatAmount(t.amount, t.type)}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
                {formatDate(t.date)}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
