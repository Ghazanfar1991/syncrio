import { NextRequest } from 'next/server'

import { apiSuccess } from '@/lib/api-utils'
import { getAnalyticsOverview } from '@/lib/analytics/bundle-analytics'
import { withAuth, withErrorHandling } from '@/lib/middleware'

export async function GET(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  return withErrorHandling(
    withAuth(async (request: NextRequest, user: any) => {
      const { platform } = await params
      const { searchParams } = new URL(request.url)

      const data = await getAnalyticsOverview({
        userId: user.id,
        platform: platform.toUpperCase(),
        accountId: searchParams.get('accountId'),
        period: searchParams.get('period'),
        startDate: searchParams.get('startDate'),
        endDate: searchParams.get('endDate'),
        force: searchParams.get('force') === 'true',
      })

      return apiSuccess(data)
    })
  )(req)
}
