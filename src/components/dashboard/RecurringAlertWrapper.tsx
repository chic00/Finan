'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { togglePaid } from '@/actions/recurring'
import { RecurringAlert } from './RecurringAlert'
import { useToast } from '@/components/ui/Toast'

interface Props {
  items: any[]
}

export function RecurringAlertWrapper({ items }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const handleTogglePaid = async (id: string) => {
    setTogglingId(id)
    const result = await togglePaid(id)
    setTogglingId(null)
    if (result?.error) { toast(result.error, 'error'); return }
    router.refresh()
  }

  return (
    <RecurringAlert
      items={items}
      onTogglePaid={handleTogglePaid}
      togglingId={togglingId}
    />
  )
}