import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Finan - Controle de Finanças Pessoais',
  description: 'Sistema completo de controle de finanças pessoais',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
