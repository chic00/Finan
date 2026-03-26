'use server'

import { auth } from '@/lib/auth'
import { db, transactions, bankAccounts } from '@/lib/db'
import { eq, and, gte, lte, desc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { transactionSchema } from '@/lib/validations'
import { redirect } from 'next/navigation'

export async function createTransaction(formData: unknown) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const parsed = transactionSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  try {
    // For transfers, update both accounts
    if (parsed.data.type === 'transfer' && parsed.data.toAccountId) {
      // Deduct from source
      const sourceAccount = await db.query.bankAccounts.findFirst({
        where: eq(bankAccounts.id, parsed.data.accountId),
      })
      // Add to destination
      const destAccount = await db.query.bankAccounts.findFirst({
        where: eq(bankAccounts.id, parsed.data.toAccountId),
      })

      if (sourceAccount && destAccount) {
        await db.update(bankAccounts)
          .set({ balance: (parseFloat(sourceAccount.balance as string) - parsed.data.amount).toString() })
          .where(eq(bankAccounts.id, parsed.data.accountId))

        await db.update(bankAccounts)
          .set({ balance: (parseFloat(destAccount.balance as string) + parsed.data.amount).toString() })
          .where(eq(bankAccounts.id, parsed.data.toAccountId))
      }
    } else if (parsed.data.type === 'expense') {
      // Deduct from account
      const account = await db.query.bankAccounts.findFirst({
        where: eq(bankAccounts.id, parsed.data.accountId),
      })
      if (account) {
        await db.update(bankAccounts)
          .set({ balance: (parseFloat(account.balance as string) - parsed.data.amount).toString() })
          .where(eq(bankAccounts.id, parsed.data.accountId))
      }
    } else if (parsed.data.type === 'income') {
      // Add to account
      const account = await db.query.bankAccounts.findFirst({
        where: eq(bankAccounts.id, parsed.data.accountId),
      })
      if (account) {
        await db.update(bankAccounts)
          .set({ balance: (parseFloat(account.balance as string) + parsed.data.amount).toString() })
          .where(eq(bankAccounts.id, parsed.data.accountId))
      }
    }

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

export async function updateTransaction(id: string, formData: unknown) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const parsed = transactionSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  try {
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
    // Get transaction to reverse balance
    const transaction = await db.query.transactions.findFirst({
      where: eq(transactions.id, id),
    })

    if (transaction) {
      const account = await db.query.bankAccounts.findFirst({
        where: eq(bankAccounts.id, transaction.accountId),
      })

      if (account) {
        if (transaction.type === 'income') {
          await db.update(bankAccounts)
            .set({ balance: (parseFloat(account.balance as string) - parseFloat(transaction.amount as string)).toString() })
            .where(eq(bankAccounts.id, transaction.accountId))
        } else if (transaction.type === 'expense') {
          await db.update(bankAccounts)
            .set({ balance: (parseFloat(account.balance as string) + parseFloat(transaction.amount as string)).toString() })
            .where(eq(bankAccounts.id, transaction.accountId))
        } else if (transaction.type === 'transfer' && transaction.toAccountId) {
          const toAccount = await db.query.bankAccounts.findFirst({
            where: eq(bankAccounts.id, transaction.toAccountId),
          })
          if (toAccount) {
            await db.update(bankAccounts)
              .set({ balance: (parseFloat(account.balance as string) + parseFloat(transaction.amount as string)).toString() })
              .where(eq(bankAccounts.id, transaction.accountId))
            await db.update(bankAccounts)
              .set({ balance: (parseFloat(toAccount.balance as string) - parseFloat(transaction.amount as string)).toString() })
              .where(eq(bankAccounts.id, transaction.toAccountId))
          }
        }
      }
    }

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

export async function getTransactions(filters?: { month?: number; year?: number; accountId?: string }) {
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
