// src/middleware.ts
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { db, users } from '@/lib/db'
import { eq } from 'drizzle-orm'

export default auth(async (req) => {
  const isLoggedIn = !!req.auth
  const pathname = req.nextUrl.pathname

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register')
  const isVerifyPage = pathname.startsWith('/verify-email')
  const isApiRoute = pathname.startsWith('/api')
  const isPublic = pathname === '/'
  const isStaticFile = /\.(svg|png|jpg|jpeg|gif|webp|ico|js|css|woff|woff2)$/.test(pathname)

  // Sempre deixa passar: static, api, páginas públicas
  if (isStaticFile || isApiRoute || isPublic) {
    return NextResponse.next()
  }

  // Página de verificação: acessível sem login
  if (isVerifyPage) {
    return NextResponse.next()
  }

  // Não logado tentando acessar área protegida → login
  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Logado tentando acessar login/register → dashboard
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
