// src/app/api/resend-verification/route.ts
import { NextResponse } from 'next/server'
import { db, users, emailVerifications } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { sendVerificationEmail } from '@/lib/email'
import { randomUUID } from 'crypto'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 })
    }

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    })

    // Segurança: não revelar se o email existe ou não
    if (!user) {
      return NextResponse.json({ success: true })
    }

    // Já verificado
    if (user.emailVerified) {
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

    const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
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
