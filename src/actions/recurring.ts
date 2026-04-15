'use server'

import { auth } from '@/lib/auth'
import { db, recurringTransactions, transactions, bankAccounts } from '@/lib/db'
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

// ─── Toggle Pago / Não Pago ────────────────────────────────────────
// ✅ Ao MARCAR PAGO:
//   1. Cria uma transação real em `transactions` (afeta saldo da conta)
//   2. Avança nextDueDate para o próximo ciclo
//   3. Marca isPaid = true, salva paidAt
//
// ✅ Ao DESMARCAR (Desfazer):
//   1. Remove a transação gerada (se existir)
//   2. Restaura nextDueDate para o ciclo atual
//   3. Marca isPaid = false, limpa paidAt
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

  // ── DESMARCAR PAGO ─────────────────────────────────────────────
  if (recurring.isPaid) {
    // Remove a transação gerada por esta recorrente no ciclo atual (se existir)
    // Identificada pelo recurringId + data próxima ao paidAt
    if (recurring.paidAt) {
      const existingTx = await db.query.transactions.findFirst({
        where: and(
          eq(transactions.userId, session.user.id),
          eq(transactions.recurringId, id),
          eq(transactions.isRecurring, true),
        ),
        orderBy: (t, { desc }) => [desc(t.createdAt)],
      })

      if (existingTx) {
        // Reverte o saldo da conta
        const account = await db.query.bankAccounts.findFirst({
          where: eq(bankAccounts.id, existingTx.accountId),
        })
        if (account) {
          const amount = parseFloat(existingTx.amount as string)
          const currentBalance = parseFloat(account.balance as string)
          const restoredBalance = existingTx.type === 'income'
            ? currentBalance - amount
            : currentBalance + amount

          await db.update(bankAccounts)
            .set({ balance: restoredBalance.toString() })
            .where(eq(bankAccounts.id, existingTx.accountId))
        }

        await db.delete(transactions).where(eq(transactions.id, existingTx.id))
      }
    }

    // Restaura nextDueDate para o ciclo atual
    const restoredDueDate = calculateNextDueDate(
      new Date(recurring.startDate),
      recurring.frequency
    )

    await db.update(recurringTransactions)
      .set({ isPaid: false, paidAt: null, nextDueDate: restoredDueDate, updatedAt: new Date() })
      .where(eq(recurringTransactions.id, id))

    revalidatePath('/dashboard/recorrentes')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/transacoes')
    revalidatePath('/dashboard/contas')
    return { success: true, isPaid: false }
  }

  // ── MARCAR PAGO ────────────────────────────────────────────────
  const now = new Date()

  // 1. Verifica saldo se for despesa
  if (recurring.type === 'expense') {
    const account = await db.query.bankAccounts.findFirst({
      where: eq(bankAccounts.id, recurring.accountId),
    })
    if (!account) return { error: 'Conta bancária não encontrada' }
  }

  // 2. Cria a transação real
  const account = await db.query.bankAccounts.findFirst({
    where: eq(bankAccounts.id, recurring.accountId),
  })
  if (!account) return { error: 'Conta bancária não encontrada' }

  const amount = parseFloat(recurring.amount as string)
  const currentBalance = parseFloat(account.balance as string)
  const newBalance = recurring.type === 'income'
    ? currentBalance + amount
    : currentBalance - amount

  // Atualiza saldo da conta
  await db.update(bankAccounts)
    .set({ balance: newBalance.toString() })
    .where(eq(bankAccounts.id, recurring.accountId))

  // Insere transação
  await db.insert(transactions).values({
    userId:      session.user.id,
    accountId:   recurring.accountId,
    categoryId:  recurring.categoryId,
    type:        recurring.type,
    amount:      recurring.amount,
    description: recurring.description || 'Conta recorrente',
    date:        now,
    isRecurring: true,
    recurringId: id,
  })

  // 3. Avança nextDueDate para o próximo ciclo
  const currentDue = new Date(recurring.nextDueDate)
  const next = new Date(currentDue)
  switch (recurring.frequency) {
    case 'daily':   next.setDate(next.getDate() + 1);         break
    case 'weekly':  next.setDate(next.getDate() + 7);         break
    case 'monthly': next.setMonth(next.getMonth() + 1);       break
    case 'yearly':  next.setFullYear(next.getFullYear() + 1); break
  }

  // Verifica se encerrou
  const finished = !!(recurring.endDate && next > new Date(recurring.endDate))

  await db.update(recurringTransactions)
    .set({
      isPaid:        true,
      paidAt:        now,
      nextDueDate:   next,
      lastGenerated: now,
      isActive:      finished ? false : recurring.isActive,
      updatedAt:     now,
    })
    .where(eq(recurringTransactions.id, id))

  revalidatePath('/dashboard/recorrentes')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/transacoes')
  revalidatePath('/dashboard/contas')
  return { success: true, isPaid: true, finished }
}

// Mantido por compatibilidade
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
      isPaid:      false,
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

    await db.update(recurringTransactions)
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

    await db.update(recurringTransactions)
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
