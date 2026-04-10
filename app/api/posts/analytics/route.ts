import { NextRequest } from "next/server"
import { apiError, apiSuccess } from "@/lib/api-utils"
import { db } from "@/lib/db"
import { withAuth, withErrorHandling } from "@/lib/middleware"

interface PostAnalyticsRow {
  post_id: string | null
  platform: string | null
  impressions: number | null
  likes: number | null
  comments: number | null
  shares: number | null
}

interface PostAnalyticsSummary {
  platform: string | null
  impressions: number
  likes: number
  comments: number
  shares: number
}

export async function GET(req: NextRequest) {
  return withErrorHandling(
    withAuth(async () => {
      const rawIds = req.nextUrl.searchParams.get("ids") || ""
      const postIds = [...new Set(rawIds.split(",").map((id) => id.trim()).filter(Boolean))]

      if (postIds.length === 0) {
        return apiSuccess({})
      }

      if (postIds.length > 50) {
        return apiError("Too many post ids requested", 400)
      }

      const { data, error } = await db
        .from("post_analytics")
        .select("post_id, platform, impressions, likes, comments, shares")
        .in("post_id", postIds)

      if (error) {
        throw error
      }

      const analyticsByPost = postIds.reduce<Record<string, PostAnalyticsSummary[]>>((acc, postId) => {
        acc[postId] = []
        return acc
      }, {})

      for (const row of (data || []) as PostAnalyticsRow[]) {
        const postId = row.post_id

        if (!postId) {
          continue
        }

        if (!analyticsByPost[postId]) {
          analyticsByPost[postId] = []
        }

        analyticsByPost[postId].push({
          platform: row.platform,
          impressions: row.impressions || 0,
          likes: row.likes || 0,
          comments: row.comments || 0,
          shares: row.shares || 0,
        })
      }

      return apiSuccess(analyticsByPost)
    })
  )(req)
}
