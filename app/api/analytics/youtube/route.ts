import { NextRequest } from 'next/server'
import { apiError } from '@/lib/api-utils'

export async function GET(req: NextRequest) {
  return apiError('YouTube analytics moved to Bundle Social API', 400)
}
