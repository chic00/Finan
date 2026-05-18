import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db, users, emailVerifications } from '@/lib/db'
import { initDefaultCategories } from '@/actions/categories'
import { sendVerificationEmail } from '@/lib/email'
import { randomUUID } from 'crypto'
import { registerServerSchema } from '@/lib/validations'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'anonymous'
    const rl = await rateLimit(`register_${ip}`, 5, 60 * 60 * 1000)

    if (!rl.success) {
      return NextResponse.json(
        { error: 'Muitas tentativas de registro. Tente novamente mais tarde.' },
        { status: 429 }
      )
    }

    const body = await req.json()

    const parsed = registerServerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name, email, password } = parsed.data

    const existing = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, email),
    })

    if (existing) {
      if (!existing.emailVerified) {
        await resendVerification(existing.id, existing.email, existing.name || 'Usuário')
        return NextResponse.json(
          { error: 'Este email já está cadastrado mas não foi verificado. Reenviamos o link de confirmação.' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: 'Email já cadastrado' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    // neon-http não suporta transações — operações sequenciais
    const [user] = await db.insert(users).values({
      name,
      email,
      password: hashedPassword,
    }).returning()

    await initDefaultCategories(user.id)

    const token     = randomUUID()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await db.insert(emailVerifications).values({
      userId: user.id,
      token,
      expiresAt,
    })

    const appUrl          = process.env.NEXTAUTH_URL || 'https://fyneo.vercel.app'
    const verificationUrl = `${appUrl}/verify-email?token=${token}`

    await sendVerificationEmail(email, {
      userName: name,
      verificationUrl,
    })

    return NextResponse.json(
      { success: true, message: 'Conta criada! Verifique seu email para ativar.' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

async function resendVerification(userId: string, email: string, name: string) {
  try {
    const token     = randomUUID()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await db.insert(emailVerifications).values({ userId, token, expiresAt })

    const appUrl = process.env.NEXTAUTH_URL || 'https://fyneo.vercel.app'
    await sendVerificationEmail(email, {
      userName:        name,
      verificationUrl: `${appUrl}/verify-email?token=${token}`,
    })
  } catch (err) {
    console.error('Resend verification error:', err)
  }
}
