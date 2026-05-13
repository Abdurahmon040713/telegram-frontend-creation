import { Navbar } from "@/components/navbar"
import { SearchContent } from "@/components/features/search/search-content"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export default async function SearchPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('telegram_token')?.value
  const phone = cookieStore.get('telegram_phone')?.value

  if (!token || !phone) {
    redirect('/login')
  }

  return (
    <>
      <Navbar />
      <SearchContent initialPhone={phone} />
    </>
  )
}
