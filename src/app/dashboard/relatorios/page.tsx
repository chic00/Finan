import { auth } from '@/lib/auth'
import { db, transactions, categories } from '@/lib/db'
import { eq, and, gte, lte, desc } from 'drizzle-orm'
import { RelatoriosClient } from '@/components/relatorios/RelatoriosClient'

export default async function RelatoriosPage() {
  const session = await auth()
  const userId = session!.user!.id!

  // Gera dados dos últimos 6 meses
  const now = new Date()
  const months: { month: number; year: number; label: string }[] = []
  const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ month: d.getMonth(), year: d.getFullYear(), label: `${MONTHS[d.getMonth()]}/${d.getFullYear().toString().slice(2)}` })
  }

  // Busca todas as transações dos últimos 6 meses
  const startDate = new Date(months[0].year, months[0].month, 1)
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const allTransactions = await db.query.transactions.findMany({
    where: and(
      eq(transactions.userId, userId),
      gte(transactions.date, startDate),
      lte(transactions.date, endDate)
    ),
    with: { category: true },
    orderBy: [desc(transactions.date)],
  })

  // Agrupa por mês para o gráfico de evolução
  const monthlyData = months.map(({ month, year, label }) => {
    const monthTx = allTransactions.filter((t) => {
      const d = new Date(t.date)
      return d.getMonth() === month && d.getFullYear() === year
    })
    const income = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount as string), 0)
    const expense = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount as string), 0)
    return { label, income, expense, balance: income - expense }
  })

  // Top categorias do mês atual
  const currentMonthTx = allTransactions.filter((t) => {
    const d = new Date(t.date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && t.type === 'expense'
  })

  const categoryTotals: Record<string, { name: string; color: string; total: number }> = {}
  for (const t of currentMonthTx) {
    const key = t.category?.name || 'Sem categoria'
    const color = t.category?.color || '#6B7280'
    if (!categoryTotals[key]) categoryTotals[key] = { name: key, color, total: 0 }
    categoryTotals[key].total += parseFloat(t.amount as string)
  }

  const topCategories = Object.values(categoryTotals)
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)

  // Totais gerais
  const totalIncome = allTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount as string), 0)
  const totalExpense = allTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount as string), 0)

  return (
    <RelatoriosClient
      monthlyData={monthlyData}
      topCategories={topCategories}
      totalIncome={totalIncome}
      totalExpense={totalExpense}
      totalTransactions={allTransactions.length}
    />
  )
}
