// Utilitário puro — sem 'use server'

export function calculateNextDueDate(baseDate: Date, frequency: string): Date {
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const next = new Date(baseDate)
  next.setHours(12, 0, 0, 0)

  if (next >= now) return next

  while (next < now) {
    switch (frequency) {
      case 'daily':   next.setDate(next.getDate() + 1);         break
      case 'weekly':  next.setDate(next.getDate() + 7);         break
      case 'monthly': next.setMonth(next.getMonth() + 1);       break
      case 'yearly':  next.setFullYear(next.getFullYear() + 1); break
    }
  }

  return next
}
