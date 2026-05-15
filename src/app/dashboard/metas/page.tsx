import { getGoals } from '@/actions/goals'
import { getAccounts } from '@/actions/accounts'
import { GoalsClient } from '@/components/metas/GoalsClient'

export const metadata = { title: 'Metas | Fyneo' }

export default async function MetasPage() {
  const [goals, accounts] = await Promise.all([
    getGoals(),
    getAccounts(),
  ])

  return <GoalsClient goals={goals} accounts={accounts} />
}
