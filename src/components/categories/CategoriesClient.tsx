'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCategory, updateCategory, deleteCategory } from '@/actions/categories'
import { Plus, Trash2, Pencil, Loader2, Tag } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { useToast } from '@/components/ui/Toast'
import type { Category } from '@/lib/db/schema'

interface CategoriesClientProps { categories: Category[] }

const categoryColors = [
  '#EF4444','#F97316','#F59E0B','#84CC16','#22C55E',
  '#14B8A6','#06B6D4','#3B82F6','#6366F1','#8B5CF6',
  '#EC4899','#F43F5E','#64748B','#78716C',
]

type FormState = { name: string; type: 'income' | 'expense' | 'transfer'; color: string }
const defaultForm: FormState = { name: '', type: 'expense', color: '#6B7280' }

export function CategoriesClient({ categories }: CategoriesClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [showModal, setShowModal]           = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState('')
  const [form, setForm]                     = useState<FormState>(defaultForm)
  const [deletingId, setDeletingId]         = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading]   = useState(false)

  const grouped = {
    income:   categories.filter(c => c.type === 'income'),
    expense:  categories.filter(c => c.type === 'expense'),
    transfer: categories.filter(c => c.type === 'transfer'),
  }

  const handleOpenCreate = () => {
    setEditingCategory(null); setForm(defaultForm); setError(''); setShowModal(true)
  }
  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat)
    setForm({ name: cat.name, type: cat.type as FormState['type'], color: cat.color || '#6B7280' })
    setError(''); setShowModal(true)
  }
  const handleClose = () => { setShowModal(false); setEditingCategory(null); setError('') }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('')
    const result = editingCategory
      ? await updateCategory(editingCategory.id, form)
      : await createCategory(form)
    setLoading(false)
    if (result?.error) { setError(result.error); return }
    setShowModal(false); setEditingCategory(null); router.refresh()
  }

  const handleDeleteConfirm = async () => {
    if (!deletingId) return
    setDeleteLoading(true)
    const result = await deleteCategory(deletingId)
    setDeleteLoading(false)
    setDeletingId(null)
    if (result?.error) { toast(result.error, 'error'); return }
    toast('Categoria excluída com sucesso')
    router.refresh()
  }

  const typeLabel: Record<string, string> = {
    income: 'Receitas', expense: 'Despesas', transfer: 'Transferências',
  }
  const typeAccentColor: Record<string, string> = {
    income: 'var(--color-success)',
    expense: 'var(--color-destructive)',
    transfer: 'var(--color-primary)',
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>Categorias</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted-foreground)' }}>Organize suas transações por categoria</p>
        </div>
        <button onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all glow-primary"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>
          <Plus size={18} /> Nova Categoria
        </button>
      </div>

      {(Object.entries(grouped) as [string, Category[]][]).map(([type, cats]) => (
        <div key={type}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 rounded-full" style={{ backgroundColor: typeAccentColor[type] }} />
            <h2 className="text-base font-semibold" style={{ color: 'var(--color-foreground)' }}>{typeLabel[type]}</h2>
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--color-secondary)', color: 'var(--color-muted-foreground)' }}>
              {cats.length}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {cats.map(cat => (
              <div key={cat.id} className="rounded-2xl p-4 transition-all hover:scale-[1.01]"
                style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: cat.color || '#6B7280' }}>
                      <Tag className="text-white" size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate" style={{ color: 'var(--color-foreground)' }}>{cat.name}</p>
                      {cat.isSystem && (
                        <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Sistema</span>
                      )}
                    </div>
                  </div>
                  {!cat.isSystem && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => handleOpenEdit(cat)} className="p-1.5 rounded-lg transition-all"
                        style={{ color: 'var(--color-muted-foreground)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-primary)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'color-mix(in srgb, var(--color-primary) 10%, transparent)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-muted-foreground)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}>
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setDeletingId(cat.id)} className="p-1.5 rounded-lg transition-all"
                        style={{ color: 'var(--color-muted-foreground)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-destructive)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'color-mix(in srgb, var(--color-destructive) 10%, transparent)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-muted-foreground)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}>
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
        <div className="text-center py-16 rounded-2xl"
          style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <Tag size={48} className="mx-auto mb-4" style={{ color: 'var(--color-muted-foreground)' }} />
          <p style={{ color: 'var(--color-muted-foreground)' }}>Nenhuma categoria encontrada</p>
        </div>
      )}

      {deletingId && (
        <ConfirmModal
          title="Excluir categoria"
          description="As transações vinculadas a esta categoria ficarão sem categoria. Esta ação não pode ser desfeita."
          confirmLabel="Excluir"
          variant="danger"
          loading={deleteLoading}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingId(null)}
        />
      )}

      {showModal && (
        <Modal title={editingCategory ? 'Editar Categoria' : 'Nova Categoria'} onClose={handleClose}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="px-4 py-3 rounded-xl text-sm"
                style={{ backgroundColor: 'color-mix(in srgb, var(--color-destructive) 10%, transparent)', color: 'var(--color-destructive)' }}>
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>Nome</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl outline-none transition-all theme-input"
                placeholder="Ex: Alimentação" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-foreground)' }}>Tipo</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as FormState['type'] })}
                className="w-full px-4 py-2.5 rounded-xl outline-none transition-all theme-select">
                <option value="expense">Despesa</option>
                <option value="income">Receita</option>
                <option value="transfer">Transferência</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-foreground)' }}>Cor</label>
              <div className="flex flex-wrap gap-2">
                {categoryColors.map(color => (
                  <button key={color} type="button" onClick={() => setForm({ ...form, color })}
                    className="w-8 h-8 rounded-xl transition-all"
                    style={{
                      backgroundColor: color,
                      outline: form.color === color ? '3px solid var(--color-primary)' : 'none',
                      outlineOffset: '2px',
                      transform: form.color === color ? 'scale(1.15)' : 'scale(1)',
                    }} />
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={handleClose}
                className="flex-1 px-4 py-2.5 rounded-xl font-medium transition-all"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}>
                Cancelar
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 py-2.5 rounded-xl font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2 glow-primary"
                style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>
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
