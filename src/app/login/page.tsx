'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import Image from 'next/image'
import { Eye, EyeOff, Loader2, Shield, Zap, BarChart3, Mail, CheckCircle2 } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ email: '', password: '' })

  // Mensagens de contexto vindas de redirects
  const verified = searchParams.get('verified')
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  const getSuccessMessage = () => {
    if (verified === 'true') return '✅ Email confirmado! Faça login para continuar.'
    if (verified === 'already') return 'Email já confirmado anteriormente. Faça login.'
    return null
  }

  const successMessage = getSuccessMessage()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await signIn('credentials', {
      email: form.email,
      password: form.password,
      redirect: false,
    })

    if (res?.error) {
      if (res.error === 'EMAIL_NOT_VERIFIED' || res.error?.includes('EMAIL_NOT_VERIFIED')) {
        setError('')
        // Redireciona para página de verificação com o email
        router.push(`/verify-email?email=${encodeURIComponent(form.email)}`)
        return
      }
      setError('Email ou senha incorretos')
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-8 shadow-xl shadow-black/20">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground">Bem-vindo de volta</h2>
        <p className="text-muted-foreground mt-2">Entre na sua conta para continuar</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Mensagem de sucesso (email verificado) */}
        {successMessage && (
          <div className="flex items-center gap-2 bg-success/10 text-success px-4 py-3 rounded-xl text-sm border border-success/20">
            <CheckCircle2 size={16} className="shrink-0" />
            {successMessage}
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-xl text-sm border border-destructive/20">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
            placeholder="seu@email.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Senha</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all pr-12"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 glow-primary"
        >
          {loading && <Loader2 className="animate-spin" size={18} />}
          Entrar
        </button>
      </form>

      {/* Link para verificação de email */}
      <div className="mt-4 text-center">
        <button
          onClick={() => router.push(`/verify-email?email=${encodeURIComponent(form.email)}`)}
          className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 mx-auto"
        >
          <Mail size={12} /> Não recebi o email de verificação
        </button>
      </div>

      <div className="mt-6 pt-6 border-t border-border">
        <p className="text-center text-sm text-muted-foreground">
          Não tem conta?{' '}
          <Link href="/register" className="text-primary hover:text-primary/80 font-medium transition-colors">
            Criar conta gratuita
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--color-primary)_0%,_transparent_50%)] opacity-20" />

        <div className="absolute inset-0 opacity-5">
          <div className="h-full w-full" style={{
            backgroundImage: 'linear-gradient(var(--color-primary) 1px, transparent 1px), linear-gradient(90deg, var(--color-primary) 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }} />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div>
            <Link href="/" className="flex items-center">
              <Image
                src="/logo.jpeg"
                alt="Fyneo - Organize hoje, cresca amanha"
                width={200}
                height={80}
                className="h-20 w-auto"
                priority
              />
            </Link>
          </div>

          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground leading-tight text-balance">
                Organize hoje,
                <span className="text-gradient block">cresca amanha</span>
              </h1>
              <p className="mt-4 text-muted-foreground text-lg max-w-md leading-relaxed">
                Fyneo e a plataforma completa para gestao das suas financas pessoais. Tome decisoes mais inteligentes.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {[
                { icon: Shield, title: 'Dados Protegidos', desc: 'Criptografia de ponta a ponta' },
                { icon: Zap, title: 'Tempo Real', desc: 'Atualizacoes instantaneas' },
                { icon: BarChart3, title: 'Insights Inteligentes', desc: 'Analise automatica de gastos' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-center gap-4 p-4 rounded-xl bg-card/50 border border-border backdrop-blur-sm">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="text-primary" size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{title}</p>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-muted-foreground">Fyneo 2024. Todos os direitos reservados.</p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link href="/" className="inline-flex items-center">
              <Image src="/logo.jpeg" alt="Fyneo" width={160} height={64} className="h-14 w-auto" />
            </Link>
          </div>

          <Suspense fallback={
            <div className="bg-card rounded-2xl border border-border p-8">
              <div className="flex justify-center">
                <Loader2 className="animate-spin text-primary" size={32} />
              </div>
            </div>
          }>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
