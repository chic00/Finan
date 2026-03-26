import { auth } from '@/lib/auth'
import { getAccounts } from '@/actions/accounts'
import { AccountsClient } from '@/components/accounts/AccountsClient'

export default async function ContasPage() {
  const session = await auth()
  const accounts = await getAccounts()

  return <AccountsClient accounts={accounts} />
}
