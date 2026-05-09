import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

// Ro'yxat: token kerak bo'lmagan routes
const PUBLIC_ROUTES = ['/login', '/verify', '/', '/api/auth']

// Ro'yxat: token kerak bo'lgan routes (protected)
const PROTECTED_ROUTES = ['/dashboard', '/chats', '/profile']

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Public routes'da hech narsa qilmay yuborish
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Protected routes uchun token tekshirish
  if (PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
    const token = request.cookies.get('telegram_token')?.value

    if (!token) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // JWT imzosi va muddatini tekshirish
    const jwtSecret = process.env.JWT_SECRET_KEY
    if (jwtSecret) {
      try {
        const secret = new TextEncoder().encode(jwtSecret)
        await jwtVerify(token, secret)
      } catch {
        // Token yaroqsiz yoki muddati o'tgan
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirect', pathname)
        const response = NextResponse.redirect(loginUrl)
        response.cookies.delete('telegram_token')
        return response
      }
    }
  }

  return NextResponse.next()
}

// Middleware'ni qaysi routes'da ishlashini belgilash
export const config = {
  matcher: [
    // Barcha routes'da ishlash
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
