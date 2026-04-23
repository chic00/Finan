// src/app/api/verify-email/route.ts
import { NextResponse } from 'next/server'
import { db, emailVerifications, users } from '@/lib/db'
import { eq, and, isNull } from 'drizzle-orm'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.redirect(
        new URL('/verify-email?error=missing_token', req.url)
      )
    }

    // Busca o token válido (não usado, não expirado)
    const verification = await db.query.emailVerifications.findFirst({
      where: eq(emailVerifications.token, token),
      with: { user: true },
    })

    if (!verification) {
      return NextResponse.redirect(
        new URL('/verify-email?error=invalid_token', req.url)
      )
    }

    if (verification.usedAt) {
      // Token já usado — redireciona para login com mensagem
      return NextResponse.redirect(
        new URL('/login?verified=already', req.url)
      )
    }

    if (new Date() > verification.expiresAt) {
      return NextResponse.redirect(
        new URL('/verify-email?error=expired_token', req.url)
      )
    }

    // Marca token como usado
    await db.update(emailVerifications)
      .set({ usedAt: new Date() })
      .where(eq(emailVerifications.id, verification.id))

    // Ativa o usuário
    await db.update(users)
      .set({ emailVerified: new Date(), updatedAt: new Date() })
      .where(eq(users.id, verification.userId))

    return NextResponse.redirect(
      new URL('/login?verified=true', req.url)
    )
  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.redirect(
      new URL('/verify-email?error=server_error', req.url)
    )
  }
}
