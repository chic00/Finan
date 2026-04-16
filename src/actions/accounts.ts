'use server'

import { auth } from '@/lib/auth'
import { db, bankAccounts } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { accountSchema } from '@/lib/validations'
import { redirect } from 'next/navigation'

export async function createAccount(formData: unknown) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const parsed = accountSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  try {
    await db.insert(bankAccounts).values({
      userId: session.user!.id,
      name: parsed.data.name,
      type: parsed.data.type,
      balance: parsed.data.balance.toString(),
      color: parsed.data.color,
      icon: parsed.data.icon,
    })

    revalidatePath('/dashboard/contas')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error creating account:', error)
    return { error: 'Erro ao criar conta' }
  }
}

export async function updateAccount(id: string, formData: unknown) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const parsed = accountSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  try {
    // Verifica ownership antes de atualizar
    const existing = await db.query.bankAccounts.findFirst({
      where: eq(bankAccounts.id, id),
    })
    if (!existing || existing.userId !== session.user!.id) {
      return { error: 'Conta não encontrada' }
    }

    await db.update(bankAccounts)
      .set({
        name: parsed.data.name,
        type: parsed.data.type,
        balance: parsed.data.balance.toString(),
        color: parsed.data.color,
        icon: parsed.data.icon,
        updatedAt: new Date(),
      })
      .where(eq(bankAccounts.id, id))

    revalidatePath('/dashboard/contas')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error updating account:', error)
    return { error: 'Erro ao atualizar conta' }
  }
}

export async function deleteAccount(id: string) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  try {
    // Verifica ownership
    const existing = await db.query.bankAccounts.findFirst({
      where: eq(bankAccounts.id, id),
    })
    if (!existing || existing.userId !== session.user!.id) {
      return { error: 'Conta não encontrada' }
    }

    await db.delete(bankAccounts).where(eq(bankAccounts.id, id))
    revalidatePath('/dashboard/contas')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error deleting account:', error)
    return { error: 'Erro ao excluir conta' }
  }
}

export async function getAccounts() {
  const session = await auth()
  if (!session?.user?.id) return []

  return db.query.bankAccounts.findMany({
    where: eq(bankAccounts.userId, session.user!.id),
    orderBy: (a, { desc }) => [desc(a.createdAt)],
  })
}
