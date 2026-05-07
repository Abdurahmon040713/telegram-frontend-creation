import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Ro'yxat: token kerak bo'lmagan routes
const PUBLIC_ROUTES = ['/login', '/verify', '/', '/api/auth']

// Ro'yxat: token kerak bo'lgan routes (protected)
const PROTECTED_ROUTES = ['/dashboard', '/chats', '/profile']

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Public routes'da hech narsa qilmay yuborish
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }
  
  // Protected routes uchun token tekshirish
  if (PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
    const token = request.cookies.get('telegram_token')?.value
    
    if (!token) {
      // Token yo'q bo'lsa, login'ga redirect qilish
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
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
