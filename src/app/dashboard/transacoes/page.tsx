import { getTransactions } from '@/actions/transactions'
import { getAccounts } from '@/actions/accounts'
import { getCategories } from '@/actions/categories'
import { TransactionsClient } from '@/components/transactions/TransactionsClient'

interface Props {
  searchParams: Promise<{ month?: string; year?: string }>
}

export default async function TransacoesPage({ searchParams }: Props) {
  const params = await searchParams
  const now = new Date()
  const month = params.month !== undefined ? parseInt(params.month) : now.getMonth()
  const year = params.year !== undefined ? parseInt(params.year) : now.getFullYear()

  const [transactions, accounts, categories] = await Promise.all([
    getTransactions({ month, year }),
    getAccounts(),
    getCategories(),
  ])

  return (
    <TransactionsClient
      transactions={transactions as any}
      accounts={accounts}
      categories={categories}
      currentMonth={month}
      currentYear={year}
    />
  )
}
