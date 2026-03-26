'use server'

import { auth } from '@/lib/auth'
import { db, transactions, bankAccounts } from '@/lib/db'
import { eq, and, gte, lte, desc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { transactionSchema } from '@/lib/validations'
import { redirect } from 'next/navigation'

// ─── Helper: aplica impacto de uma transação no saldo ──────────────
async function applyBalanceImpact(
  type: string,
  accountId: string,
  toAccountId: string | undefined | null,
  amount: number,
  reverse = false
) {
  const multiplier = reverse ? -1 : 1

  if (type === 'income') {
    const account = await db.query.bankAccounts.findFirst({ where: eq(bankAccounts.id, accountId) })
    if (account) {
      await db.update(bankAccounts)
        .set({ balance: (parseFloat(account.balance as string) + multiplier * amount).toString() })
        .where(eq(bankAccounts.id, accountId))
    }
  } else if (type === 'expense') {
    const account = await db.query.bankAccounts.findFirst({ where: eq(bankAccounts.id, accountId) })
    if (account) {
      await db.update(bankAccounts)
        .set({ balance: (parseFloat(account.balance as string) - multiplier * amount).toString() })
        .where(eq(bankAccounts.id, accountId))
    }
  } else if (type === 'transfer' && toAccountId) {
    const sourceAccount = await db.query.bankAccounts.findFirst({ where: eq(bankAccounts.id, accountId) })
    const destAccount = await db.query.bankAccounts.findFirst({ where: eq(bankAccounts.id, toAccountId) })

    if (sourceAccount && destAccount) {
      await db.update(bankAccounts)
        .set({ balance: (parseFloat(sourceAccount.balance as string) - multiplier * amount).toString() })
        .where(eq(bankAccounts.id, accountId))

      await db.update(bankAccounts)
        .set({ balance: (parseFloat(destAccount.balance as string) + multiplier * amount).toString() })
        .where(eq(bankAccounts.id, toAccountId))
    }
  }
}

export async function createTransaction(formData: unknown) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const parsed = transactionSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  try {
    await applyBalanceImpact(
      parsed.data.type,
      parsed.data.accountId,
      parsed.data.toAccountId,
      parsed.data.amount
    )

    await db.insert(transactions).values({
      userId: session.user.id,
      accountId: parsed.data.accountId,
      toAccountId: parsed.data.toAccountId,
      categoryId: parsed.data.categoryId,
      type: parsed.data.type,
      amount: parsed.data.amount.toString(),
      description: parsed.data.description,
      date: parsed.data.date,
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

// FIX: updateTransaction agora reverte o saldo antigo antes de aplicar o novo
export async function updateTransaction(id: string, formData: unknown) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const parsed = transactionSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  try {
    // Busca transação atual para reverter o impacto no saldo
    const existing = await db.query.transactions.findFirst({
      where: and(eq(transactions.id, id), eq(transactions.userId, session.user.id)),
    })

    if (!existing) {
      return { error: 'Transação não encontrada' }
    }

    // 1. Reverte o impacto da transação antiga
    await applyBalanceImpact(
      existing.type,
      existing.accountId,
      existing.toAccountId,
      parseFloat(existing.amount as string),
      true // reverse = true
    )

    // 2. Aplica o impacto da transação nova
    await applyBalanceImpact(
      parsed.data.type,
      parsed.data.accountId,
      parsed.data.toAccountId,
      parsed.data.amount
    )

    // 3. Atualiza o registro
    await db.update(transactions)
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
      where: and(eq(transactions.id, id), eq(transactions.userId, session.user.id)),
    })

    if (!transaction) {
      return { error: 'Transação não encontrada' }
    }

    // Reverte o impacto no saldo
    await applyBalanceImpact(
      transaction.type,
      transaction.accountId,
      transaction.toAccountId,
      parseFloat(transaction.amount as string),
      true // reverse = true
    )

    await db.delete(transactions).where(eq(transactions.id, id))
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

  const conditions = [eq(transactions.userId, session.user.id)]

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
