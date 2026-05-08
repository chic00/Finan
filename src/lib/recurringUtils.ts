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

/**
 * Dado um nextDueDate e a data atual, verifica se o ciclo já mudou
 * e o isPaid deveria ser resetado para false.
 *
 * Regra: se nextDueDate está no mês atual (ou futuro) e isPaid = true,
 * mas paidAt foi em um ciclo ANTERIOR ao nextDueDate atual, então
 * o pagamento foi do ciclo anterior — deve resetar.
 */
export function shouldResetPaid(
  nextDueDate: Date,
  paidAt: Date | null,
  isPaid: boolean
): boolean {
  if (!isPaid || !paidAt) return false

  const due   = new Date(nextDueDate)
  const paid  = new Date(paidAt)

  // Se o paidAt é de um mês/ano diferente do nextDueDate atual,
  // significa que o pagamento foi do ciclo anterior — reset necessário
  const sameMonth = paid.getMonth() === due.getMonth() && paid.getFullYear() === due.getFullYear()
  // Para frequências não mensais, compara por data exata
  const sameOrAfter = paid >= due

  return !sameMonth && !sameOrAfter
}
