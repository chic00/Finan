'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Tags,
  PiggyBank,
  Target,
  BarChart3,
  LogOut,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  user?: { name?: string | null; email?: string | null }
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/contas', label: 'Contas', icon: Wallet },
  { href: '/dashboard/transacoes', label: 'Transações', icon: ArrowLeftRight },
  { href: '/dashboard/categorias', label: 'Categorias', icon: Tags },
  { href: '/dashboard/orcamentos', label: 'Orçamentos', icon: PiggyBank },
  { href: '/dashboard/metas', label: 'Metas', icon: Target },
  { href: '/dashboard/relatorios', label: 'Relatórios', icon: BarChart3 },
]

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <TrendingUp className="text-white" size={18} />
          </div>
          <span className="text-xl font-bold text-gray-900">Finan</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
            {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.name || 'Usuário'}
            </p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors w-full"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </aside>
  )
}
