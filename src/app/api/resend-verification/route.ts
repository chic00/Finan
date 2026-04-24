import { NextResponse } from 'next/server'
import { db, users, emailVerifications } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { sendVerificationEmail } from '@/lib/email'
import { randomUUID } from 'crypto'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: Request) {
  try {
    // SEGURANÇA: Rate Limiting para evitar abuso de envio de emails (máx 3 por hora por IP)
    const ip = req.headers.get('x-forwarded-for') || 'anonymous'
    const rl = await rateLimit(`resend_${ip}`, 3, 60 * 60 * 1000)
    
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Muitas solicitações de email. Tente novamente mais tarde.' },
        { status: 429 }
      )
    }

    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 })
    }

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    })

    // Segurança: não revelar se o email existe ou não para evitar enumeração
    if (!user || user.emailVerified) {
      return NextResponse.json({ success: true })
    }

    // Gera novo token
    const token = randomUUID()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await db.insert(emailVerifications).values({
      userId: user.id,
      token,
      expiresAt,
    })

    const appUrl = process.env.NEXTAUTH_URL || 'https://fyneo.vercel.app'
    // PADRONIZAÇÃO: URL consistente
    await sendVerificationEmail(email, {
      userName: user.name || 'Usuário',
      verificationUrl: `${appUrl}/verify-email?token=${token}`,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Resend verification error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
