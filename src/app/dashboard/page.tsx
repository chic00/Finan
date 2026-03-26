import { auth } from '@/lib/auth'
import { db, transactions, bankAccounts, categories } from '@/lib/db'
import { eq, and, gte, lte, sql } from 'drizzle-orm'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { RecentTransactions } from '@/components/dashboard/RecentTransactions'
import { CategoryChart } from '@/components/dashboard/CategoryChart'
import { BalanceOverview } from '@/components/dashboard/BalanceOverview'

export default async function DashboardPage() {
  const session = await auth()
  const userId = session!.user!.id!

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  // Get all accounts
  const accounts = await db.query.bankAccounts.findMany({
    where: eq(bankAccounts.userId, userId),
  })

  // Get monthly transactions
  const monthlyTransactions = await db.query.transactions.findMany({
    where: and(
      eq(transactions.userId, userId),
      gte(transactions.date, monthStart),
      lte(transactions.date, monthEnd)
    ),
    with: { category: true, account: true },
    orderBy: (t, { desc }) => [desc(t.date)],
  })

  // Calculate totals
  const totalBalance = accounts.reduce((sum, acc) => {
    return sum + parseFloat(acc.balance as string)
  }, 0)

  const monthlyIncome = monthlyTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + parseFloat(t.amount as string), 0)

  const monthlyExpense = monthlyTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + parseFloat(t.amount as string), 0)

  const expensesByCategory = monthlyTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      const catName = t.category?.name || 'Sem categoria'
      const catColor = t.category?.color || '#6B7280'
      const amount = parseFloat(t.amount as string)
      if (!acc[catName]) {
        acc[catName] = { amount: 0, color: catColor }
      }
      acc[catName].amount += amount
      return acc
    }, {} as Record<string, { amount: number; color: string }>)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">
          Visão geral das suas finanças
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(monthlyIncome)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {monthlyTransactions.filter(t => t.type === 'income').length} transações
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Despesas do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(monthlyExpense)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {monthlyTransactions.filter(t => t.type === 'expense').length} transações
            </p>
          </CardContent>
        </Card>
      </div>

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
          <CardTitle>Transações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentTransactions transactions={monthlyTransactions.slice(0, 10)} />
        </CardContent>
      </Card>
    </div>
  )
}
