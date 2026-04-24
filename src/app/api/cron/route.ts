import { NextResponse } from 'next/server'
import { processNotifications } from '@/lib/notifications'

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  
  // Proteção Crítica: Se o segredo não estiver configurado ou o header não bater, bloqueia.
  // Em produção, CRON_SECRET deve ser obrigatório.
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('[CRON] Tentativa de acesso não autorizado ou CRON_SECRET não configurado.')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const stats = await processNotifications()
    console.log('[CRON] Notificações processadas com sucesso:', stats)
    return NextResponse.json({ 
      success: true, 
      timestamp: new Date().toISOString(), 
      stats 
    })
  } catch (error) {
    console.error('[CRON] Erro interno durante o processamento:', error)
    // Proteção: Não expõe o erro técnico (String(error)) para o cliente.
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  return GET(req)
}
