'use server'

import { auth } from '@/lib/auth'
import { db, goals, transactions, bankAccounts } from '@/lib/db'
import { eq, desc, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { goalSchema } from '@/lib/validations'
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
    const existing = await db.query.goals.findFirst({
      where: eq(goals.id, id),
    })
    if (!existing || existing.userId !== session.user.id) {
      return { error: 'Meta não encontrada' }
    }

    await db
      .update(goals)
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

// FIX: operação atômica — débito de conta + atualização de meta na mesma transação DB
export async function contributeToGoal(
  id: string,
  amount: number,
  accountId: string
) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  try {
    const goal = await db.query.goals.findFirst({
      where: eq(goals.id, id),
    })
    if (!goal || goal.userId !== session.user.id) {
      return { error: 'Meta não encontrada' }
    }
    if (goal.isCompleted) {
      return { error: 'Esta meta já foi concluída' }
    }

    const account = await db.query.bankAccounts.findFirst({
      where: eq(bankAccounts.id, accountId),
    })
    if (!account || account.userId !== session.user.id) {
      return { error: 'Conta não encontrada' }
    }
    if (parseFloat(account.balance as string) < amount) {
      return { error: 'Saldo insuficiente na conta selecionada' }
    }

    const newAmount =
      parseFloat(goal.currentAmount as string) + amount
    const isCompleted =
      newAmount >= parseFloat(goal.targetAmount as string)

    // Tudo numa transação atômica: se qualquer passo falhar, tudo reverte
    await db.transaction(async (tx) => {
      // 1. Atualiza a meta
      await tx
        .update(goals)
        .set({
          currentAmount: newAmount.toString(),
          isCompleted,
          updatedAt: new Date(),
        })
        .where(eq(goals.id, id))

      // 2. Debita da conta de forma atômica (sem race condition)
      await tx
        .update(bankAccounts)
        .set({
          balance: sql`${bankAccounts.balance} - ${amount.toString()}`,
          updatedAt: new Date(),
        })
        .where(eq(bankAccounts.id, accountId))

      // 3. Registra a despesa para rastreamento
      await tx.insert(transactions).values({
        userId: session.user!.id!,
        accountId,
        type: 'expense',
        amount: amount.toString(),
        description: `Contribuição para meta: ${goal.name}`,
        date: new Date(),
      })
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
    const existing = await db.query.goals.findFirst({
      where: eq(goals.id, id),
    })
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
