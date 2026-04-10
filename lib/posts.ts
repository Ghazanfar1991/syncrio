import { createClient } from '@/lib/supabase/server'
import { formatPostWithHashtags } from '@/lib/api-utils'

export async function getPosts(params: {
  status?: string
  platform?: string
  page?: number
  limit?: number
  includeAnalytics?: boolean
} = {}) {
  const { 
    status, 
    platform, 
    page = 1, 
    limit = 50, 
    includeAnalytics = false 
  } = params
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { posts: [], pagination: { page, limit, total: 0, pages: 0 } }
  }

  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('posts')
    .select(`
      id,
      user_id,
      content,
      hashtags,
      image_url,
      images,
      video_url,
      videos,
      platform,
      status,
      scheduled_at,
      published_at,
      title,
      description,
      created_at,
      updated_at,
      publications:post_publications(
        id,
        social_account_id,
        platform,
        status,
        published_at,
        error_message,
        social_account:social_accounts(
          id,
          account_name,
          platform
        )
      )
      ${includeAnalytics ? ', analytics:post_analytics(id, platform, impressions, likes, comments, shares)' : ''}
    `)
    .eq('user_id', user.id)

  if (status) query = query.eq('status', status)
  if (platform) query = query.eq('platform', platform)

  const { data: posts, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('Error fetching posts:', error)
    return { posts: [], pagination: { page, limit, total: 0, pages: 0 } }
  }

  return {
    posts: posts?.map(p => formatPostWithHashtags(p)) || [],
    pagination: {
      page,
      limit,
      total: posts?.length || 0,
      pages: posts?.length ? 1 : 0,
    },
  }
}
