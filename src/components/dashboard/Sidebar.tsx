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
      <div className="p-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <Link href="/dashboard" className="flex items-center" onClick={onLinkClick}>
          <Image
            src="/logo.jpeg"
            alt="Fyneo"
            width={140}
            height={56}
            className="h-12 w-auto"
          />
        </Link>
      </div>

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
                isActive
                  ? 'nav-active'
                  : 'nav-inactive'
              )}
              style={isActive ? {
                backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                color: 'var(--color-primary)',
              } : {
                color: 'var(--color-muted-foreground)',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-secondary)'
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--color-foreground)'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--color-muted-foreground)'
                }
              }}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 space-y-2" style={{ borderTop: '1px solid var(--color-border)' }}>
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{ color: 'var(--color-muted-foreground)' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-secondary)'
            ;(e.currentTarget as HTMLElement).style.color = 'var(--color-foreground)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
            ;(e.currentTarget as HTMLElement).style.color = 'var(--color-muted-foreground)'
          }}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          {theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}
        </button>

        {/* User info */}
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl" style={{ backgroundColor: 'var(--color-secondary)' }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
            style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 20%, transparent)', color: 'var(--color-primary)' }}>
            {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--color-foreground)' }}>
              {user?.name || 'Usuario'}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--color-muted-foreground)' }}>{user?.email}</p>
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all w-full"
          style={{ color: 'var(--color-muted-foreground)' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'color-mix(in srgb, var(--color-destructive) 10%, transparent)'
            ;(e.currentTarget as HTMLElement).style.color = 'var(--color-destructive)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
            ;(e.currentTarget as HTMLElement).style.color = 'var(--color-muted-foreground)'
          }}
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
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 flex-col z-30"
        style={{ backgroundColor: 'var(--color-card)', borderRight: '1px solid var(--color-border)' }}>
        <NavContent user={user} />
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 flex items-center px-4 z-30"
        style={{ backgroundColor: 'var(--color-card)', borderBottom: '1px solid var(--color-border)' }}>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-xl transition-colors"
          style={{ color: 'var(--color-foreground)' }}
        >
          <Menu size={22} />
        </button>
        <Link href="/dashboard" className="flex items-center ml-3">
          <Image src="/logo.jpeg" alt="Fyneo" width={100} height={40} className="h-8 w-auto" />
        </Link>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 backdrop-blur-sm"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={cn(
        'lg:hidden fixed top-0 left-0 h-full w-72 flex flex-col z-50 transition-transform duration-300 ease-out',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )} style={{ backgroundColor: 'var(--color-card)', borderRight: '1px solid var(--color-border)' }}>
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-xl transition-colors"
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          <X size={20} />
        </button>
        <NavContent user={user} onLinkClick={() => setMobileOpen(false)} />
      </aside>
    </>
  )
}
