'use server'

import { auth } from '@/lib/auth'
import { db, budgets, transactions } from '@/lib/db'
import { eq, and, gte, lte } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { budgetSchema } from '@/lib/validations'
import { redirect } from 'next/navigation'

export async function createOrUpdateBudget(formData: unknown) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const parsed = budgetSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  try {
    const existing = await db.query.budgets.findFirst({
      where: and(
        eq(budgets.userId, session.user.id),
        eq(budgets.categoryId, parsed.data.categoryId),
        eq(budgets.month, parsed.data.month),
        eq(budgets.year, parsed.data.year)
      ),
    })

    if (existing) {
      await db.update(budgets)
        .set({ amount: parsed.data.amount.toString() })
        .where(eq(budgets.id, existing.id))
    } else {
      await db.insert(budgets).values({
        userId: session.user.id,
        categoryId: parsed.data.categoryId,
        amount: parsed.data.amount.toString(),
        month: parsed.data.month,
        year: parsed.data.year,
      })
    }

    revalidatePath('/dashboard/orcamentos')
    return { success: true }
  } catch (error) {
    console.error('Error creating budget:', error)
    return { error: 'Erro ao criar orçamento' }
  }
}

export async function deleteBudget(id: string) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  try {
    const existing = await db.query.budgets.findFirst({ where: eq(budgets.id, id) })
    if (!existing || existing.userId !== session.user.id) {
      return { error: 'Orçamento não encontrado' }
    }
    await db.delete(budgets).where(eq(budgets.id, id))
    revalidatePath('/dashboard/orcamentos')
    return { success: true }
  } catch (error) {
    console.error('Error deleting budget:', error)
    return { error: 'Erro ao excluir orçamento' }
  }
}

export async function getBudgets(month: number, year: number) {
  const session = await auth()
  if (!session?.user?.id) return []

  return db.query.budgets.findMany({
    where: and(
      eq(budgets.userId, session.user.id),
      eq(budgets.month, month),
      eq(budgets.year, year)
    ),
    with: { category: true },
  })
}

// Retorna orçamentos com o valor gasto real no período
export async function getBudgetsWithSpent(month: number, year: number) {
  const session = await auth()
  if (!session?.user?.id) return []

  const budgetList = await getBudgets(month, year)
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0, 23, 59, 59)

  const result = await Promise.all(
    budgetList.map(async (budget) => {
      const spentResult = await db
        .select({ total: transactions.amount })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, session.user.id!),
            eq(transactions.categoryId, budget.categoryId),
            eq(transactions.type, 'expense'),
            gte(transactions.date, start),
            lte(transactions.date, end)
          )
        )

      const spent = spentResult.reduce(
        (sum, t) => sum + parseFloat(t.total as string),
        0
      )
      const budgetAmount = parseFloat(budget.amount as string)
      const percent = budgetAmount > 0 ? Math.round((spent / budgetAmount) * 100) : 0

      return {
        ...budget,
        spent,
        percent,
        isOverBudget: spent > budgetAmount,
        isNearLimit: percent >= 80 && spent <= budgetAmount,
      }
    })
  )

  return result
}

export async function checkBudgetAlerts(month: number, year: number) {
  const budgetsWithSpent = await getBudgetsWithSpent(month, year)

  return budgetsWithSpent
    .filter((b) => b.percent >= 80)
    .map((b) => ({
      category: b.category.name,
      budget: parseFloat(b.amount as string),
      spent: b.spent,
      percent: b.percent,
      isOverBudget: b.isOverBudget,
    }))
}
