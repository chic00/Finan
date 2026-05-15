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

export const metadata = { title: 'Dashboard | Fyneo' }

export default async function DashboardPage() {
  const session = await auth()
  const userId = session!.user!.id!

  const now        = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

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
    db.query.recurringTransactions.findMany({
      where: and(
        eq(recurringTransactions.userId, userId),
        eq(recurringTransactions.isActive, true),
      ),
      with: { category: true, account: true },
      orderBy: (r, { asc }) => [asc(r.nextDueDate)],
    }),
  ])

  // ── Recorrentes relevantes para o mês atual ───────────────────────
  // Inclui: vencimento neste mês OU vencidas e não pagas de meses anteriores
  const relevantRecurring = recurringThisMonth.filter((r) => {
    const due = new Date(r.nextDueDate)
    const dueMonth = due.getMonth()
    const dueYear  = due.getFullYear()
    const isThisMonth    = dueMonth === now.getMonth() && dueYear === now.getFullYear()
    const isOverdueUnpaid = due < monthStart && !r.isPaid
    return isThisMonth || isOverdueUnpaid
  })

  // ── KPIs ──────────────────────────────────────────────────────────
  // Saldo total: soma dos saldos das contas bancárias (fonte da verdade)
  const totalBalance = accounts.reduce(
    (sum, acc) => sum + parseFloat(acc.balance as string),
    0
  )

  // Receitas do mês: transações reais registradas
  const monthlyIncome = monthlyTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + parseFloat(t.amount as string), 0)

  // Despesas do mês: transações reais registradas (inclui recorrentes pagas via togglePaid)
  const monthlyExpense = monthlyTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + parseFloat(t.amount as string), 0)

  // Despesas recorrentes do mês atual que ainda NÃO foram pagas (projetadas)
  // Serve apenas para mostrar o que ainda está pendente
  const pendingRecurringExpense = relevantRecurring
    .filter((r) => r.type === 'expense' && !r.isPaid)
    .reduce((sum, r) => sum + parseFloat(r.amount as string), 0)

  // Despesas por categoria (apenas transações reais)
  const expensesByCategory = monthlyTransactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => {
      const catName  = t.category?.name  || 'Sem categoria'
      const catColor = t.category?.color || '#6B7280'
      if (!acc[catName]) acc[catName] = { amount: 0, color: catColor }
      acc[catName].amount += parseFloat(t.amount as string)
      return acc
    }, {} as Record<string, { amount: number; color: string }>)

  const MONTHS = [
    'Janeiro','Fevereiro','Marco','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>
          Dashboard
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          {MONTHS[now.getMonth()]} {now.getFullYear()} — visão geral das suas finanças
        </p>
      </div>

      {budgetAlerts.length > 0 && <BudgetAlerts alerts={budgetAlerts} />}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Saldo Total */}
        <div
          className="rounded-2xl p-5 transition-all"
          style={{
            backgroundColor: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium" style={{ color: 'var(--color-muted-foreground)' }}>
              Saldo Total
            </p>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 15%, transparent)' }}
            >
              <Wallet size={16} style={{ color: 'var(--color-primary)' }} />
            </div>
          </div>
          <p
            className="text-2xl font-bold"
            style={{ color: totalBalance >= 0 ? 'var(--color-foreground)' : 'var(--color-destructive)' }}
          >
            {formatCurrency(totalBalance)}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
            {accounts.length} conta(s) · saldo real atual
          </p>
        </div>

        {/* Receitas do Mês */}
        <div
          className="rounded-2xl p-5 transition-all"
          style={{
            backgroundColor: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium" style={{ color: 'var(--color-muted-foreground)' }}>
              Receitas do Mês
            </p>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-success) 15%, transparent)' }}
            >
              <TrendingUp size={16} style={{ color: 'var(--color-success)' }} />
            </div>
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--color-success)' }}>
            {formatCurrency(monthlyIncome)}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
            {monthlyTransactions.filter((t) => t.type === 'income').length} transação(ões) registrada(s)
          </p>
        </div>

        {/* Despesas do Mês */}
        <div
          className="rounded-2xl p-5 transition-all"
          style={{
            backgroundColor: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium" style={{ color: 'var(--color-muted-foreground)' }}>
              Despesas do Mês
            </p>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-destructive) 15%, transparent)' }}
            >
              <TrendingDown size={16} style={{ color: 'var(--color-destructive)' }} />
            </div>
          </div>
          <p className="text-2xl font-bold" style={{ color: 'var(--color-destructive)' }}>
            {formatCurrency(monthlyExpense)}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
            {monthlyTransactions.filter((t) => t.type === 'expense').length} paga(s)
            {pendingRecurringExpense > 0
              ? <span style={{ color: 'var(--color-warning)' }}> · {formatCurrency(pendingRecurringExpense)} pendente em recorrentes</span>
              : <span style={{ color: 'var(--color-success)' }}> · tudo em dia</span>
            }
          </p>
        </div>
      </div>

      {/* Bloco de recorrentes do mês */}
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
