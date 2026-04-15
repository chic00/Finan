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
  const paid    = items.filter((i) => i.isPaid)
  const overdue = unpaid.filter((i) => daysUntil(new Date(i.nextDueDate)) < 0)

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RefreshCw size={18} className="text-blue-600" />
          <h3 className="font-semibold text-gray-900">Contas Recorrentes — este mês</h3>
          {overdue.length > 0 && (
            <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
              <AlertTriangle size={11} />
              {overdue.length} vencida{overdue.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <Link href="/dashboard/recorrentes"
          className="text-sm text-blue-600 hover:underline flex items-center gap-1">
          Ver todas <ArrowRight size={14} />
        </Link>
      </div>

      {/* Resumo financeiro */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
        <div className="px-5 py-3">
          <p className="text-xs text-gray-500">Total despesas</p>
          <p className="text-base font-bold text-red-600">{formatCurrency(totalExpense)}</p>
        </div>
        <div className="px-5 py-3">
          <p className="text-xs text-gray-500">Total receitas</p>
          <p className="text-base font-bold text-green-600">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="px-5 py-3">
          <p className="text-xs text-gray-500">Pendentes</p>
          <p className="text-base font-bold text-orange-600">{unpaid.length} de {items.length}</p>
        </div>
      </div>

      {/* Lista de itens (máx 5, ordenados por urgência) */}
      <div className="divide-y divide-gray-50">
        {items
          .slice()
          .sort((a, b) => {
            // Não pagas primeiro, depois por data
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
                  isLate ? 'bg-red-50/40' : ''
                }`}>
                <div className="flex items-center gap-3 min-w-0">
                  {item.isPaid
                    ? <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
                    : <Circle      size={16} className={`flex-shrink-0 ${isLate ? 'text-red-400' : 'text-gray-300'}`} />
                  }
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${item.isPaid ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                      {item.description || 'Sem descrição'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.category?.name || '—'} ·{' '}
                      {item.isPaid
                        ? <span className="text-green-600 font-medium">Pago</span>
                        : days < 0
                          ? <span className="text-red-600 font-medium">Vencida há {Math.abs(days)} dia{Math.abs(days) > 1 ? 's' : ''}</span>
                          : days === 0
                            ? <span className="text-red-600 font-medium">Vence hoje</span>
                            : <span>Vence em {days} dia{days > 1 ? 's' : ''} — {formatDate(new Date(item.nextDueDate))}</span>
                      }
                    </p>
                  </div>
                </div>
                <p className={`text-sm font-bold flex-shrink-0 ml-4 ${
                  item.isPaid
                    ? 'text-gray-400'
                    : item.type === 'expense' ? 'text-red-600' : 'text-green-600'
                }`}>
                  {item.type === 'income' ? '+' : '-'}{formatCurrency(parseFloat(item.amount))}
                </p>
              </div>
            )
          })}
      </div>

      {items.length > 6 && (
        <div className="px-6 py-3 border-t border-gray-100 text-center">
          <Link href="/dashboard/recorrentes"
            className="text-sm text-blue-600 hover:underline">
            Ver mais {items.length - 6} conta{items.length - 6 > 1 ? 's' : ''}
          </Link>
        </div>
      )}
    </div>
  )
}
