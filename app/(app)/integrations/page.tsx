import { getSocialAccounts } from "@/lib/social"
import IntegrationsPageContent from "@/components/pages/integrations-page"

export default async function IntegrationsPage() {
  const initialSocialAccounts = await getSocialAccounts()
  
  return <IntegrationsPageContent initialSocialAccounts={initialSocialAccounts} />
}
