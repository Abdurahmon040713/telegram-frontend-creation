import { Navbar } from "@/components/navbar"
import { ProfileContent } from "@/components/profile-content"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export default async function ProfilePage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('telegram_token')?.value
  const phone = cookieStore.get('telegram_phone')?.value

  if (!token || !phone) {
    redirect('/login')
  }

  return (
    <>
      <Navbar />
      <ProfileContent phone={phone} />
    </>
  )
}
