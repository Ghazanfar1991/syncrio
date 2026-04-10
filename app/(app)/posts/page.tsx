import { getPosts } from "@/lib/posts"
import PostsPageContent from "@/components/pages/posts-page"

export default async function PostsPage() {
  const initialData = await getPosts()
  
  return <PostsPageContent initialData={initialData} />
}
