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
    const phoneCookie = request.cookies.get('telegram_phone')?.value

    // #region agent log
    fetch('http://127.0.0.1:7648/ingest/55b2d326-e327-4646-a7ee-400eedec4875',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'02af9a'},body:JSON.stringify({sessionId:'02af9a',location:'middleware.ts:protected',message:'protected route check',data:{pathname,hasToken:!!token,hasPhoneCookie:!!phoneCookie,jwtSecretSet:!!jwtSecret,jwtSecretLen:jwtSecret?.length??0},timestamp:Date.now(),hypothesisId:'A,C,D'})}).catch(()=>{});
    // #endregion

    if (!jwtSecret) {
      console.error('FATAL: JWT_SECRET_KEY is not set — blocking all protected routes')
      return redirectToLogin(request, pathname)
    }

    if (!token) {
      return redirectToLogin(request, pathname)
    }

    const session = await verifyToken(token)

    // #region agent log
    fetch('http://127.0.0.1:7648/ingest/55b2d326-e327-4646-a7ee-400eedec4875',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'02af9a'},body:JSON.stringify({sessionId:'02af9a',location:'middleware.ts:verify',message:'token verify result',data:{pathname,sessionValid:!!session,phone:session?.phone??null},timestamp:Date.now(),hypothesisId:'A,E'})}).catch(()=>{});
    // #endregion

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
