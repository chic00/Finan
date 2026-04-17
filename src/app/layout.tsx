import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
})

export const metadata: Metadata = {
  title: 'Fyneo - Financas Pessoais | Organize hoje, cresca amanha',
  description: 'Fyneo e a plataforma completa para gestao de financas pessoais. Organize suas financas hoje e cresca amanha.',
  keywords: ['financas pessoais', 'controle financeiro', 'gestao', 'orcamento', 'metas financeiras', 'fyneo'],
}

export const viewport: Viewport = {
  themeColor: '#0a0a0f',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${jetbrainsMono.variable} bg-background`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
