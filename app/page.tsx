import { getCurrentUser } from '@/lib/session'
import HomeClient from '@/components/home/HomeClient'

export default async function Home() {
  const user = await getCurrentUser()

  return <HomeClient user={user} />
}
