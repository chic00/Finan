import { auth } from '@/lib/auth'
import { getGoals } from '@/actions/goals'
import { GoalsClient } from '@/components/metas/GoalsClient'

export default async function MetasPage() {
  const goals = await getGoals()
  return <GoalsClient goals={goals} />
}
