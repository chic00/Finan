'use server'

import { auth } from '@/lib/auth'
import { db, transactions, bankAccounts, categories } from '@/lib/db'
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { transactionSchema } from '@/lib/validations'
import { redirect } from 'next/navigation'

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

  const userId = session.user.id

  try {
    // SEGURANÇA: Valida se a conta principal pertence ao usuário
    const account = await db.query.bankAccounts.findFirst({
      where: and(eq(bankAccounts.id, parsed.data.accountId), eq(bankAccounts.userId, userId))
    })
    if (!account) return { error: 'Conta de origem inválida ou não encontrada' }

    // SEGURANÇA: Se for transferência, valida a conta de destino
    if (parsed.data.type === 'transfer' && parsed.data.toAccountId) {
      const toAccount = await db.query.bankAccounts.findFirst({
        where: and(eq(bankAccounts.id, parsed.data.toAccountId), eq(bankAccounts.userId, userId))
      })
      if (!toAccount) return { error: 'Conta de destino inválida ou não encontrada' }
    }

    // SEGURANÇA: Valida se a categoria pertence ao usuário ou é do sistema
    if (parsed.data.categoryId) {
      const category = await db.query.categories.findFirst({
        where: and(
          eq(categories.id, parsed.data.categoryId),
          sql`(${categories.userId} = ${userId} OR ${categories.isSystem} = true)`
        )
      })
      if (!category) return { error: 'Categoria inválida ou não encontrada' }
    }

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
        userId: userId,
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

export async function updateTransaction(id: string, formData: unknown) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const parsed = transactionSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const userId = session.user.id

  try {
    const existing = await db.query.transactions.findFirst({
      where: and(
        eq(transactions.id, id),
        eq(transactions.userId, userId)
      ),
    })

    if (!existing) {
      return { error: 'Transação não encontrada' }
    }

    // SEGURANÇA: Valida se as novas contas e categorias pertencem ao usuário
    const account = await db.query.bankAccounts.findFirst({
      where: and(eq(bankAccounts.id, parsed.data.accountId), eq(bankAccounts.userId, userId))
    })
    if (!account) return { error: 'Conta de origem inválida' }

    if (parsed.data.type === 'transfer' && parsed.data.toAccountId) {
      const toAccount = await db.query.bankAccounts.findFirst({
        where: and(eq(bankAccounts.id, parsed.data.toAccountId), eq(bankAccounts.userId, userId))
      })
      if (!toAccount) return { error: 'Conta de destino inválida' }
    }

    if (parsed.data.categoryId) {
      const category = await db.query.categories.findFirst({
        where: and(
          eq(categories.id, parsed.data.categoryId),
          sql`(${categories.userId} = ${userId} OR ${categories.isSystem} = true)`
        )
      })
      if (!category) return { error: 'Categoria inválida' }
    }

    const reverseDeltas = getBalanceDeltas(
      existing.type,
      existing.accountId,
      existing.toAccountId,
      parseFloat(existing.amount as string),
      true
    )
    const newDeltas = getBalanceDeltas(
      parsed.data.type,
      parsed.data.accountId,
      parsed.data.toAccountId,
      parsed.data.amount
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

      for (const { accountId, delta } of newDeltas) {
        await tx
          .update(bankAccounts)
          .set({
            balance: sql`${bankAccounts.balance} + ${delta.toString()}`,
            updatedAt: new Date(),
          })
          .where(eq(bankAccounts.id, accountId))
      }

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
      true
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
