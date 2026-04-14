import { getRecurringTransactions } from '@/actions/recurring'
import { getAccounts } from '@/actions/accounts'
import { getCategories } from '@/actions/categories'
import { RecorrentesClient } from '@/components/recorrentes/RecorrentesClient'

export default async function RecorrentesPage() {
  const [recorrentes, accounts, categories] = await Promise.all([
    getRecurringTransactions(),
    getAccounts(),
    getCategories(),
  ])

  return (
    <RecorrentesClient
      recorrentes={recorrentes as any}
      accounts={accounts}
      categories={categories}
    />
  )
}
