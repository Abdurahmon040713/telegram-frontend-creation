import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { getSessionFromCookies } from '@/lib/session'

export default async function Home() {
  const cookieStore = await cookies()
  const session = await getSessionFromCookies(cookieStore)

  if (session) {
    redirect('/dashboard')
  }

  redirect('/login')
}
