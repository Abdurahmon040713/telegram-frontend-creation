import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { LoginForm } from '@/components/features/auth/login-form'
import { getSessionFromCookies } from '@/lib/session'

type LoginPageProps = {
  searchParams: Promise<{ redirect?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const cookieStore = await cookies()
  const session = await getSessionFromCookies(cookieStore)
  const params = await searchParams

  if (session) {
    const destination =
      params.redirect?.startsWith('/') && !params.redirect.startsWith('/login')
        ? params.redirect
        : '/dashboard'
    redirect(destination)
  }

  return <LoginForm redirectTo={params.redirect} />
}
