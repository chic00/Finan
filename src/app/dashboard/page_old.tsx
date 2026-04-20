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
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'

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

    // Recorrentes ativas com vencimento neste mes ou ja vencidas e nao pagas
    db.query.recurringTransactions.findMany({
      where: and(
        eq(recurringTransactions.userId, userId),
        eq(recurringTransactions.isActive, true),
      ),
      with: { category: true, account: true },
      orderBy: (r, { asc }) => [asc(r.nextDueDate)],
    }),
  ])

  // ── Filtra recorrentes relevantes para o mes atual ────────────────
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
    'Janeiro','Fevereiro','Marco','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          {MONTHS[now.getMonth()]} {now.getFullYear()} — visao geral das suas financas
        </p>
      </div>

      {/* Alertas de orcamento */}
      {budgetAlerts.length > 0 && (
        <BudgetAlerts alerts={budgetAlerts} />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Total</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wallet className="text-primary" size={16} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className={`text-2xl font-bold ${totalBalance >= 0 ? 'text-foreground' : 'text-destructive'}`}>
              {formatCurrency(totalBalance)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{accounts.length} conta(s) ativas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Receitas do Mes</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                <TrendingUp className="text-success" size={16} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-bold text-success">{formatCurrency(monthlyIncome)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {monthlyTransactions.filter((t) => t.type === 'income').length} transacoes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Despesas do Mes</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                <TrendingDown className="text-destructive" size={16} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-bold text-destructive">{formatCurrency(monthlyExpense)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {monthlyTransactions.filter((t) => t.type === 'expense').length} transacoes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bloco de contas recorrentes do mes */}
      {relevantRecurring.length > 0 && (
        <RecurringAlert items={relevantRecurring} />
      )}

      {/* Graficos */}
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

      {/* Transacoes recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Transacoes Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentTransactions transactions={monthlyTransactions.slice(0, 10)} />
        </CardContent>
      </Card>
    </div>
  )
}
