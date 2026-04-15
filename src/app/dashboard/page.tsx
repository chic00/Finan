import { auth } from '@/lib/auth'
import { db, transactions, bankAccounts, recurringTransactions } from '@/lib/db'
import { eq, and, gte, lte } from 'drizzle-orm'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { RecentTransactions } from '@/components/dashboard/RecentTransactions'
import { CategoryChart } from '@/components/dashboard/CategoryChart'
import { BalanceOverview } from '@/components/dashboard/BalanceOverview'
import { BudgetAlerts } from '@/components/dashboard/BudgetAlerts'
import { RecurringAlert } from '@/components/dashboard/RecurringAlert'
import { checkBudgetAlerts } from '@/actions/budgets'

export default async function DashboardPage() {
  const session = await auth()
  const userId = session!.user!.id!

  const now        = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  // ── Busca em paralelo ─────────────────────────────────────────────
  const [accounts, monthlyTransactions, budgetAlerts, recurringThisMonth] = await Promise.all([
    db.query.bankAccounts.findMany({
      where: eq(bankAccounts.userId, userId),
    }),
    db.query.transactions.findMany({
      where: and(
        eq(transactions.userId, userId),
        gte(transactions.date, monthStart),
        lte(transactions.date, monthEnd)
      ),
      with: { category: true, account: true },
      orderBy: (t, { desc }) => [desc(t.date)],
    }),
    checkBudgetAlerts(now.getMonth() + 1, now.getFullYear()),

    // ✅ Recorrentes ativas com vencimento neste mês ou já vencidas e não pagas
    db.query.recurringTransactions.findMany({
      where: and(
        eq(recurringTransactions.userId, userId),
        eq(recurringTransactions.isActive, true),
      ),
      with: { category: true, account: true },
      orderBy: (r, { asc }) => [asc(r.nextDueDate)],
    }),
  ])

  // ── Filtra recorrentes relevantes para o mês atual ────────────────
  // Inclui: vencimentos neste mês + pendentes vencidos de meses anteriores
  const relevantRecurring = recurringThisMonth.filter((r) => {
    const due = new Date(r.nextDueDate)
    const isThisMonth = due >= monthStart && due <= monthEnd
    const isOverdueUnpaid = due < monthStart && !r.isPaid
    return isThisMonth || isOverdueUnpaid
  })

  // ── KPIs ─────────────────────────────────────────────────────────
  const totalBalance = accounts.reduce(
    (sum, acc) => sum + parseFloat(acc.balance as string), 0
  )

  const monthlyIncome = monthlyTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + parseFloat(t.amount as string), 0)

  const monthlyExpense = monthlyTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + parseFloat(t.amount as string), 0)

  const expensesByCategory = monthlyTransactions
    .filter((t) => t.type === 'expense')
    .reduce(
      (acc, t) => {
        const catName  = t.category?.name  || 'Sem categoria'
        const catColor = t.category?.color || '#6B7280'
        if (!acc[catName]) acc[catName] = { amount: 0, color: catColor }
        acc[catName].amount += parseFloat(t.amount as string)
        return acc
      },
      {} as Record<string, { amount: number; color: string }>
    )

  const MONTHS = [
    'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">
          {MONTHS[now.getMonth()]} {now.getFullYear()} — visão geral das suas finanças
        </p>
      </div>

      {/* Alertas de orçamento */}
      {budgetAlerts.length > 0 && (
        <BudgetAlerts alerts={budgetAlerts} />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Saldo Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${totalBalance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
              {formatCurrency(totalBalance)}
            </p>
            <p className="text-xs text-gray-500 mt-1">{accounts.length} conta(s)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Receitas do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(monthlyIncome)}</p>
            <p className="text-xs text-gray-500 mt-1">
              {monthlyTransactions.filter((t) => t.type === 'income').length} transações
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Despesas do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(monthlyExpense)}</p>
            <p className="text-xs text-gray-500 mt-1">
              {monthlyTransactions.filter((t) => t.type === 'expense').length} transações
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ✅ NOVO: Bloco de contas recorrentes do mês */}
      {relevantRecurring.length > 0 && (
        <RecurringAlert items={relevantRecurring} />
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryChart data={expensesByCategory} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Saldo por Conta</CardTitle>
          </CardHeader>
          <CardContent>
            <BalanceOverview accounts={accounts} />
          </CardContent>
        </Card>
      </div>

      {/* Transações recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Transações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentTransactions transactions={monthlyTransactions.slice(0, 10)} />
        </CardContent>
      </Card>
    </div>
  )
}
