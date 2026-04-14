import { NextResponse } from 'next/server'
import { processNotifications } from '@/lib/notifications'

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const stats = await processNotifications()
    console.log('[CRON] Notificações processadas:', stats)
    return NextResponse.json({ success: true, timestamp: new Date().toISOString(), stats })
  } catch (error) {
    console.error('[CRON] Erro:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  return GET(req)
}
