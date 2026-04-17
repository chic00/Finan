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
  return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
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

  return (
    <div className="bg-card rounded-2xl border border-border shadow-lg shadow-black/5 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RefreshCw size={18} className="text-primary" />
          <h3 className="font-semibold text-foreground">Contas Recorrentes — este mes</h3>
          {overdue.length > 0 && (
            <span className="flex items-center gap-1 text-xs font-semibold text-destructive bg-destructive/10 border border-destructive/20 px-2 py-0.5 rounded-full">
              <AlertTriangle size={11} />
              {overdue.length} vencida{overdue.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <Link href="/dashboard/recorrentes"
          className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
          Ver todas <ArrowRight size={14} />
        </Link>
      </div>

      {/* Resumo financeiro */}
      <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
        <div className="px-5 py-3">
          <p className="text-xs text-muted-foreground">Total despesas</p>
          <p className="text-base font-bold text-destructive">{formatCurrency(totalExpense)}</p>
        </div>
        <div className="px-5 py-3">
          <p className="text-xs text-muted-foreground">Total receitas</p>
          <p className="text-base font-bold text-success">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="px-5 py-3">
          <p className="text-xs text-muted-foreground">Pendentes</p>
          <p className="text-base font-bold text-warning">{unpaid.length} de {items.length}</p>
        </div>
      </div>

      {/* Lista de itens (max 5, ordenados por urgencia) */}
      <div className="divide-y divide-border">
        {items
          .slice()
          .sort((a, b) => {
            // Nao pagas primeiro, depois por data
            if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1
            return new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime()
          })
          .slice(0, 6)
          .map((item) => {
            const days  = daysUntil(new Date(item.nextDueDate))
            const isLate = !item.isPaid && days < 0

            return (
              <div key={item.id}
                className={`flex items-center justify-between px-6 py-3 ${
                  isLate ? 'bg-destructive/5' : ''
                }`}>
                <div className="flex items-center gap-3 min-w-0">
                  {item.isPaid
                    ? <CheckCircle2 size={16} className="text-success shrink-0" />
                    : <Circle      size={16} className={`shrink-0 ${isLate ? 'text-destructive' : 'text-muted-foreground'}`} />
                  }
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${item.isPaid ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                      {item.description || 'Sem descricao'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.category?.name || '—'} ·{' '}
                      {item.isPaid
                        ? <span className="text-success font-medium">Pago</span>
                        : days < 0
                          ? <span className="text-destructive font-medium">Vencida ha {Math.abs(days)} dia{Math.abs(days) > 1 ? 's' : ''}</span>
                          : days === 0
                            ? <span className="text-destructive font-medium">Vence hoje</span>
                            : <span>Vence em {days} dia{days > 1 ? 's' : ''} — {formatDate(new Date(item.nextDueDate))}</span>
                      }
                    </p>
                  </div>
                </div>
                <p className={`text-sm font-bold shrink-0 ml-4 ${
                  item.isPaid
                    ? 'text-muted-foreground'
                    : item.type === 'expense' ? 'text-destructive' : 'text-success'
                }`}>
                  {item.type === 'income' ? '+' : '-'}{formatCurrency(parseFloat(item.amount))}
                </p>
              </div>
            )
          })}
      </div>

      {items.length > 6 && (
        <div className="px-6 py-3 border-t border-border text-center">
          <Link href="/dashboard/recorrentes"
            className="text-sm text-primary hover:text-primary/80 transition-colors">
            Ver mais {items.length - 6} conta{items.length - 6 > 1 ? 's' : ''}
          </Link>
        </div>
      )}
    </div>
  )
}
