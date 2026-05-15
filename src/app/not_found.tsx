import Link from 'next/link'
import Image from 'next/image'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ backgroundColor: 'var(--color-background)' }}>
      <Link href="/dashboard" className="mb-8">
        <Image src="/logo.jpeg" alt="Fyneo" width={140} height={56} className="h-12 w-auto" />
      </Link>

      <div className="text-center space-y-4 max-w-md">
        <p className="text-8xl font-bold" style={{ color: 'var(--color-primary)' }}>404</p>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>
          Página não encontrada
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          A página que você está procurando não existe ou foi movida.
        </p>
        <Link href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all glow-primary mt-4"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>
          Voltar ao Dashboard
        </Link>
      </div>
    </div>
  )
}
