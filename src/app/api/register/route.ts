// src/app/api/register/route.ts
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db, users, emailVerifications } from '@/lib/db'
import { initDefaultCategories } from '@/actions/categories'
import { sendVerificationEmail } from '@/lib/email'
import { randomUUID } from 'crypto'

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Senha deve ter no mínimo 6 caracteres' },
        { status: 400 }
      )
    }

    // Verifica se email já existe
    const existing = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, email),
    })

    if (existing) {
      // Se já existe mas não verificou, reenvia o email
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

    // Cria o usuário (emailVerified = null até confirmar)
    const [user] = await db.insert(users).values({
      name,
      email,
      password: hashedPassword,
      // emailVerified permanece null até o usuário clicar no link
    }).returning()

    // Inicializa categorias padrão
    await initDefaultCategories(user.id)

    // Gera token de verificação
    const token = randomUUID()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas

    await db.insert(emailVerifications).values({
      userId: user.id,
      token,
      expiresAt,
    })

    // Envia email de verificação
    const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
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

// Helper: reenvia verificação para usuário já cadastrado
async function resendVerification(userId: string, email: string, name: string) {
  try {
    const token = randomUUID()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await db.insert(emailVerifications).values({ userId, token, expiresAt })

    const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    await sendVerificationEmail(email, {
      userName: name,
      verificationUrl: `${appUrl}/verify-email?token=${token}`,
    })
  } catch (err) {
    console.error('Resend verification error:', err)
  }
}
