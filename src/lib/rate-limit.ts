type RateLimitContext = {
  count: number
  lastReset: number
}

const memoryStore = new Map<string, RateLimitContext>()

/**
 * Utilitário simples de Rate Limiting em memória para Next.js
 * Nota: Em ambientes serverless (Vercel), a memória é limpa quando a função "esfria",
 * mas ainda serve como uma primeira linha de defesa eficaz contra abusos rápidos.
 */
export async function rateLimit(identifier: string, limit: number, windowMs: number) {
  const now = Date.now()
  const context = memoryStore.get(identifier) || { count: 0, lastReset: now }

  if (now - context.lastReset > windowMs) {
    context.count = 1
    context.lastReset = now
  } else {
    context.count++
  }

  memoryStore.set(identifier, context)

  return {
    success: context.count <= limit,
    remaining: Math.max(0, limit - context.count),
    limit
  }
}
