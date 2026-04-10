import { getSocialAccounts } from "@/lib/social"
import AnalyticsPageContent from "@/components/pages/analytics-page-content"

export default async function AnalyticsPage() {
  const initialSocialAccounts = await getSocialAccounts()
  
  return <AnalyticsPageContent initialSocialAccounts={initialSocialAccounts} />
}
