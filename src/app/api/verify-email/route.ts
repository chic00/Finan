import { NextResponse } from 'next/server'
import { db, emailVerifications, users } from '@/lib/db'
import { eq } from 'drizzle-orm'

const BASE_URL = process.env.NEXTAUTH_URL || 'https://fyneo.vercel.app'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.redirect(`${BASE_URL}/verify-email?error=missing_token`)
    }

    const verification = await db.query.emailVerifications.findFirst({
      where: eq(emailVerifications.token, token),
      with: { user: true },
    })

    if (!verification) {
      return NextResponse.redirect(`${BASE_URL}/verify-email?error=invalid_token`)
    }

    if (verification.usedAt) {
      return NextResponse.redirect(`${BASE_URL}/login?verified=already`)
    }

    if (new Date() > verification.expiresAt) {
      return NextResponse.redirect(`${BASE_URL}/verify-email?error=expired_token`)
    }

    // Marca token como usado e ativa o usuário
    await db.update(emailVerifications)
      .set({ usedAt: new Date() })
      .where(eq(emailVerifications.id, verification.id))

    await db.update(users)
      .set({ emailVerified: new Date(), updatedAt: new Date() })
      .where(eq(users.id, verification.userId))

    return NextResponse.redirect(`${BASE_URL}/login?verified=true`)
  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.redirect(`${BASE_URL}/verify-email?error=server_error`)
  }
}
