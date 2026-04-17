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
          className="flex items-start gap-3 px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-xl"
        >
          <XCircle className="text-destructive shrink-0 mt-0.5" size={18} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-destructive">
              Orcamento estourado: <strong>{alert.category}</strong>
            </p>
            <p className="text-xs text-destructive/80 mt-0.5">
              Gasto {formatCurrency(alert.spent)} de {formatCurrency(alert.budget)} ({alert.percent}%)
            </p>
          </div>
          <Link
            href="/dashboard/orcamentos"
            className="text-xs text-destructive hover:underline font-medium shrink-0"
          >
            Ver
          </Link>
        </div>
      ))}

      {nearLimit.map((alert) => (
        <div
          key={alert.category}
          className="flex items-start gap-3 px-4 py-3 bg-warning/10 border border-warning/20 rounded-xl"
        >
          <AlertTriangle className="text-warning shrink-0 mt-0.5" size={18} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-warning">
              Atencao: <strong>{alert.category}</strong> — {alert.percent}% do orcamento utilizado
            </p>
            <p className="text-xs text-warning/80 mt-0.5">
              {formatCurrency(alert.spent)} de {formatCurrency(alert.budget)}
            </p>
          </div>
          <Link
            href="/dashboard/orcamentos"
            className="text-xs text-warning hover:underline font-medium shrink-0"
          >
            Ver
          </Link>
        </div>
      ))}
    </div>
  )
}
