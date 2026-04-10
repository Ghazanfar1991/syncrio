import { getSocialAccounts } from "@/lib/social"
import DashboardPageFallback from "@/components/pages/dashboard-page-content"

export default async function DashboardPage() {
  const initialSocialAccounts = await getSocialAccounts()
  
  return <DashboardPageFallback initialSocialAccounts={initialSocialAccounts} />
}
