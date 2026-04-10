import { getSocialAccounts } from "@/lib/social"
import PlatformAnalyticsPageContent from "@/components/pages/platform-analytics-page-content"

export default async function PlatformAnalyticsPage({ params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params
  const initialSocialAccounts = await getSocialAccounts()
  
  return <PlatformAnalyticsPageContent platform={platform} initialSocialAccounts={initialSocialAccounts} />
}
