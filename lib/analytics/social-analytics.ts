// Social Analytics Stubs - Migrated to Bundle Social API natively
export async function fetchTwitterAnalytics(userId: string, accountId: string, tweetId: string) { return null; }
export async function fetchLinkedInAnalytics(userId: string, accountId: string, postId: string) { return null; }
export async function fetchInstagramAnalytics(userId: string, accountId: string, mediaId: string) { return null; }
export async function fetchYouTubeAnalytics(userId: string, accountId: string, videoId: string) { return null; }
export async function fetchAllUserAnalytics(userId: string): Promise<any[]> { return []; }
export async function refreshAllAnalytics(): Promise<void> {}
