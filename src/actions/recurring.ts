'use server'

import { auth } from '@/lib/auth'
import { db, recurringTransactions } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { calculateNextDueDate } from '@/lib/recurringUtils'

const recurringSchema = z.object({
  accountId: z.string().uuid('Conta é obrigatória'),
  categoryId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(''))
    .transform((v) => v || undefined),
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number().positive('Valor deve ser positivo'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
})

// ─── Marca como PAGO ou NÃO PAGO (toggle) ─────────────────────────
// Quando marcar como PAGO: registra paidAt e avança nextDueDate para o próximo ciclo
// Quando desmarcar como NÃO PAGO: limpa paidAt (volta ao estado anterior)
export async function togglePaid(id: string) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const recurring = await db.query.recurringTransactions.findFirst({
    where: and(
      eq(recurringTransactions.id, id),
      eq(recurringTransactions.userId, session.user.id)
    ),
  })

  if (!recurring) return { error: 'Recorrência não encontrada' }

  if (recurring.isPaid) {
    // ── DESMARCAR como não pago ────────────────────────────────────
    // Recalcula o nextDueDate a partir do startDate original
    // para restaurar a data de vencimento correta
    const restoredDueDate = calculateNextDueDate(
      new Date(recurring.startDate),
      recurring.frequency
    )

    await db
      .update(recurringTransactions)
      .set({
        isPaid: false,
        paidAt: null,
        nextDueDate: restoredDueDate,
        updatedAt: new Date(),
      })
      .where(eq(recurringTransactions.id, id))

    revalidatePath('/dashboard/recorrentes')
    return { success: true, isPaid: false }

  } else {
    // ── MARCAR como pago → avança para o próximo ciclo ────────────
    const currentDue = new Date(recurring.nextDueDate)
    const next = new Date(currentDue)

    switch (recurring.frequency) {
      case 'daily':   next.setDate(next.getDate() + 1);         break
      case 'weekly':  next.setDate(next.getDate() + 7);         break
      case 'monthly': next.setMonth(next.getMonth() + 1);       break
      case 'yearly':  next.setFullYear(next.getFullYear() + 1); break
    }

    // Verifica se passou da data de encerramento
    if (recurring.endDate && next > new Date(recurring.endDate)) {
      await db
        .update(recurringTransactions)
        .set({
          isPaid: true,
          paidAt: new Date(),
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(recurringTransactions.id, id))

      revalidatePath('/dashboard/recorrentes')
      return { success: true, isPaid: true, finished: true }
    }

    await db
      .update(recurringTransactions)
      .set({
        isPaid: true,
        paidAt: new Date(),
        nextDueDate: next,
        lastGenerated: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(recurringTransactions.id, id))

    revalidatePath('/dashboard/recorrentes')
    revalidatePath('/dashboard')
    return { success: true, isPaid: true, nextDueDate: next }
  }
}

// Mantido por compatibilidade (usado em outros lugares)
export async function advanceNextDueDate(id: string) {
  return togglePaid(id)
}

export async function createRecurringTransaction(formData: unknown) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const parsed = recurringSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  try {
    const nextDueDate = calculateNextDueDate(parsed.data.startDate, parsed.data.frequency)

    await db.insert(recurringTransactions).values({
      userId:      session.user.id,
      accountId:   parsed.data.accountId,
      categoryId:  parsed.data.categoryId,
      type:        parsed.data.type,
      amount:      parsed.data.amount.toString(),
      description: parsed.data.description,
      frequency:   parsed.data.frequency,
      startDate:   parsed.data.startDate,
      endDate:     parsed.data.endDate,
      nextDueDate,
      isPaid:      false,   // ✅ sempre começa como NÃO PAGO
      paidAt:      null,
    })

    revalidatePath('/dashboard/recorrentes')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error creating recurring:', error)
    return { error: 'Erro ao criar recorrência' }
  }
}

export async function updateRecurringTransaction(id: string, formData: unknown) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const parsed = recurringSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  try {
    const existing = await db.query.recurringTransactions.findFirst({
      where: and(
        eq(recurringTransactions.id, id),
        eq(recurringTransactions.userId, session.user.id)
      ),
    })
    if (!existing) return { error: 'Recorrência não encontrada' }

    const nextDueDate = calculateNextDueDate(parsed.data.startDate, parsed.data.frequency)

    await db
      .update(recurringTransactions)
      .set({
        accountId:   parsed.data.accountId,
        categoryId:  parsed.data.categoryId,
        type:        parsed.data.type,
        amount:      parsed.data.amount.toString(),
        description: parsed.data.description,
        frequency:   parsed.data.frequency,
        startDate:   parsed.data.startDate,
        endDate:     parsed.data.endDate,
        nextDueDate,
        // Ao editar, reseta o status de pagamento
        isPaid:      false,
        paidAt:      null,
        updatedAt:   new Date(),
      })
      .where(eq(recurringTransactions.id, id))

    revalidatePath('/dashboard/recorrentes')
    return { success: true }
  } catch (error) {
    console.error('Error updating recurring:', error)
    return { error: 'Erro ao atualizar recorrência' }
  }
}

export async function toggleRecurringTransaction(id: string) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  try {
    const existing = await db.query.recurringTransactions.findFirst({
      where: and(
        eq(recurringTransactions.id, id),
        eq(recurringTransactions.userId, session.user.id)
      ),
    })
    if (!existing) return { error: 'Recorrência não encontrada' }

    await db
      .update(recurringTransactions)
      .set({ isActive: !existing.isActive, updatedAt: new Date() })
      .where(eq(recurringTransactions.id, id))

    revalidatePath('/dashboard/recorrentes')
    return { success: true }
  } catch {
    return { error: 'Erro ao atualizar' }
  }
}

export async function deleteRecurringTransaction(id: string) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  try {
    const existing = await db.query.recurringTransactions.findFirst({
      where: and(
        eq(recurringTransactions.id, id),
        eq(recurringTransactions.userId, session.user.id)
      ),
    })
    if (!existing) return { error: 'Recorrência não encontrada' }

    await db.delete(recurringTransactions).where(eq(recurringTransactions.id, id))
    revalidatePath('/dashboard/recorrentes')
    return { success: true }
  } catch {
    return { error: 'Erro ao excluir' }
  }
}

export async function getRecurringTransactions() {
  const session = await auth()
  if (!session?.user?.id) return []

  return db.query.recurringTransactions.findMany({
    where: eq(recurringTransactions.userId, session.user.id),
    with: { account: true, category: true },
    orderBy: (r, { asc }) => [asc(r.nextDueDate)],
  })
}
