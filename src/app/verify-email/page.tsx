'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Mail, AlertTriangle, Clock, RefreshCw, ArrowLeft } from 'lucide-react'
import { useState } from 'react'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const error = searchParams.get('error')
  const email = searchParams.get('email')
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  // Mapeia erros para mensagens amigáveis
  const errorMessages: Record<string, { title: string; desc: string; icon: React.ReactNode }> = {
    invalid_token: {
      title: 'Link inválido',
      desc: 'Este link de verificação não é válido. Verifique se copiou o link corretamente ou solicite um novo.',
      icon: <AlertTriangle size={48} className="mx-auto mb-4" style={{ color: 'var(--color-destructive)' }} />,
    },
    expired_token: {
      title: 'Link expirado',
      desc: 'Este link de verificação expirou. Links são válidos por 24 horas. Solicite um novo link abaixo.',
      icon: <Clock size={48} className="mx-auto mb-4" style={{ color: 'var(--color-warning)' }} />,
    },
    missing_token: {
      title: 'Link incompleto',
      desc: 'O link de verificação está incompleto. Verifique seu email e clique no link completo.',
      icon: <AlertTriangle size={48} className="mx-auto mb-4" style={{ color: 'var(--color-warning)' }} />,
    },
    server_error: {
      title: 'Erro do servidor',
      desc: 'Ocorreu um erro ao processar sua verificação. Tente novamente em alguns instantes.',
      icon: <AlertTriangle size={48} className="mx-auto mb-4" style={{ color: 'var(--color-destructive)' }} />,
    },
  }

  const errorInfo = error ? errorMessages[error] : null

  const handleResend = async () => {
    if (!email) {
      router.push('/register')
      return
    }
    setResending(true)
    try {
      // Tenta re-registrar para reenviar (a rota trata isso)
      const res = await fetch('/api/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) setResendSuccess(true)
    } catch {
      // silently fail
    } finally {
      setResending(false)
    }
  }

  // Estado: erro no token
  if (errorInfo) {
    return (
      <div className="text-center">
        {errorInfo.icon}
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-foreground)' }}>
          {errorInfo.title}
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--color-muted-foreground)' }}>
          {errorInfo.desc}
        </p>
        {resendSuccess ? (
          <div className="px-4 py-3 rounded-xl text-sm mb-4"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-success) 12%, transparent)',
              color: 'var(--color-success)',
              border: '1px solid color-mix(in srgb, var(--color-success) 25%, transparent)',
            }}>
            ✅ Novo link enviado! Verifique seu email.
          </div>
        ) : (
          <div className="space-y-3">
            {(error === 'expired_token' || error === 'invalid_token') && (
              <button
                onClick={handleResend}
                disabled={resending}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
              >
                {resending ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                Reenviar link de verificação
              </button>
            )}
            <Link href="/register"
              className="flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-foreground)' }}>
              <ArrowLeft size={16} /> Voltar ao cadastro
            </Link>
          </div>
        )}
      </div>
    )
  }

  // Estado padrão: aguardando verificação
  return (
    <div className="text-center">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
        style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 15%, transparent)' }}>
        <Mail size={36} style={{ color: 'var(--color-primary)' }} />
      </div>
      <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--color-foreground)' }}>
        Verifique seu email
      </h2>
      <p className="text-sm mb-2" style={{ color: 'var(--color-muted-foreground)' }}>
        Enviamos um link de confirmação para:
      </p>
      {email && (
        <p className="font-semibold mb-4" style={{ color: 'var(--color-foreground)' }}>
          {email}
        </p>
      )}
      <p className="text-sm mb-6" style={{ color: 'var(--color-muted-foreground)' }}>
        Clique no link no email para ativar sua conta. O link expira em <strong>24 horas</strong>.
      </p>

      <div className="rounded-xl p-4 mb-6 text-left"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--color-primary) 8%, transparent)',
          border: '1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)',
        }}>
        <p className="text-sm font-semibold mb-2" style={{ color: 'var(--color-primary)' }}>
          💡 Não recebeu o email?
        </p>
        <ul className="text-sm space-y-1" style={{ color: 'var(--color-muted-foreground)' }}>
          <li>• Verifique sua pasta de <strong>spam</strong> ou lixo eletrônico</li>
          <li>• Aguarde até 5 minutos para o email chegar</li>
          <li>• Certifique-se que digitou o email corretamente</li>
        </ul>
      </div>

      <Link href="/login"
        className="flex items-center justify-center gap-2 text-sm"
        style={{ color: 'var(--color-muted-foreground)' }}>
        <ArrowLeft size={14} /> Voltar para o login
      </Link>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center">
            <Image src="/logo.jpeg" alt="Fyneo" width={160} height={64} className="h-14 w-auto" />
          </Link>
        </div>

        <div className="rounded-2xl p-8"
          style={{
            backgroundColor: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-modal)',
          }}>
          <Suspense fallback={
            <div className="text-center">
              <RefreshCw size={32} className="animate-spin mx-auto mb-4" style={{ color: 'var(--color-primary)' }} />
              <p style={{ color: 'var(--color-muted-foreground)' }}>Carregando...</p>
            </div>
          }>
            <VerifyEmailContent />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
