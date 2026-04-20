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

  const [accounts, monthlyTransactions, budgetAlerts, recurringThisMonth] = await Promise.all([
    db.query.bankAccounts.findMany({ where: eq(bankAccounts.userId, userId) }),
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
    db.query.recurringTransactions.findMany({
      where: and(eq(recurringTransactions.userId, userId), eq(recurringTransactions.isActive, true)),
      with: { category: true, account: true },
      orderBy: (r, { asc }) => [asc(r.nextDueDate)],
    }),
  ])

  const relevantRecurring = recurringThisMonth.filter((r) => {
    const due = new Date(r.nextDueDate)
    const isThisMonth = due >= monthStart && due <= monthEnd
    const isOverdueUnpaid = due < monthStart && !r.isPaid
    return isThisMonth || isOverdueUnpaid
  })

  const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance as string), 0)
  const monthlyIncome = monthlyTransactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount as string), 0)
  const monthlyExpense = monthlyTransactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount as string), 0)

  const expensesByCategory = monthlyTransactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => {
      const catName  = t.category?.name  || 'Sem categoria'
      const catColor = t.category?.color || '#6B7280'
      if (!acc[catName]) acc[catName] = { amount: 0, color: catColor }
      acc[catName].amount += parseFloat(t.amount as string)
      return acc
    }, {} as Record<string, { amount: number; color: string }>)

  const MONTHS = ['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>Dashboard</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          {MONTHS[now.getMonth()]} {now.getFullYear()} — visao geral das suas financas
        </p>
      </div>

      {budgetAlerts.length > 0 && <BudgetAlerts alerts={budgetAlerts} />}

      {/* KPI Cards — sem bordas Tailwind hardcoded */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Saldo Total */}
        <div className="rounded-2xl p-5 transition-all"
          style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Saldo Total</p>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 15%, transparent)' }}>
              <Wallet size={16} style={{ color: 'var(--color-primary)' }} />
            </div>
          </div>
          <p className="text-2xl font-bold" style={{ color: totalBalance >= 0 ? 'var(--color-foreground)' : 'var(--color-destructive)' }}>
            {formatCurrency(totalBalance)}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-muted-foreground)' }}>{accounts.length} conta(s) ativas</p>
        </div>

        {/* Receitas */}
        <div className="rounded-2xl p-5 transition-all"
          style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Receitas do Mes</p>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-success) 15%, transparent)' }}>
              <TrendingUp size={16} style={{ color: 'var(--color-success)' }} />
            </div>
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--color-success)' }}>{formatCurrency(monthlyIncome)}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
            {monthlyTransactions.filter((t) => t.type === 'income').length} transacoes
          </p>
        </div>

        {/* Despesas */}
        <div className="rounded-2xl p-5 transition-all"
          style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Despesas do Mes</p>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-destructive) 15%, transparent)' }}>
              <TrendingDown size={16} style={{ color: 'var(--color-destructive)' }} />
            </div>
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--color-destructive)' }}>{formatCurrency(monthlyExpense)}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
            {monthlyTransactions.filter((t) => t.type === 'expense').length} transacoes
          </p>
        </div>
      </div>

      {relevantRecurring.length > 0 && <RecurringAlert items={relevantRecurring} />}

      {/* Charts */}
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

      {/* Recent Transactions */}
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
