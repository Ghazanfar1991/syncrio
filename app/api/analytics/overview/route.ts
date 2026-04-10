import { NextRequest } from 'next/server'

import { apiSuccess } from '@/lib/api-utils'
import { getAnalyticsOverview } from '@/lib/analytics/bundle-analytics'
import { withAuth, withErrorHandling } from '@/lib/middleware'

export async function GET(req: NextRequest) {
  return withErrorHandling(
    withAuth(async (request: NextRequest, user: any) => {
      const { searchParams } = new URL(request.url)

      const data = await getAnalyticsOverview({
        userId: user.id,
        platform: searchParams.get('platform'),
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
