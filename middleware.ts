import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { clearAuthCookies, TOKEN_COOKIE } from '@/lib/auth-cookies'
import { verifyToken } from '@/lib/session'

const PUBLIC_ROUTES = ['/login', '/verify', '/api/auth']
const PROTECTED_ROUTES = ['/dashboard', '/chats', '/profile', '/search', '/analyze']

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route))
}

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => pathname.startsWith(route))
}

function redirectToLogin(request: NextRequest, pathname: string): NextResponse {
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('redirect', pathname)
  return NextResponse.redirect(loginUrl)
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const token = request.cookies.get(TOKEN_COOKIE)?.value

  // Authenticated users should not see login or be sent back to login from home.
  if (pathname === '/' || pathname.startsWith('/login')) {
    if (token) {
      const session = await verifyToken(token)
      if (session) {
        const redirectParam = request.nextUrl.searchParams.get('redirect')
        const destination =
          redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('/login')
            ? redirectParam
            : '/dashboard'
        return NextResponse.redirect(new URL(destination, request.url))
      }
    }

    if (pathname === '/') {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    return NextResponse.next()
  }

  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  if (isProtectedRoute(pathname)) {
    const jwtSecret = process.env.JWT_SECRET_KEY

    if (!jwtSecret) {
      console.error('FATAL: JWT_SECRET_KEY is not set — blocking all protected routes')
      return redirectToLogin(request, pathname)
    }

    if (!token) {
      return redirectToLogin(request, pathname)
    }

    const session = await verifyToken(token)
    if (!session) {
      const response = redirectToLogin(request, pathname)
      clearAuthCookies(response)
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
}
