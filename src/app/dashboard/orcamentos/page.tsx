import { auth } from '@/lib/auth'
import { getBudgets } from '@/actions/budgets'
import { getCategories } from '@/actions/categories'
import { OrcamentosClient } from '@/components/orcamentos/OrcamentosClient'

export default async function OrcamentosPage() {
  const now = new Date()
  const [budgets, categories] = await Promise.all([
    getBudgets(now.getMonth() + 1, now.getFullYear()),
    getCategories(),
  ])

  return <OrcamentosClient budgets={budgets} categories={categories} />
}
