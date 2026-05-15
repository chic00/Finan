import { getBudgetsWithSpent } from '@/actions/budgets'
import { getCategories } from '@/actions/categories'
import { OrcamentosClient } from '@/components/orcamentos/OrcamentosClient'

export const metadata = { title: 'Orçamentos | Fyneo' }

export default async function OrcamentosPage() {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const [budgets, categories] = await Promise.all([
    getBudgetsWithSpent(month, year),
    getCategories(),
  ])

  return (
    <OrcamentosClient
      budgets={budgets}
      categories={categories}
      currentMonth={month}
      currentYear={year}
    />
  )
}
