import { auth } from '@/lib/auth'
import { getTransactions } from '@/actions/transactions'
import { getAccounts } from '@/actions/accounts'
import { getCategories } from '@/actions/categories'
import { TransactionsClient } from '@/components/transactions/TransactionsClient'

export default async function TransacoesPage() {
  const session = await auth()
  const [transactions, accounts, categories] = await Promise.all([
    getTransactions(),
    getAccounts(),
    getCategories(),
  ])

  return (
    <TransactionsClient
      transactions={transactions as any}
      accounts={accounts}
      categories={categories}
    />
  )
}
