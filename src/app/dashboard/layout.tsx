import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { ToastProvider } from '@/components/ui/Toast'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <ToastProvider>
      <div className="min-h-screen bg-background">
        <Sidebar user={session.user} />
        <main className="lg:ml-64 pt-14 lg:pt-0">
          <div className="p-4 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </ToastProvider>
  )
}
