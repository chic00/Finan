'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import Image from 'next/image'
import {
  LayoutDashboard, Wallet, ArrowLeftRight, Tags,
  PiggyBank, Target, BarChart3, LogOut,
  Menu, X, RefreshCw, Bell, Sun, Moon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/components/ui/ThemeProvider'

interface SidebarProps {
  user?: { name?: string | null; email?: string | null }
}

const navItems = [
  { href: '/dashboard',               label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/dashboard/contas',        label: 'Contas',       icon: Wallet },
  { href: '/dashboard/transacoes',    label: 'Transacoes',   icon: ArrowLeftRight },
  { href: '/dashboard/recorrentes',   label: 'Recorrentes',  icon: RefreshCw },
  { href: '/dashboard/categorias',    label: 'Categorias',   icon: Tags },
  { href: '/dashboard/orcamentos',    label: 'Orcamentos',   icon: PiggyBank },
  { href: '/dashboard/metas',         label: 'Metas',        icon: Target },
  { href: '/dashboard/relatorios',    label: 'Relatorios',   icon: BarChart3 },
  { href: '/dashboard/configuracoes', label: 'Notificacoes', icon: Bell },
]

function NavContent({
  user,
  onLinkClick,
}: {
  user?: SidebarProps['user']
  onLinkClick?: () => void
}) {
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()

  return (
    <>
      {/* Logo */}
      <div className="p-5 sidebar-border-b">
        <Link href="/dashboard" className="flex items-center" onClick={onLinkClick}>
          <Image src="/logo.jpeg" alt="Fyneo" width={140} height={56} className="h-12 w-auto" />
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
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
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive ? 'nav-link-active' : 'nav-link-inactive'
              )}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 space-y-2 sidebar-border-t">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all nav-link-inactive"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          {theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}
        </button>

        {/* User card */}
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl sidebar-user-bg">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 sidebar-avatar">
            {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate sidebar-user-name">{user?.name || 'Usuario'}</p>
            <p className="text-xs truncate sidebar-user-email">{user?.email}</p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all w-full nav-link-danger"
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
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 flex-col z-30 sidebar-bg sidebar-border-r">
        <NavContent user={user} />
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 flex items-center px-4 z-30 sidebar-bg sidebar-border-b">
        <button onClick={() => setMobileOpen(true)} className="p-2 rounded-xl transition-colors nav-link-inactive">
          <Menu size={22} />
        </button>
        <Link href="/dashboard" className="flex items-center ml-3">
          <Image src="/logo.jpeg" alt="Fyneo" width={100} height={40} className="h-8 w-auto" />
        </Link>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 sidebar-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={cn(
        'lg:hidden fixed top-0 left-0 h-full w-72 flex flex-col z-50 transition-transform duration-300 ease-out sidebar-bg sidebar-border-r',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-xl transition-colors nav-link-inactive"
        >
          <X size={20} />
        </button>
        <NavContent user={user} onLinkClick={() => setMobileOpen(false)} />
      </aside>
    </>
  )
}
