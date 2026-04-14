'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard, Wallet, ArrowLeftRight, Tags,
  PiggyBank, Target, BarChart3, LogOut, TrendingUp,
  Menu, X, RefreshCw, Bell,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  user?: { name?: string | null; email?: string | null }
}

const navItems = [
  { href: '/dashboard',               label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/dashboard/contas',        label: 'Contas',       icon: Wallet },
  { href: '/dashboard/transacoes',    label: 'Transações',   icon: ArrowLeftRight },
  { href: '/dashboard/recorrentes',   label: 'Recorrentes',  icon: RefreshCw },
  { href: '/dashboard/categorias',    label: 'Categorias',   icon: Tags },
  { href: '/dashboard/orcamentos',    label: 'Orçamentos',   icon: PiggyBank },
  { href: '/dashboard/metas',         label: 'Metas',        icon: Target },
  { href: '/dashboard/relatorios',    label: 'Relatórios',   icon: BarChart3 },
  { href: '/dashboard/configuracoes', label: 'Notificações', icon: Bell },
]

function NavContent({
  user,
  onLinkClick,
}: {
  user?: SidebarProps['user']
  onLinkClick?: () => void
}) {
  const pathname = usePathname()

  return (
    <>
      <div className="p-6 border-b border-gray-100">
        <Link href="/dashboard" className="flex items-center gap-2" onClick={onLinkClick}>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <TrendingUp className="text-white" size={18} />
          </div>
          <span className="text-xl font-bold text-gray-900">Finan</span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onLinkClick}
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

      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-700 flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase() ||
              user?.email?.charAt(0).toUpperCase() || 'U'}
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
    </>
  )
}

export function Sidebar({ user }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex-col z-30">
        <NavContent user={user} />
      </aside>

      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center px-4 z-30">
        <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-gray-100 transition">
          <Menu size={22} className="text-gray-700" />
        </button>
        <Link href="/dashboard" className="flex items-center gap-2 ml-3">
          <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
            <TrendingUp className="text-white" size={15} />
          </div>
          <span className="text-lg font-bold text-gray-900">Finan</span>
        </Link>
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={cn(
        'lg:hidden fixed top-0 left-0 h-full w-72 bg-white border-r border-gray-200 flex flex-col z-50 transition-transform duration-200',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 transition"
        >
          <X size={20} className="text-gray-600" />
        </button>
        <NavContent user={user} onLinkClick={() => setMobileOpen(false)} />
      </aside>
    </>
  )
}
