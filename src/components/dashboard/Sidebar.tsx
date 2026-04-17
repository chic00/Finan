'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard, Wallet, ArrowLeftRight, Tags,
  PiggyBank, Target, BarChart3, LogOut,
  Menu, X, RefreshCw, Bell,
} from 'lucide-react'
import Logo from '@/components/ui/Logo'
import { cn } from '@/lib/utils'

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

  return (
    <>
      <div className="p-5 border-b border-border">
        <Link href="/dashboard" className="flex items-center" onClick={onLinkClick}>
          <Logo size="md" />
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
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-xl bg-secondary/50">
          <div className="w-9 h-9 bg-primary/20 rounded-full flex items-center justify-center text-sm font-semibold text-primary shrink-0">
            {user?.name?.charAt(0).toUpperCase() ||
              user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.name || 'Usuario'}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all w-full"
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
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-card border-r border-border flex-col z-30">
        <NavContent user={user} />
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-card border-b border-border flex items-center px-4 z-30">
        <button 
          onClick={() => setMobileOpen(true)} 
          className="p-2 rounded-xl hover:bg-secondary transition-colors"
        >
          <Menu size={22} className="text-foreground" />
        </button>
        <Link href="/dashboard" className="flex items-center ml-3">
          <Logo size="sm" />
        </Link>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40" 
          onClick={() => setMobileOpen(false)} 
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={cn(
        'lg:hidden fixed top-0 left-0 h-full w-72 bg-card border-r border-border flex flex-col z-50 transition-transform duration-300 ease-out',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-xl hover:bg-secondary transition-colors"
        >
          <X size={20} className="text-muted-foreground" />
        </button>
        <NavContent user={user} onLinkClick={() => setMobileOpen(false)} />
      </aside>
    </>
  )
}
