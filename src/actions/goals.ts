'use server'

import { auth } from '@/lib/auth'
import { db, goals } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'
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

export async function contributeToGoal(id: string, amount: number) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  try {
    const goal = await db.query.goals.findFirst({
      where: eq(goals.id, id),
    })

    if (!goal) {
      return { error: 'Meta não encontrada' }
    }

    const currentAmount = parseFloat(goal.currentAmount as string)
    const newAmount = currentAmount + amount
    const isCompleted = newAmount >= parseFloat(goal.targetAmount as string)

    await db.update(goals)
      .set({
        currentAmount: newAmount.toString(),
        isCompleted,
        updatedAt: new Date(),
      })
      .where(eq(goals.id, id))

    revalidatePath('/dashboard/metas')
    return { success: true }
  } catch (error) {
    console.error('Error contributing to goal:', error)
    return { error: 'Erro ao contribuir para meta' }
  }
}

export async function deleteGoal(id: string) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  try {
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
