import { auth } from '@/lib/auth'
import { getCategories } from '@/actions/categories'
import { CategoriesClient } from '@/components/categories/CategoriesClient'

export const metadata = { title: 'Categorias | Fyneo' }

export default async function CategoriasPage() {
  const categories = await getCategories()
  return <CategoriesClient categories={categories} />
}
