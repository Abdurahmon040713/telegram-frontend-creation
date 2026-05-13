import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const PUBLIC_ROUTES = ['/login', '/verify', '/', '/api/auth']
const PROTECTED_ROUTES = ['/dashboard', '/chats', '/profile', '/search']

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  if (PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
    const jwtSecret = process.env.JWT_SECRET_KEY

    // Fail CLOSED: a misconfigured environment must never open the gate.
    if (!jwtSecret) {
      console.error('FATAL: JWT_SECRET_KEY is not set — blocking all protected routes')
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    const token = request.cookies.get('telegram_token')?.value
    if (!token) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    try {
      const secret = new TextEncoder().encode(jwtSecret)
      await jwtVerify(token, secret)
    } catch {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      const response = NextResponse.redirect(loginUrl)
      response.cookies.delete('telegram_token')
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
}
