import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s | Fyneo',
    default: 'Fyneo',
  },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
