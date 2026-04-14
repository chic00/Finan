'use server'

import { auth } from '@/lib/auth'
import { db, categories } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { categorySchema } from '@/lib/validations'
import { redirect } from 'next/navigation'

const defaultCategories = [
  { name: 'Salário', type: 'income', color: '#22C55E', icon: 'briefcase', isSystem: true },
  { name: 'Freelance', type: 'income', color: '#16A34A', icon: 'laptop', isSystem: true },
  { name: 'Investimentos', type: 'income', color: '#15803D', icon: 'trending-up', isSystem: true },
  { name: 'Outros Receitas', type: 'income', color: '#166534', icon: 'plus-circle', isSystem: true },
  { name: 'Alimentação', type: 'expense', color: '#EF4444', icon: 'utensils', isSystem: true },
  { name: 'Transporte', type: 'expense', color: '#F97316', icon: 'car', isSystem: true },
  { name: 'Moradia', type: 'expense', color: '#F59E0B', icon: 'home', isSystem: true },
  { name: 'Saúde', type: 'expense', color: '#EC4899', icon: 'heart', isSystem: true },
  { name: 'Educação', type: 'expense', color: '#8B5CF6', icon: 'book', isSystem: true },
  { name: 'Lazer', type: 'expense', color: '#06B6D4', icon: 'gamepad-2', isSystem: true },
  { name: 'Compras', type: 'expense', color: '#6366F1', icon: 'shopping-bag', isSystem: true },
  { name: 'Serviços', type: 'expense', color: '#64748B', icon: 'wrench', isSystem: true },
  { name: 'Transferência', type: 'transfer', color: '#3B82F6', icon: 'arrow-left-right', isSystem: true },
]

export async function createCategory(formData: unknown) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const parsed = categorySchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  try {
    await db.insert(categories).values({
      userId: session.user.id,
      name: parsed.data.name,
      type: parsed.data.type,
      color: parsed.data.color,
      icon: parsed.data.icon,
    })
    revalidatePath('/dashboard/categorias')
    return { success: true }
  } catch (error) {
    console.error('Error creating category:', error)
    return { error: 'Erro ao criar categoria' }
  }
}

// ✅ NOVA ACTION: editar categoria
export async function updateCategory(id: string, formData: unknown) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const parsed = categorySchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  try {
    const existing = await db.query.categories.findFirst({
      where: and(eq(categories.id, id), eq(categories.userId, session.user.id)),
    })

    if (!existing) return { error: 'Categoria não encontrada' }
    if (existing.isSystem) return { error: 'Não é possível editar categorias do sistema' }

    await db.update(categories)
      .set({
        name: parsed.data.name,
        type: parsed.data.type,
        color: parsed.data.color,
        icon: parsed.data.icon,
      })
      .where(eq(categories.id, id))

    revalidatePath('/dashboard/categorias')
    return { success: true }
  } catch (error) {
    console.error('Error updating category:', error)
    return { error: 'Erro ao atualizar categoria' }
  }
}

export async function deleteCategory(id: string) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  try {
    const category = await db.query.categories.findFirst({
      where: and(eq(categories.id, id), eq(categories.userId, session.user.id)),
    })

    if (!category) return { error: 'Categoria não encontrada' }
    if (category.isSystem) return { error: 'Não é possível excluir categorias do sistema' }

    await db.delete(categories).where(eq(categories.id, id))
    revalidatePath('/dashboard/categorias')
    return { success: true }
  } catch (error) {
    console.error('Error deleting category:', error)
    return { error: 'Erro ao excluir categoria' }
  }
}

export async function getCategories() {
  const session = await auth()
  if (!session?.user?.id) return []

  const allCategories = await db.query.categories.findMany({
    orderBy: (c, { asc }) => [asc(c.name)],
  })

  return allCategories.filter(
    (c) => c.isSystem === true || c.userId === session.user!.id
  )
}

export async function initDefaultCategories(userId: string) {
  const existing = await db.query.categories.findFirst({
    where: and(eq(categories.userId, userId), eq(categories.isSystem, true)),
  })

  if (!existing) {
    await db.insert(categories).values(
      defaultCategories.map((cat) => ({ ...cat, userId }))
    )
  }
}
