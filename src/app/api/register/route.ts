import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db, users, emailVerifications } from '@/lib/db'
import { initDefaultCategories } from '@/actions/categories'
import { sendVerificationEmail } from '@/lib/email'
import { randomUUID } from 'crypto'
import { registerSchema } from '@/lib/validations'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    // SEGURANÇA: Validação robusta usando o schema central (Zod)
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name, email, password } = parsed.data

    // SEGURANÇA: Previne que usuários injetem dados extras
    const userData = { name, email, password }

    // Verifica se email já existe
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

    // SEGURANÇA: Garantindo atomicidade com transação de banco de dados
    const result = await db.transaction(async (tx) => {
      // 1. Cria o usuário
      const [user] = await tx.insert(users).values({
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
      }).returning()

      // 2. Inicializa categorias padrão
      await initDefaultCategories(user.id)

      // 3. Gera token de verificação
      const token = randomUUID()
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

      await tx.insert(emailVerifications).values({
        userId: user.id,
        token,
        expiresAt,
      })

      return { user, token }
    })

    // Envia email de verificação
    const appUrl = process.env.NEXTAUTH_URL || 'https://fyneo.vercel.app'
    // PADRONIZAÇÃO: URL consistente com o helper e a rota de verificação
    const verificationUrl = `${appUrl}/verify-email?token=${result.token}`

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
    const token = randomUUID()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await db.insert(emailVerifications).values({ userId, token, expiresAt })

    const appUrl = process.env.NEXTAUTH_URL || 'https://fyneo.vercel.app'
    // PADRONIZAÇÃO: URL consistente
    await sendVerificationEmail(email, {
      userName: name,
      verificationUrl: `${appUrl}/verify-email?token=${token}`,
    })
  } catch (err) {
    console.error('Resend verification error:', err)
  }
}
