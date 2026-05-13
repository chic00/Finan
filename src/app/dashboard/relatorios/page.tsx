import { auth } from '@/lib/auth'
import { db, transactions } from '@/lib/db'
import { eq, and, gte, lte, desc } from 'drizzle-orm'
import { RelatoriosClient } from '@/components/relatorios/RelatoriosClient'

interface Props {
  searchParams: Promise<{ from?: string; to?: string }>
}

export default async function RelatoriosPage({ searchParams }: Props) {
  const session = await auth()
  const userId  = session!.user!.id!
  const params  = await searchParams

  const now = new Date()

  // Padrão: últimos 6 meses se não houver filtro
  const defaultFrom = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const defaultTo   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const startDate = params.from ? new Date(params.from + 'T00:00:00') : defaultFrom
  const endDate   = params.to   ? new Date(params.to   + 'T23:59:59') : defaultTo

  const allTransactions = await db.query.transactions.findMany({
    where: and(
      eq(transactions.userId, userId),
      gte(transactions.date, startDate),
      lte(transactions.date, endDate)
    ),
    with: { category: true },
    orderBy: [desc(transactions.date)],
  })

  // ── Monta série mensal dentro do período ──────────────────────────
  const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

  // Gera lista de meses únicos no período
  const monthSet = new Map<string, { month: number; year: number; label: string }>()
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
  while (cursor <= endDate) {
    const key = `${cursor.getFullYear()}-${cursor.getMonth()}`
    monthSet.set(key, {
      month: cursor.getMonth(),
      year:  cursor.getFullYear(),
      label: `${MONTHS[cursor.getMonth()]}/${String(cursor.getFullYear()).slice(2)}`,
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }

  const monthlyData = Array.from(monthSet.values()).map(({ month, year, label }) => {
    const monthTx = allTransactions.filter(t => {
      const d = new Date(t.date)
      return d.getMonth() === month && d.getFullYear() === year
    })
    const income  = monthTx.filter(t => t.type === 'income') .reduce((s, t) => s + parseFloat(t.amount as string), 0)
    const expense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount as string), 0)
    return { label, income, expense, balance: income - expense }
  })

  // ── Top categorias no período completo (despesas) ─────────────────
  const categoryTotals: Record<string, { name: string; color: string; total: number }> = {}
  for (const t of allTransactions.filter(t => t.type === 'expense')) {
    const key   = t.category?.name  || 'Sem categoria'
    const color = t.category?.color || '#6B7280'
    if (!categoryTotals[key]) categoryTotals[key] = { name: key, color, total: 0 }
    categoryTotals[key].total += parseFloat(t.amount as string)
  }
  const topCategories = Object.values(categoryTotals)
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)

  const totalIncome  = allTransactions.filter(t => t.type === 'income') .reduce((s, t) => s + parseFloat(t.amount as string), 0)
  const totalExpense = allTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount as string), 0)

  return (
    <RelatoriosClient
      monthlyData={monthlyData}
      topCategories={topCategories}
      totalIncome={totalIncome}
      totalExpense={totalExpense}
      totalTransactions={allTransactions.length}
      currentFrom={startDate.toISOString().split('T')[0]}
      currentTo={endDate.toISOString().split('T')[0]}
    />
  )
}
