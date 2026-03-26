import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db, users } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Senha deve ter no mínimo 6 caracteres' }, { status: 400 })
    }

    const existing = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, email),
    })

    if (existing) {
      return NextResponse.json({ error: 'Email já cadastrado' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const [user] = await db.insert(users).values({
      name,
      email,
      password: hashedPassword,
    }).returning()

    return NextResponse.json({ success: true, userId: user.id }, { status: 201 })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
