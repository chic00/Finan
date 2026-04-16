'use server'

import { auth } from '@/lib/auth'
import { db, transactions, bankAccounts } from '@/lib/db'
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { transactionSchema } from '@/lib/validations'
import { redirect } from 'next/navigation'

// ─── Helper: atualiza saldo de forma atômica (sem race condition) ──
// Usa SQL direto para fazer balance = balance +/- amount em uma única operação
async function adjustBalance(accountId: string, delta: number) {
  await db
    .update(bankAccounts)
    .set({
      balance: sql`${bankAccounts.balance} + ${delta.toString()}`,
      updatedAt: new Date(),
    })
    .where(eq(bankAccounts.id, accountId))
}

// ─── Helper: calcula o delta de saldo para cada tipo de transação ──
function getBalanceDeltas(
  type: string,
  accountId: string,
  toAccountId: string | undefined | null,
  amount: number,
  reverse = false
): Array<{ accountId: string; delta: number }> {
  const sign = reverse ? -1 : 1
  const deltas: Array<{ accountId: string; delta: number }> = []

  if (type === 'income') {
    deltas.push({ accountId, delta: sign * amount })
  } else if (type === 'expense') {
    deltas.push({ accountId, delta: -sign * amount })
  } else if (type === 'transfer' && toAccountId) {
    deltas.push({ accountId, delta: -sign * amount })
    deltas.push({ accountId: toAccountId, delta: sign * amount })
  }

  return deltas
}

export async function createTransaction(formData: unknown) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const parsed = transactionSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  try {
    const deltas = getBalanceDeltas(
      parsed.data.type,
      parsed.data.accountId,
      parsed.data.toAccountId,
      parsed.data.amount
    )

    // Aplica todos os deltas e insere a transação atomicamente
    await db.transaction(async (tx) => {
      for (const { accountId, delta } of deltas) {
        await tx
          .update(bankAccounts)
          .set({
            balance: sql`${bankAccounts.balance} + ${delta.toString()}`,
            updatedAt: new Date(),
          })
          .where(eq(bankAccounts.id, accountId))
      }

      await tx.insert(transactions).values({
        userId: session.user!.id!,
        accountId: parsed.data.accountId,
        toAccountId: parsed.data.toAccountId,
        categoryId: parsed.data.categoryId,
        type: parsed.data.type,
        amount: parsed.data.amount.toString(),
        description: parsed.data.description,
        date: parsed.data.date,
      })
    })

    revalidatePath('/dashboard/transacoes')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/contas')
    return { success: true }
  } catch (error) {
    console.error('Error creating transaction:', error)
    return { error: 'Erro ao criar transação' }
  }
}

// FIX: reverte saldo antigo e aplica novo de forma atômica
export async function updateTransaction(id: string, formData: unknown) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const parsed = transactionSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  try {
    const existing = await db.query.transactions.findFirst({
      where: and(
        eq(transactions.id, id),
        eq(transactions.userId, session.user!.id)
      ),
    })

    if (!existing) {
      return { error: 'Transação não encontrada' }
    }

    // Calcula deltas: reverter antiga + aplicar nova
    const reverseDeltas = getBalanceDeltas(
      existing.type,
      existing.accountId,
      existing.toAccountId,
      parseFloat(existing.amount as string),
      true // reverse
    )
    const newDeltas = getBalanceDeltas(
      parsed.data.type,
      parsed.data.accountId,
      parsed.data.toAccountId,
      parsed.data.amount
    )

    await db.transaction(async (tx) => {
      // 1. Reverte impacto da transação antiga
      for (const { accountId, delta } of reverseDeltas) {
        await tx
          .update(bankAccounts)
          .set({
            balance: sql`${bankAccounts.balance} + ${delta.toString()}`,
            updatedAt: new Date(),
          })
          .where(eq(bankAccounts.id, accountId))
      }

      // 2. Aplica impacto da nova transação
      for (const { accountId, delta } of newDeltas) {
        await tx
          .update(bankAccounts)
          .set({
            balance: sql`${bankAccounts.balance} + ${delta.toString()}`,
            updatedAt: new Date(),
          })
          .where(eq(bankAccounts.id, accountId))
      }

      // 3. Atualiza o registro
      await tx
        .update(transactions)
        .set({
          accountId: parsed.data.accountId,
          toAccountId: parsed.data.toAccountId,
          categoryId: parsed.data.categoryId,
          type: parsed.data.type,
          amount: parsed.data.amount.toString(),
          description: parsed.data.description,
          date: parsed.data.date,
          updatedAt: new Date(),
        })
        .where(eq(transactions.id, id))
    })

    revalidatePath('/dashboard/transacoes')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/contas')
    return { success: true }
  } catch (error) {
    console.error('Error updating transaction:', error)
    return { error: 'Erro ao atualizar transação' }
  }
}

export async function deleteTransaction(id: string) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  try {
    const transaction = await db.query.transactions.findFirst({
      where: and(
        eq(transactions.id, id),
        eq(transactions.userId, session.user!.id)
      ),
    })

    if (!transaction) {
      return { error: 'Transação não encontrada' }
    }

    const reverseDeltas = getBalanceDeltas(
      transaction.type,
      transaction.accountId,
      transaction.toAccountId,
      parseFloat(transaction.amount as string),
      true // reverse
    )

    await db.transaction(async (tx) => {
      for (const { accountId, delta } of reverseDeltas) {
        await tx
          .update(bankAccounts)
          .set({
            balance: sql`${bankAccounts.balance} + ${delta.toString()}`,
            updatedAt: new Date(),
          })
          .where(eq(bankAccounts.id, accountId))
      }

      await tx.delete(transactions).where(eq(transactions.id, id))
    })

    revalidatePath('/dashboard/transacoes')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/contas')
    return { success: true }
  } catch (error) {
    console.error('Error deleting transaction:', error)
    return { error: 'Erro ao excluir transação' }
  }
}

export async function getTransactions(filters?: {
  month?: number
  year?: number
  accountId?: string
  type?: string
}) {
  const session = await auth()
  if (!session?.user?.id) return []

  const conditions = [eq(transactions.userId, session.user!.id)]

  if (filters?.month !== undefined && filters?.year !== undefined) {
    const start = new Date(filters.year, filters.month, 1)
    const end = new Date(filters.year, filters.month + 1, 0, 23, 59, 59)
    conditions.push(gte(transactions.date, start))
    conditions.push(lte(transactions.date, end))
  }

  if (filters?.accountId) {
    conditions.push(eq(transactions.accountId, filters.accountId))
  }

  return db.query.transactions.findMany({
    where: and(...conditions),
    with: { category: true, account: true, toAccount: true },
    orderBy: [desc(transactions.date)],
  })
}
