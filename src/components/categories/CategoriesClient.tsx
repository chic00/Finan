'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCategory, updateCategory, deleteCategory } from '@/actions/categories'
import { Plus, Trash2, Pencil, Loader2, Tag } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import type { Category } from '@/lib/db/schema'

interface CategoriesClientProps {
  categories: Category[]
}

const categoryColors = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#22C55E',
  '#14B8A6', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6',
  '#EC4899', '#F43F5E', '#64748B', '#78716C',
]

type FormState = {
  name: string
  type: 'income' | 'expense' | 'transfer'
  color: string
}

const defaultForm: FormState = { name: '', type: 'expense', color: '#6B7280' }

export function CategoriesClient({ categories }: CategoriesClientProps) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<FormState>(defaultForm)

  const groupedCategories = {
    income:   categories.filter((c) => c.type === 'income'),
    expense:  categories.filter((c) => c.type === 'expense'),
    transfer: categories.filter((c) => c.type === 'transfer'),
  }

  const handleOpenCreate = () => {
    setEditingCategory(null)
    setForm(defaultForm)
    setError('')
    setShowModal(true)
  }

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat)
    setForm({
      name: cat.name,
      type: cat.type as FormState['type'],
      color: cat.color || '#6B7280',
    })
    setError('')
    setShowModal(true)
  }

  const handleClose = () => {
    setShowModal(false)
    setEditingCategory(null)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = editingCategory
      ? await updateCategory(editingCategory.id, form)
      : await createCategory(form)

    setLoading(false)
    if (result?.error) { setError(result.error); return }

    setShowModal(false)
    setEditingCategory(null)
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return
    const result = await deleteCategory(id)
    if (result?.error) { alert(result.error); return }
    router.refresh()
  }

  const typeLabel: Record<string, string> = {
    income:   'Receitas',
    expense:  'Despesas',
    transfer: 'Transferências',
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categorias</h1>
          <p className="text-gray-500">Organize suas transações por categoria</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition"
        >
          <Plus size={18} /> Nova Categoria
        </button>
      </div>

      {(Object.entries(groupedCategories) as [string, Category[]][]).map(([type, cats]) => (
        <div key={type}>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">{typeLabel[type]}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {cats.map((cat) => (
              <div key={cat.id}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: cat.color || '#6B7280' }}
                    >
                      <Tag className="text-white" size={16} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{cat.name}</p>
                      {cat.isSystem && (
                        <span className="text-xs text-gray-400">Sistema</span>
                      )}
                    </div>
                  </div>

                  {/* Categorias de sistema: sem ações. Categorias do usuário: editar + excluir */}
                  {!cat.isSystem && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(cat)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Editar"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Excluir"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {categories.length === 0 && (
        <div className="text-center py-12">
          <Tag className="mx-auto text-gray-300" size={48} />
          <p className="mt-4 text-gray-500">Nenhuma categoria encontrada</p>
        </div>
      )}

      {showModal && (
        <Modal
          title={editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
          onClose={handleClose}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ex: Alimentação"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as FormState['type'] })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="expense">Despesa</option>
                <option value="income">Receita</option>
                <option value="transfer">Transferência</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cor</label>
              <div className="flex flex-wrap gap-2">
                {categoryColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm({ ...form, color })}
                    className={`w-8 h-8 rounded-lg transition ${
                      form.color === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={handleClose}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {loading && <Loader2 className="animate-spin" size={18} />}
                {editingCategory ? 'Salvar alterações' : 'Criar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
