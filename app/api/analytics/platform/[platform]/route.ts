import { NextRequest } from 'next/server'
import { apiError } from '@/lib/api-utils'

export async function GET(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  return apiError('Platform analytics endpoints migrated to Bundle Social API natively.', 400)
}
