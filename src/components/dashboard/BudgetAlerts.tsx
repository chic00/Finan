import { AlertTriangle, XCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

interface Alert {
  category: string
  budget: number
  spent: number
  percent: number
  isOverBudget: boolean
}

interface BudgetAlertsProps {
  alerts: Alert[]
}

export function BudgetAlerts({ alerts }: BudgetAlertsProps) {
  const overBudget = alerts.filter((a) => a.isOverBudget)
  const nearLimit = alerts.filter((a) => !a.isOverBudget)

  return (
    <div className="space-y-2">
      {overBudget.map((alert) => (
        <div
          key={alert.category}
          className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl"
        >
          <XCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-800">
              Orçamento estourado: <strong>{alert.category}</strong>
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              Gasto {formatCurrency(alert.spent)} de {formatCurrency(alert.budget)} ({alert.percent}%)
            </p>
          </div>
          <Link
            href="/dashboard/orcamentos"
            className="text-xs text-red-600 hover:underline font-medium flex-shrink-0"
          >
            Ver
          </Link>
        </div>
      ))}

      {nearLimit.map((alert) => (
        <div
          key={alert.category}
          className="flex items-start gap-3 px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-xl"
        >
          <AlertTriangle className="text-yellow-500 flex-shrink-0 mt-0.5" size={18} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-yellow-800">
              Atenção: <strong>{alert.category}</strong> — {alert.percent}% do orçamento utilizado
            </p>
            <p className="text-xs text-yellow-600 mt-0.5">
              {formatCurrency(alert.spent)} de {formatCurrency(alert.budget)}
            </p>
          </div>
          <Link
            href="/dashboard/orcamentos"
            className="text-xs text-yellow-700 hover:underline font-medium flex-shrink-0"
          >
            Ver
          </Link>
        </div>
      ))}
    </div>
  )
}
