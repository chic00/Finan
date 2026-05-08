import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { RefreshCw, CheckCircle2, Circle, AlertTriangle, ArrowRight } from 'lucide-react'

interface RecurringItem {
  id: string
  description: string | null
  type: string
  amount: string
  nextDueDate: Date
  isPaid: boolean
  frequency: string
  category?: { name: string; color: string | null } | null
}

interface RecurringAlertProps {
  items: RecurringItem[]
}

function daysUntil(date: Date): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due   = new Date(date); due.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 60 * 24))
}

function daysLabel(days: number, isPaid: boolean): { text: string; color: string } {
  if (isPaid)     return { text: 'Pago',              color: 'var(--color-success)' }
  if (days < 0)   return { text: `Vencida há ${Math.abs(days)}d`, color: 'var(--color-destructive)' }
  if (days === 0) return { text: 'Vence hoje!',       color: 'var(--color-destructive)' }
  if (days === 1) return { text: 'Vence amanhã',      color: 'var(--color-warning)' }
  if (days <= 5)  return { text: `Vence em ${days}d`, color: 'var(--color-warning)' }
  return               { text: formatDate(new Date()),  color: 'var(--color-muted-foreground)' }
}

export function RecurringAlert({ items }: RecurringAlertProps) {
  if (items.length === 0) return null

  const totalExpense = items
    .filter((i) => i.type === 'expense')
    .reduce((s, i) => s + parseFloat(i.amount), 0)

  const totalIncome = items
    .filter((i) => i.type === 'income')
    .reduce((s, i) => s + parseFloat(i.amount), 0)

  const unpaid  = items.filter((i) => !i.isPaid)
  const overdue = unpaid.filter((i) => daysUntil(new Date(i.nextDueDate)) < 0)

  const sorted = items
    .slice()
    .sort((a, b) => {
      if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1
      return new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime()
    })
    .slice(0, 6)

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Header */}
      <div
        className="px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-2">
          <RefreshCw size={18} style={{ color: 'var(--color-primary)' }} />
          <h3 className="font-semibold" style={{ color: 'var(--color-foreground)' }}>
            Contas Recorrentes — este mês
          </h3>
          {overdue.length > 0 && (
            <span
              className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{
                color: 'var(--color-destructive)',
                backgroundColor: 'color-mix(in srgb, var(--color-destructive) 12%, transparent)',
                border: '1px solid color-mix(in srgb, var(--color-destructive) 25%, transparent)',
              }}
            >
              <AlertTriangle size={11} />
              {overdue.length} vencida{overdue.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <Link
          href="/dashboard/recorrentes"
          className="text-sm flex items-center gap-1 transition-colors"
          style={{ color: 'var(--color-primary)' }}
        >
          Ver todas <ArrowRight size={14} />
        </Link>
      </div>

      {/* Sumário financeiro */}
      <div
        className="grid grid-cols-3 divide-x"
        style={{
          borderBottom: '1px solid var(--color-border)',
          borderColor: 'var(--color-border)',
        }}
      >
        {[
          {
            label: 'Total despesas',
            value: formatCurrency(totalExpense),
            color: 'var(--color-destructive)',
          },
          {
            label: 'Total receitas',
            value: formatCurrency(totalIncome),
            color: 'var(--color-success)',
          },
          {
            label: 'Pendentes',
            value: `${unpaid.length} de ${items.length}`,
            color: unpaid.length > 0 ? 'var(--color-warning)' : 'var(--color-success)',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="px-5 py-3"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
              {stat.label}
            </p>
            <p className="text-base font-bold" style={{ color: stat.color }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Lista de itens */}
      <div>
        {sorted.map((item, i) => {
          const days  = daysUntil(new Date(item.nextDueDate))
          const label = daysLabel(days, item.isPaid)
          const isLate = !item.isPaid && days < 0
          const isExpense = item.type === 'expense'

          return (
            <div
              key={item.id}
              className="flex items-center justify-between px-6 py-3 transition-colors"
              style={{
                borderBottom: i < sorted.length - 1 ? '1px solid var(--color-border)' : 'none',
                backgroundColor: isLate
                  ? 'color-mix(in srgb, var(--color-destructive) 5%, transparent)'
                  : 'transparent',
              }}
            >
              {/* Left: icon + info */}
              <div className="flex items-center gap-3 min-w-0">
                {item.isPaid ? (
                  <CheckCircle2
                    size={16}
                    className="flex-shrink-0"
                    style={{ color: 'var(--color-success)' }}
                  />
                ) : (
                  <Circle
                    size={16}
                    className="flex-shrink-0"
                    style={{ color: isLate ? 'var(--color-destructive)' : 'var(--color-muted-foreground)' }}
                  />
                )}
                <div className="min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    style={{
                      color: item.isPaid
                        ? 'var(--color-muted-foreground)'
                        : 'var(--color-foreground)',
                      textDecoration: item.isPaid ? 'line-through' : 'none',
                    }}
                  >
                    {item.description || 'Sem descrição'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                    {item.category?.name || '—'}
                    {' · '}
                    <span style={{ color: label.color, fontWeight: 500 }}>
                      {label.text}
                    </span>
                  </p>
                </div>
              </div>

              {/* Right: amount */}
              <p
                className="text-sm font-bold flex-shrink-0 ml-4"
                style={{
                  color: item.isPaid
                    ? 'var(--color-muted-foreground)'
                    : isExpense
                      ? 'var(--color-destructive)'
                      : 'var(--color-success)',
                }}
              >
                {isExpense ? '-' : '+'}{formatCurrency(parseFloat(item.amount))}
              </p>
            </div>
          )
        })}
      </div>

      {/* Ver mais */}
      {items.length > 6 && (
        <div
          className="px-6 py-3 text-center"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <Link
            href="/dashboard/recorrentes"
            className="text-sm transition-colors"
            style={{ color: 'var(--color-primary)' }}
          >
            Ver mais {items.length - 6} conta{items.length - 6 > 1 ? 's' : ''}
          </Link>
        </div>
      )}
    </div>
  )
}
