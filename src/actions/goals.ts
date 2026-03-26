'use server'

import { auth } from '@/lib/auth'
import { db, goals, transactions, bankAccounts } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { goalSchema, goalContributionSchema } from '@/lib/validations'
import { redirect } from 'next/navigation'

export async function createGoal(formData: unknown) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const parsed = goalSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  try {
    await db.insert(goals).values({
      userId: session.user.id,
      name: parsed.data.name,
      targetAmount: parsed.data.targetAmount.toString(),
      deadline: parsed.data.deadline,
    })

    revalidatePath('/dashboard/metas')
    return { success: true }
  } catch (error) {
    console.error('Error creating goal:', error)
    return { error: 'Erro ao criar meta' }
  }
}

export async function updateGoal(id: string, formData: unknown) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const parsed = goalSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  try {
    const existing = await db.query.goals.findFirst({ where: eq(goals.id, id) })
    if (!existing || existing.userId !== session.user.id) {
      return { error: 'Meta não encontrada' }
    }

    await db.update(goals)
      .set({
        name: parsed.data.name,
        targetAmount: parsed.data.targetAmount.toString(),
        deadline: parsed.data.deadline,
        updatedAt: new Date(),
      })
      .where(eq(goals.id, id))

    revalidatePath('/dashboard/metas')
    return { success: true }
  } catch (error) {
    console.error('Error updating goal:', error)
    return { error: 'Erro ao atualizar meta' }
  }
}

// FIX: contribuição agora recebe conta de origem e registra uma transação
export async function contributeToGoal(id: string, amount: number, accountId: string) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  try {
    const goal = await db.query.goals.findFirst({ where: eq(goals.id, id) })
    if (!goal || goal.userId !== session.user.id) {
      return { error: 'Meta não encontrada' }
    }

    if (goal.isCompleted) {
      return { error: 'Esta meta já foi concluída' }
    }

    // Verifica saldo da conta
    const account = await db.query.bankAccounts.findFirst({ where: eq(bankAccounts.id, accountId) })
    if (!account || account.userId !== session.user.id) {
      return { error: 'Conta não encontrada' }
    }
    if (parseFloat(account.balance as string) < amount) {
      return { error: 'Saldo insuficiente na conta selecionada' }
    }

    const currentAmount = parseFloat(goal.currentAmount as string)
    const newAmount = currentAmount + amount
    const isCompleted = newAmount >= parseFloat(goal.targetAmount as string)

    // Atualiza a meta
    await db.update(goals)
      .set({
        currentAmount: newAmount.toString(),
        isCompleted,
        updatedAt: new Date(),
      })
      .where(eq(goals.id, id))

    // Debita da conta
    await db.update(bankAccounts)
      .set({ balance: (parseFloat(account.balance as string) - amount).toString() })
      .where(eq(bankAccounts.id, accountId))

    // Registra como transação de despesa para rastreamento
    await db.insert(transactions).values({
      userId: session.user.id,
      accountId,
      type: 'expense',
      amount: amount.toString(),
      description: `Contribuição para meta: ${goal.name}`,
      date: new Date(),
    })

    revalidatePath('/dashboard/metas')
    revalidatePath('/dashboard/contas')
    revalidatePath('/dashboard')
    return { success: true, isCompleted }
  } catch (error) {
    console.error('Error contributing to goal:', error)
    return { error: 'Erro ao contribuir para meta' }
  }
}

export async function deleteGoal(id: string) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  try {
    const existing = await db.query.goals.findFirst({ where: eq(goals.id, id) })
    if (!existing || existing.userId !== session.user.id) {
      return { error: 'Meta não encontrada' }
    }

    await db.delete(goals).where(eq(goals.id, id))
    revalidatePath('/dashboard/metas')
    return { success: true }
  } catch (error) {
    console.error('Error deleting goal:', error)
    return { error: 'Erro ao excluir meta' }
  }
}

export async function getGoals() {
  const session = await auth()
  if (!session?.user?.id) return []

  return db.query.goals.findMany({
    where: eq(goals.userId, session.user.id),
    orderBy: [desc(goals.createdAt)],
  })
}
