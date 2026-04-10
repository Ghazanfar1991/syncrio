export type BundlePlatformId =
  | "TWITTER"
  | "PINTEREST"
  | "FACEBOOK"
  | "INSTAGRAM"
  | "THREADS"
  | "TIKTOK"
  | "LINKEDIN"
  | "YOUTUBE"
  | "REDDIT"
  | "DISCORD"
  | "SLACK"
  | "MASTODON"
  | "BLUESKY"
  | "GOOGLE_BUSINESS"

export type BundleMediaKind = "IMAGE" | "VIDEO" | "PDF" | "GIF"

export interface BundleUploadedMedia {
  uploadId: string
  url: string
  kind: BundleMediaKind
  mimeType: string
  fileSize: number
  fileName?: string
  width?: number
  height?: number
  duration?: number
  altText?: string
  tagged?: Array<{
    username: string
    x?: number
    y?: number
  }>
}

export interface BundleFieldOption {
  value: string
  label: string
}

export interface BundleListFieldColumn {
  key: string
  label: string
  type?: "text" | "number"
  placeholder?: string
  min?: number
  max?: number
}

export interface BundlePlatformField {
  key: string
  label: string
  type:
    | "text"
    | "textarea"
    | "number"
    | "switch"
    | "select"
    | "multiselect"
    | "date"
    | "tags"
    | "object-list"
  placeholder?: string
  description?: string
  rows?: number
  min?: number
  max?: number
  step?: number
  maxLength?: number
  options?: BundleFieldOption[]
  columns?: BundleListFieldColumn[]
}

export interface BundlePlatformSection {
  id: string
  title: string
  description: string
  fields: BundlePlatformField[]
}

export interface BundleValidationResult {
  errors: string[]
  warnings: string[]
}

export interface BundleAccountContext {
  id?: string
  platform?: string
  accountName?: string
  displayName?: string
  metadata?: {
    available_channels?: Array<{ id?: string; name?: string }>
    channel_id?: string | null
    twitterSubType?: string | null
    [key: string]: unknown
  }
}

type PlatformMetadata = Record<string, unknown>
type TrialParams = { graduationStrategy?: "MANUAL" | "SS_PERFORMANCE" }
type MusicSoundInfo = {
  musicSoundId?: string
  musicSoundVolume?: number | null
  musicSoundStart?: number | null
  musicSoundEnd?: number | null
  videoOriginalSoundVolume?: number | null
}

const TWITTER_REPLY_SETTINGS: BundleFieldOption[] = [
  { value: "EVERYONE", label: "Everyone" },
  { value: "FOLLOWING", label: "Accounts you follow" },
  { value: "MENTIONED_USERS", label: "Mentioned users" },
  { value: "SUBSCRIBERS", label: "Subscribers" },
  { value: "VERIFIED", label: "Verified accounts" },
]

const FACEBOOK_TYPES: BundleFieldOption[] = [
  { value: "POST", label: "Page post" },
  { value: "REEL", label: "Reel" },
  { value: "STORY", label: "Story" },
]

const INSTAGRAM_TYPES: BundleFieldOption[] = [
  { value: "POST", label: "Post / carousel" },
  { value: "REEL", label: "Reel" },
  { value: "STORY", label: "Story" },
]

const TIKTOK_TYPES: BundleFieldOption[] = [
  { value: "VIDEO", label: "Video" },
  { value: "IMAGE", label: "Photo mode" },
]

const TIKTOK_PRIVACY: BundleFieldOption[] = [
  { value: "PUBLIC_TO_EVERYONE", label: "Everyone" },
  { value: "MUTUAL_FOLLOW_FRIENDS", label: "Friends" },
  { value: "FOLLOWER_OF_CREATOR", label: "Followers" },
  { value: "SELF_ONLY", label: "Only me" },
]

const LINKEDIN_PRIVACY: BundleFieldOption[] = [
  { value: "PUBLIC", label: "Public" },
  { value: "CONNECTIONS", label: "Connections" },
  { value: "LOGGED_IN", label: "Logged-in users" },
  { value: "CONTAINER", label: "Container" },
]

const YOUTUBE_TYPES: BundleFieldOption[] = [
  { value: "SHORT", label: "Short" },
  { value: "VIDEO", label: "Long-form video" },
]

const YOUTUBE_PRIVACY: BundleFieldOption[] = [
  { value: "PUBLIC", label: "Public" },
  { value: "UNLISTED", label: "Unlisted" },
  { value: "PRIVATE", label: "Private" },
]

const MASTODON_PRIVACY: BundleFieldOption[] = [
  { value: "PUBLIC", label: "Public" },
  { value: "UNLISTED", label: "Unlisted" },
  { value: "PRIVATE", label: "Private" },
  { value: "DIRECT", label: "Direct" },
]

const BLUESKY_LABELS: BundleFieldOption[] = [
  { value: "!no-unauthenticated", label: "No unauthenticated" },
  { value: "porn", label: "Porn" },
  { value: "sexual", label: "Sexual" },
  { value: "nudity", label: "Nudity" },
  { value: "graphic-media", label: "Graphic media" },
]

const GOOGLE_TOPIC_TYPES: BundleFieldOption[] = [
  { value: "STANDARD", label: "Standard update" },
  { value: "EVENT", label: "Event" },
  { value: "OFFER", label: "Offer" },
  { value: "ALERT", label: "Alert" },
]

const GOOGLE_CTA_TYPES: BundleFieldOption[] = [
  { value: "BOOK", label: "Book" },
  { value: "ORDER", label: "Order" },
  { value: "SHOP", label: "Shop" },
  { value: "LEARN_MORE", label: "Learn more" },
  { value: "SIGN_UP", label: "Sign up" },
  { value: "CALL", label: "Call" },
]

const GOOGLE_ALERT_TYPES: BundleFieldOption[] = [
  { value: "COVID_19", label: "COVID-19" },
]

const INSTAGRAM_GRADUATION: BundleFieldOption[] = [
  { value: "MANUAL", label: "Manual" },
  { value: "SS_PERFORMANCE", label: "Performance based" },
]

export const BUNDLE_PLATFORM_LABELS: Record<BundlePlatformId, string> = {
  TWITTER: "X / Twitter",
  PINTEREST: "Pinterest",
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  THREADS: "Threads",
  TIKTOK: "TikTok",
  LINKEDIN: "LinkedIn",
  YOUTUBE: "YouTube",
  REDDIT: "Reddit",
  DISCORD: "Discord",
  SLACK: "Slack",
  MASTODON: "Mastodon",
  BLUESKY: "Bluesky",
  GOOGLE_BUSINESS: "Google Business",
}

export const BUNDLE_PLATFORM_SECTIONS: Record<BundlePlatformId, BundlePlatformSection[]> = {
  TWITTER: [
    {
      id: "conversation",
      title: "Conversation",
      description: "Control who can reply and keep copy within the account limit.",
      fields: [
        {
          key: "replySettings",
          label: "Reply settings",
          type: "select",
          options: TWITTER_REPLY_SETTINGS,
        },
      ],
    },
  ],
  PINTEREST: [
    {
      id: "destination",
      title: "Destination",
      description: "Pins need a board destination before they can publish.",
      fields: [
        {
          key: "boardName",
          label: "Board",
          type: "text",
          placeholder: "Choose or type a board name",
        },
      ],
    },
    {
      id: "pin",
      title: "Pin Details",
      description: "Bundle uses Pinterest-specific title, description, and private note fields.",
      fields: [
        {
          key: "text",
          label: "Pin title",
          type: "text",
          placeholder: "Optional title",
          maxLength: 100,
        },
        {
          key: "description",
          label: "Pin description",
          type: "textarea",
          placeholder: "Describe the pin",
          rows: 3,
          maxLength: 800,
        },
        {
          key: "link",
          label: "Destination URL",
          type: "text",
          placeholder: "https://example.com",
          maxLength: 2048,
        },
        {
          key: "altText",
          label: "Alt text",
          type: "text",
          placeholder: "Describe the image for accessibility",
          maxLength: 500,
        },
        {
          key: "note",
          label: "Private note",
          type: "textarea",
          placeholder: "Optional private note",
          rows: 2,
          maxLength: 500,
        },
        {
          key: "dominantColor",
          label: "Dominant color",
          type: "text",
          placeholder: "#E35D3F",
        },
      ],
    },
  ],
  FACEBOOK: [
    {
      id: "format",
      title: "Format",
      description: "Choose whether this is a feed post, reel, or story.",
      fields: [
        {
          key: "type",
          label: "Facebook format",
          type: "select",
          options: FACEBOOK_TYPES,
        },
        {
          key: "link",
          label: "Link URL",
          type: "text",
          placeholder: "https://example.com",
          maxLength: 2048,
        },
        {
          key: "mediaTitle",
          label: "Video title",
          type: "text",
          placeholder: "Shown on Facebook video posts",
          maxLength: 255,
        },
        {
          key: "nativeScheduleTime",
          label: "Native Meta schedule time",
          type: "date",
          description: "Optional Meta-native schedule, up to 30 days ahead.",
        },
      ],
    },
  ],
  INSTAGRAM: [
    {
      id: "format",
      title: "Format",
      description: "Switch post mode and reel-specific placement controls.",
      fields: [
        {
          key: "type",
          label: "Instagram format",
          type: "select",
          options: INSTAGRAM_TYPES,
        },
        {
          key: "shareToFeed",
          label: "Show reel in feed",
          type: "switch",
        },
        {
          key: "thumbnailOffset",
          label: "Thumbnail offset (ms)",
          type: "number",
          min: 0,
        },
        {
          key: "autoFitImage",
          label: "Auto-fit image",
          type: "switch",
        },
        {
          key: "autoCropImage",
          label: "Auto-crop image",
          type: "switch",
        },
      ],
    },
    {
      id: "audience",
      title: "Audience & Tagging",
      description: "Bundle supports collaborators, tagged users, and trial reel controls.",
      fields: [
        {
          key: "collaborators",
          label: "Collaborators",
          type: "tags",
          placeholder: "username",
        },
        {
          key: "locationId",
          label: "Location ID",
          type: "text",
          placeholder: "Numeric location id",
        },
        {
          key: "tagged",
          label: "Tagged users",
          type: "object-list",
          columns: [
            { key: "username", label: "Username", placeholder: "username" },
            { key: "x", label: "X", type: "number", min: 0, max: 1 },
            { key: "y", label: "Y", type: "number", min: 0, max: 1 },
          ],
        },
        {
          key: "trialParams.graduationStrategy",
          label: "Trial reel graduation",
          type: "select",
          options: INSTAGRAM_GRADUATION,
        },
      ],
    },
  ],
  THREADS: [],
  TIKTOK: [
    {
      id: "format",
      title: "Format & Distribution",
      description: "Choose video or photo mode, then control audience and duet settings.",
      fields: [
        {
          key: "type",
          label: "TikTok format",
          type: "select",
          options: TIKTOK_TYPES,
        },
        {
          key: "privacy",
          label: "Privacy",
          type: "select",
          options: TIKTOK_PRIVACY,
        },
        {
          key: "photoCoverIndex",
          label: "Photo cover index",
          type: "number",
          min: 0,
        },
        {
          key: "thumbnailOffset",
          label: "Video thumbnail offset (ms)",
          type: "number",
          min: 0,
        },
      ],
    },
    {
      id: "compliance",
      title: "Compliance & Interaction",
      description: "These map directly to Bundle's TikTok booleans.",
      fields: [
        { key: "isBrandContent", label: "Brand content", type: "switch" },
        { key: "isOrganicBrandContent", label: "Organic brand content", type: "switch" },
        { key: "disableComments", label: "Disable comments", type: "switch" },
        { key: "disableDuet", label: "Disable duet", type: "switch" },
        { key: "disableStitch", label: "Disable stitch", type: "switch" },
        { key: "isAiGenerated", label: "AI generated", type: "switch" },
        { key: "autoAddMusic", label: "Auto add music", type: "switch" },
        { key: "autoScale", label: "Auto scale", type: "switch" },
        { key: "uploadToDraft", label: "Upload as TikTok draft", type: "switch" },
      ],
    },
    {
      id: "music",
      title: "Commercial Sound",
      description: "Optional music controls for posts that use a commercial track.",
      fields: [
        {
          key: "musicSoundInfo.musicSoundId",
          label: "Sound ID",
          type: "text",
          placeholder: "Song clip id",
        },
        {
          key: "musicSoundInfo.musicSoundVolume",
          label: "Music volume",
          type: "number",
          min: 0,
          max: 100,
        },
        {
          key: "musicSoundInfo.musicSoundStart",
          label: "Music start (ms)",
          type: "number",
          min: 0,
        },
        {
          key: "musicSoundInfo.musicSoundEnd",
          label: "Music end (ms)",
          type: "number",
          min: 0,
        },
        {
          key: "musicSoundInfo.videoOriginalSoundVolume",
          label: "Original sound volume",
          type: "number",
          min: 0,
          max: 100,
        },
      ],
    },
  ],
  LINKEDIN: [
    {
      id: "distribution",
      title: "Distribution",
      description: "LinkedIn supports link posts, video/document titles, and visibility controls.",
      fields: [
        {
          key: "link",
          label: "Article URL",
          type: "text",
          placeholder: "https://example.com",
        },
        {
          key: "mediaTitle",
          label: "Video / document title",
          type: "text",
          placeholder: "Optional asset title",
          maxLength: 200,
        },
        {
          key: "privacy",
          label: "Visibility",
          type: "select",
          options: LINKEDIN_PRIVACY,
        },
        {
          key: "hideFromFeed",
          label: "Hide from feed",
          type: "switch",
        },
        {
          key: "disableReshare",
          label: "Disable reshare",
          type: "switch",
        },
      ],
    },
  ],
  YOUTUBE: [
    {
      id: "video",
      title: "Video Details",
      description: "Bundle maps YouTube title to `text` and description to `description`.",
      fields: [
        {
          key: "text",
          label: "Title",
          type: "text",
          placeholder: "Video title",
          maxLength: 100,
        },
        {
          key: "description",
          label: "Description",
          type: "textarea",
          placeholder: "Video description",
          rows: 4,
          maxLength: 5000,
        },
        {
          key: "type",
          label: "YouTube format",
          type: "select",
          options: YOUTUBE_TYPES,
        },
        {
          key: "privacy",
          label: "Privacy",
          type: "select",
          options: YOUTUBE_PRIVACY,
        },
      ],
    },
    {
      id: "compliance",
      title: "Compliance",
      description: "These flags are required for YouTube policy-sensitive uploads.",
      fields: [
        { key: "madeForKids", label: "Made for kids", type: "switch" },
        { key: "containsSyntheticMedia", label: "Contains synthetic media", type: "switch" },
        { key: "hasPaidProductPlacement", label: "Paid product placement", type: "switch" },
      ],
    },
  ],
  REDDIT: [
    {
      id: "community",
      title: "Community",
      description: "Target a subreddit or profile and provide flair if the community requires it.",
      fields: [
        {
          key: "sr",
          label: "Subreddit / profile",
          type: "text",
          placeholder: "r/yourSubreddit or u/username",
        },
        {
          key: "flairId",
          label: "Flair ID",
          type: "text",
          placeholder: "Required on some communities",
        },
        {
          key: "nsfw",
          label: "Mark NSFW",
          type: "switch",
        },
      ],
    },
    {
      id: "post",
      title: "Post Details",
      description: "Bundle uses `text` for the Reddit title and `description` for the body.",
      fields: [
        {
          key: "text",
          label: "Title",
          type: "text",
          placeholder: "Reddit title",
          maxLength: 300,
        },
        {
          key: "description",
          label: "Body",
          type: "textarea",
          placeholder: "Optional post body",
          rows: 4,
          maxLength: 30000,
        },
        {
          key: "link",
          label: "Link URL",
          type: "text",
          placeholder: "https://example.com",
          maxLength: 2048,
        },
      ],
    },
  ],
  DISCORD: [
    {
      id: "delivery",
      title: "Delivery",
      description: "Messages need a destination channel. Username and avatar overrides are optional.",
      fields: [
        {
          key: "channelId",
          label: "Channel",
          type: "text",
          placeholder: "Discord channel id",
        },
        {
          key: "username",
          label: "Display username",
          type: "text",
          placeholder: "Optional bot username",
          maxLength: 80,
        },
        {
          key: "avatarUrl",
          label: "Avatar URL",
          type: "text",
          placeholder: "https://example.com/avatar.png",
          maxLength: 2048,
        },
      ],
    },
  ],
  SLACK: [
    {
      id: "delivery",
      title: "Delivery",
      description: "Slack also needs a channel plus optional sender identity overrides.",
      fields: [
        {
          key: "channelId",
          label: "Channel",
          type: "text",
          placeholder: "Slack channel id",
        },
        {
          key: "username",
          label: "Display username",
          type: "text",
          placeholder: "Optional bot username",
          maxLength: 80,
        },
        {
          key: "avatarUrl",
          label: "Avatar URL",
          type: "text",
          placeholder: "https://example.com/avatar.png",
          maxLength: 2048,
        },
      ],
    },
  ],
  MASTODON: [
    {
      id: "privacy",
      title: "Privacy",
      description: "Use Mastodon-specific privacy and spoiler text settings.",
      fields: [
        {
          key: "privacy",
          label: "Visibility",
          type: "select",
          options: MASTODON_PRIVACY,
        },
        {
          key: "spoiler",
          label: "Content warning",
          type: "text",
          placeholder: "Optional spoiler / CW",
          maxLength: 50,
        },
      ],
    },
  ],
  BLUESKY: [
    {
      id: "labels",
      title: "Labels & Tags",
      description: "Add self-labels, hashtags, and quote references for Bluesky.",
      fields: [
        {
          key: "tags",
          label: "Tags",
          type: "tags",
          placeholder: "tag",
        },
        {
          key: "labels",
          label: "Content labels",
          type: "multiselect",
          options: BLUESKY_LABELS,
        },
        {
          key: "quoteUri",
          label: "Quote URI",
          type: "text",
          placeholder: "at://did.../app.bsky.feed.post/...",
        },
      ],
    },
    {
      id: "card",
      title: "External Card",
      description: "Bundle supports external cards and optional video alt text.",
      fields: [
        {
          key: "externalUrl",
          label: "External URL",
          type: "text",
          placeholder: "https://example.com",
        },
        {
          key: "externalTitle",
          label: "Card title",
          type: "text",
          placeholder: "Preview title",
          maxLength: 300,
        },
        {
          key: "externalDescription",
          label: "Card description",
          type: "textarea",
          placeholder: "Preview description",
          rows: 3,
          maxLength: 1000,
        },
        {
          key: "videoAlt",
          label: "Video alt text",
          type: "textarea",
          placeholder: "Describe the video",
          rows: 2,
          maxLength: 10000,
        },
      ],
    },
  ],
  GOOGLE_BUSINESS: [
    {
      id: "post-type",
      title: "Post Type",
      description: "Google Business posts change shape depending on topic type.",
      fields: [
        {
          key: "topicType",
          label: "Topic type",
          type: "select",
          options: GOOGLE_TOPIC_TYPES,
        },
        {
          key: "languageCode",
          label: "Language code",
          type: "text",
          placeholder: "en or en-US",
        },
        {
          key: "callToActionType",
          label: "Call to action",
          type: "select",
          options: GOOGLE_CTA_TYPES,
        },
        {
          key: "callToActionUrl",
          label: "Call to action URL",
          type: "text",
          placeholder: "https://example.com",
        },
      ],
    },
    {
      id: "event",
      title: "Event / Offer / Alert",
      description: "Fill only the section that matches the selected topic type.",
      fields: [
        {
          key: "eventTitle",
          label: "Event title",
          type: "text",
          placeholder: "Event headline",
          maxLength: 58,
        },
        {
          key: "eventStartDate",
          label: "Event start",
          type: "date",
        },
        {
          key: "eventEndDate",
          label: "Event end",
          type: "date",
        },
        {
          key: "offerCouponCode",
          label: "Offer coupon code",
          type: "text",
          placeholder: "SAVE10",
          maxLength: 58,
        },
        {
          key: "offerRedeemOnlineUrl",
          label: "Offer redeem URL",
          type: "text",
          placeholder: "https://example.com/offer",
        },
        {
          key: "offerTermsConditions",
          label: "Offer terms",
          type: "textarea",
          placeholder: "Terms and conditions",
          rows: 3,
          maxLength: 1500,
        },
        {
          key: "alertType",
          label: "Alert type",
          type: "select",
          options: GOOGLE_ALERT_TYPES,
        },
      ],
    },
  ],
}

function getMainText(content: string, metadata: PlatformMetadata) {
  return String(metadata.text ?? metadata.content ?? content ?? "").trim()
}

function getUploadedMedia(metadata: PlatformMetadata): BundleUploadedMedia[] {
  return Array.isArray(metadata.uploadedMedia) ? metadata.uploadedMedia : []
}

function getThumbnailUrl(metadata: PlatformMetadata) {
  const thumbnailMedia =
    metadata.thumbnailMedia && typeof metadata.thumbnailMedia === "object"
      ? (metadata.thumbnailMedia as { url?: string })
      : undefined
  return thumbnailMedia?.url || (typeof metadata.thumbnail === "string" ? metadata.thumbnail : undefined)
}

function getTextLengthLimit(platform: BundlePlatformId, account?: BundleAccountContext) {
  if (platform === "TWITTER") {
    const subType = String(account?.metadata?.twitterSubType || "").toUpperCase()
    if (subType.includes("PREMIUM")) {
      return 25000
    }
    return 280
  }

  const limits: Record<BundlePlatformId, number> = {
    TWITTER: 280,
    PINTEREST: 100,
    FACEBOOK: 50000,
    INSTAGRAM: 2000,
    THREADS: 500,
    TIKTOK: 2200,
    LINKEDIN: 3000,
    YOUTUBE: 100,
    REDDIT: 300,
    DISCORD: 2000,
    SLACK: 30000,
    MASTODON: 30000,
    BLUESKY: 300,
    GOOGLE_BUSINESS: 1500,
  }

  return limits[platform]
}

function countKinds(media: BundleUploadedMedia[]) {
  return media.reduce(
    (acc, item) => {
      acc[item.kind] = (acc[item.kind] || 0) + 1
      return acc
    },
    {} as Record<BundleMediaKind, number>
  )
}

function getAspectRatio(item: BundleUploadedMedia) {
  if (!item.width || !item.height) return null
  return item.width / item.height
}

function pushStringMax(errors: string[], label: string, value: unknown, max: number) {
  if (typeof value === "string" && value.length > max) {
    errors.push(`${label} must be ${max} characters or fewer.`)
  }
}

function pushUrl(errors: string[], label: string, value: unknown) {
  if (typeof value !== "string" || !value) return
  try {
    new URL(value)
  } catch {
    errors.push(`${label} must be a valid URL.`)
  }
}

function pushMediaSizeLimit(
  errors: string[],
  item: BundleUploadedMedia,
  maxBytes: number,
  label: string
) {
  if (item.fileSize > maxBytes) {
    errors.push(`${label} "${item.fileName || item.uploadId}" exceeds ${(maxBytes / 1024 / 1024).toFixed(0)} MB.`)
  }
}

function pushAspectRange(
  errors: string[],
  item: BundleUploadedMedia,
  min: number,
  max: number,
  label: string
) {
  const ratio = getAspectRatio(item)
  if (ratio === null) return
  if (ratio < min || ratio > max) {
    errors.push(`${label} "${item.fileName || item.uploadId}" has aspect ratio ${ratio.toFixed(2)} outside ${min.toFixed(2)}-${max.toFixed(2)}.`)
  }
}

function pushDurationRange(
  errors: string[],
  item: BundleUploadedMedia,
  minSeconds: number,
  maxSeconds: number,
  label: string
) {
  if (typeof item.duration !== "number") return
  if (item.duration < minSeconds || item.duration > maxSeconds) {
    errors.push(`${label} "${item.fileName || item.uploadId}" must be between ${minSeconds}s and ${maxSeconds}s.`)
  }
}

export function buildBundlePlatformPayload(
  platform: BundlePlatformId,
  content: string,
  metadata: PlatformMetadata = {}
) {
  const media = getUploadedMedia(metadata)
  const uploadIds = media.map((item) => item.uploadId)
  const text = getMainText(content, metadata)
  const thumbnail = getThumbnailUrl(metadata)
  const trialParams =
    metadata.trialParams && typeof metadata.trialParams === "object"
      ? (metadata.trialParams as TrialParams)
      : undefined
  const musicSoundInfo =
    metadata.musicSoundInfo && typeof metadata.musicSoundInfo === "object"
      ? (metadata.musicSoundInfo as MusicSoundInfo)
      : undefined
  const mediaItems = media.map((item) => ({
    uploadId: item.uploadId,
    altText: item.altText || metadata.altText || undefined,
  }))
  const carouselItems = media.map((item) => ({
    uploadId: item.uploadId,
    altText: item.altText || metadata.altText || undefined,
    tagged: Array.isArray(item.tagged) ? item.tagged : undefined,
  }))

  switch (platform) {
    case "TWITTER":
      return {
        text,
        uploadIds,
        replySettings: metadata.replySettings || undefined,
      }
    case "PINTEREST":
      return {
        boardName: metadata.boardName,
        text: metadata.text || undefined,
        description: metadata.description || text || undefined,
        uploadIds,
        thumbnail,
        link: metadata.link || undefined,
        altText: metadata.altText || undefined,
        note: metadata.note || undefined,
        dominantColor: metadata.dominantColor || undefined,
      }
    case "FACEBOOK":
      return {
        type: metadata.type || "POST",
        text,
        uploadIds,
        mediaItems: mediaItems.length ? mediaItems : undefined,
        link: metadata.link || undefined,
        thumbnail,
        mediaTitle: metadata.mediaTitle || undefined,
        nativeScheduleTime: metadata.nativeScheduleTime || undefined,
      }
    case "INSTAGRAM":
      return {
        type: metadata.type || "POST",
        text,
        uploadIds,
        altText: metadata.altText || undefined,
        thumbnailOffset: metadata.thumbnailOffset ?? undefined,
        thumbnail,
        shareToFeed: metadata.shareToFeed,
        collaborators: Array.isArray(metadata.collaborators) ? metadata.collaborators : undefined,
        autoFitImage: metadata.autoFitImage,
        autoCropImage: metadata.autoCropImage,
        tagged: Array.isArray(metadata.tagged) ? metadata.tagged : undefined,
        carouselItems: carouselItems.length ? carouselItems : undefined,
        locationId: metadata.locationId || undefined,
        trialParams: trialParams?.graduationStrategy
          ? { graduationStrategy: trialParams.graduationStrategy }
          : undefined,
      }
    case "THREADS":
      return {
        text,
        uploadIds,
        mediaItems: mediaItems.length ? mediaItems : undefined,
      }
    case "TIKTOK":
      return {
        type: metadata.type || "VIDEO",
        text,
        uploadIds,
        thumbnail,
        privacy: metadata.privacy || undefined,
        photoCoverIndex: metadata.photoCoverIndex ?? undefined,
        isBrandContent: metadata.isBrandContent,
        isOrganicBrandContent: metadata.isOrganicBrandContent,
        disableComments: metadata.disableComments,
        disableDuet: metadata.disableDuet,
        disableStitch: metadata.disableStitch,
        thumbnailOffset: metadata.thumbnailOffset ?? undefined,
        isAiGenerated: metadata.isAiGenerated,
        autoAddMusic: metadata.autoAddMusic,
        autoScale: metadata.autoScale,
        uploadToDraft: metadata.uploadToDraft,
        musicSoundInfo: musicSoundInfo?.musicSoundId
          ? {
              musicSoundId: musicSoundInfo.musicSoundId,
              musicSoundVolume: musicSoundInfo.musicSoundVolume ?? undefined,
              musicSoundStart: musicSoundInfo.musicSoundStart ?? undefined,
              musicSoundEnd: musicSoundInfo.musicSoundEnd ?? undefined,
              videoOriginalSoundVolume: musicSoundInfo.videoOriginalSoundVolume ?? undefined,
            }
          : undefined,
      }
    case "LINKEDIN":
      return {
        text,
        uploadIds,
        link: metadata.link || undefined,
        thumbnail,
        mediaTitle: metadata.mediaTitle || undefined,
        privacy: metadata.privacy || undefined,
        hideFromFeed: metadata.hideFromFeed,
        disableReshare: metadata.disableReshare,
      }
    case "YOUTUBE":
      return {
        type: metadata.type || "VIDEO",
        uploadIds,
        text: metadata.text || undefined,
        description: metadata.description || text || undefined,
        thumbnail,
        privacy: metadata.privacy || undefined,
        madeForKids: metadata.madeForKids,
        containsSyntheticMedia: metadata.containsSyntheticMedia,
        hasPaidProductPlacement: metadata.hasPaidProductPlacement,
      }
    case "REDDIT":
      return {
        sr: metadata.sr,
        text: metadata.text || undefined,
        description: metadata.description || text || undefined,
        uploadIds,
        link: metadata.link || undefined,
        nsfw: metadata.nsfw,
        flairId: metadata.flairId || undefined,
      }
    case "DISCORD":
      return {
        channelId: metadata.channelId,
        text,
        uploadIds,
        username: metadata.username || undefined,
        avatarUrl: metadata.avatarUrl || undefined,
      }
    case "SLACK":
      return {
        channelId: metadata.channelId,
        text,
        uploadIds,
        username: metadata.username || undefined,
        avatarUrl: metadata.avatarUrl || undefined,
      }
    case "MASTODON":
      return {
        text,
        uploadIds,
        thumbnail,
        privacy: metadata.privacy || undefined,
        spoiler: metadata.spoiler || undefined,
      }
    case "BLUESKY":
      return {
        text,
        uploadIds,
        tags: Array.isArray(metadata.tags) ? metadata.tags : undefined,
        labels: Array.isArray(metadata.labels) ? metadata.labels : undefined,
        quoteUri: metadata.quoteUri || undefined,
        externalUrl: metadata.externalUrl || undefined,
        externalTitle: metadata.externalTitle || undefined,
        externalDescription: metadata.externalDescription || undefined,
        videoAlt: metadata.videoAlt || undefined,
      }
    case "GOOGLE_BUSINESS":
      return {
        text,
        uploadIds,
        topicType: metadata.topicType || undefined,
        languageCode: metadata.languageCode || undefined,
        callToActionType: metadata.callToActionType || undefined,
        callToActionUrl: metadata.callToActionUrl || undefined,
        eventTitle: metadata.eventTitle || undefined,
        eventStartDate: metadata.eventStartDate || undefined,
        eventEndDate: metadata.eventEndDate || undefined,
        offerCouponCode: metadata.offerCouponCode || undefined,
        offerRedeemOnlineUrl: metadata.offerRedeemOnlineUrl || undefined,
        offerTermsConditions: metadata.offerTermsConditions || undefined,
        alertType: metadata.alertType || undefined,
      }
  }
}

export function validateBundlePlatformPost(
  platform: BundlePlatformId,
  content: string,
  metadata: PlatformMetadata = {},
  account?: BundleAccountContext
): BundleValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const media = getUploadedMedia(metadata)
  const counts = countKinds(media)
  const imageCount = (counts.IMAGE || 0) + (counts.GIF || 0)
  const videoCount = counts.VIDEO || 0
  const documentCount = counts.PDF || 0
  const text = getMainText(content, metadata)

  switch (platform) {
    case "TWITTER": {
      const limit = getTextLengthLimit(platform, account)
      if (!text && media.length === 0) errors.push("X posts need text or media.")
      if (text.length > limit) errors.push(`X post text exceeds ${limit} characters.`)
      if (media.length > 4) errors.push("X posts can include at most 4 attachments.")
      if (imageCount > 4) errors.push("X posts can include at most 4 images.")
      if (videoCount > 4) errors.push("X posts can include at most 4 videos.")
      media
        .filter((item) => item.kind === "IMAGE" || item.kind === "GIF")
        .forEach((item) => pushMediaSizeLimit(errors, item, 5 * 1024 * 1024, "X image"))
      media
        .filter((item) => item.kind === "VIDEO")
        .forEach((item) => {
          pushMediaSizeLimit(errors, item, 512 * 1024 * 1024, "X video")
          pushAspectRange(errors, item, 1 / 3, 3, "X video")
          pushDurationRange(errors, item, 0.5, limit > 280 ? 600 : 140, "X video")
        })
      break
    }
    case "PINTEREST": {
      if (!metadata.boardName) errors.push("Pinterest posts require a board.")
      if (media.length !== 1) errors.push("Pinterest requires exactly 1 image or video.")
      if (imageCount > 1 || videoCount > 1 || (imageCount > 0 && videoCount > 0)) {
        errors.push("Pinterest only supports one media item, either image or video.")
      }
      pushStringMax(errors, "Pin title", metadata.text, 100)
      pushStringMax(errors, "Pin description", metadata.description || text, 800)
      pushStringMax(errors, "Pin alt text", metadata.altText, 500)
      pushStringMax(errors, "Pin note", metadata.note, 500)
      pushUrl(errors, "Pin link", metadata.link)
      if (metadata.dominantColor && !/^#[0-9a-f]{6}$/i.test(String(metadata.dominantColor))) {
        errors.push("Pinterest dominant color must be in #RRGGBB format.")
      }
      media.filter((item) => item.kind === "IMAGE").forEach((item) => {
        pushMediaSizeLimit(errors, item, 5 * 1024 * 1024, "Pinterest image")
      })
      media.filter((item) => item.kind === "VIDEO").forEach((item) => {
        pushMediaSizeLimit(errors, item, 1024 * 1024 * 1024, "Pinterest video")
        pushAspectRange(errors, item, 0.5, 1.91, "Pinterest video")
        pushDurationRange(errors, item, 4, 900, "Pinterest video")
      })
      break
    }
    case "FACEBOOK": {
      const type = metadata.type || "POST"
      if (text.length > 50000) errors.push("Facebook text exceeds 50,000 characters.")
      pushStringMax(errors, "Facebook media title", metadata.mediaTitle, 255)
      pushUrl(errors, "Facebook link", metadata.link)
      if (typeof metadata.nativeScheduleTime === "string" && metadata.nativeScheduleTime) {
        const scheduleDate = new Date(metadata.nativeScheduleTime)
        if (Number.isNaN(scheduleDate.getTime())) {
          errors.push("Facebook native schedule time must be a valid date.")
        } else {
          const diff = scheduleDate.getTime() - Date.now()
          if (diff < 0) errors.push("Facebook native schedule time must be in the future.")
          if (diff > 30 * 24 * 60 * 60 * 1000) {
            errors.push("Facebook native schedule time must be within 30 days.")
          }
        }
      }
      if (type === "POST") {
        if (media.length > 10) errors.push("Facebook posts can include up to 10 attachments.")
        if (videoCount > 1) errors.push("Facebook page posts can include only 1 video.")
        if (imageCount > 4) warnings.push("Facebook page posts commonly allow up to 4 images.")
        if (videoCount > 0 && imageCount > 0) errors.push("Facebook page posts cannot mix images and videos.")
        media.filter((item) => item.kind === "IMAGE").forEach((item) => {
          pushMediaSizeLimit(errors, item, 4 * 1024 * 1024, "Facebook image")
          pushAspectRange(errors, item, 0.01, 1.91, "Facebook image")
        })
        media.filter((item) => item.kind === "VIDEO").forEach((item) => {
          pushAspectRange(errors, item, 0.01, 1.91, "Facebook video")
          pushDurationRange(errors, item, 0, 480, "Facebook video")
        })
      }
      if (type === "REEL") {
        if (videoCount !== 1 || media.length !== 1) errors.push("Facebook reels require exactly 1 video.")
        media.filter((item) => item.kind === "VIDEO").forEach((item) => {
          pushAspectRange(errors, item, 0.01, 10 / 6, "Facebook reel")
          pushDurationRange(errors, item, 3, 480, "Facebook reel")
        })
      }
      if (type === "STORY") {
        if (media.length !== 1) errors.push("Facebook stories require exactly 1 image or video.")
        media.filter((item) => item.kind === "IMAGE").forEach((item) => {
          pushMediaSizeLimit(errors, item, 4 * 1024 * 1024, "Facebook story image")
          pushAspectRange(errors, item, 0.01, 10 / 6, "Facebook story image")
        })
        media.filter((item) => item.kind === "VIDEO").forEach((item) => {
          pushAspectRange(errors, item, 0.01, 10 / 6, "Facebook story video")
          pushDurationRange(errors, item, 3, 60, "Facebook story video")
        })
      }
      break
    }
    case "INSTAGRAM": {
      const type = metadata.type || "POST"
      if (text.length > 2000) errors.push("Instagram captions must be 2,000 characters or fewer.")
      if (Array.isArray(metadata.collaborators) && metadata.collaborators.length > 3) {
        errors.push("Instagram supports at most 3 collaborators.")
      }
      if (metadata.autoFitImage && metadata.autoCropImage) {
        errors.push("Instagram auto-fit and auto-crop cannot both be enabled.")
      }
      if (Array.isArray(metadata.tagged)) {
        metadata.tagged.forEach((tag, index: number) => {
          if (tag?.username && String(tag.username).length > 30) {
            errors.push(`Instagram tagged user ${index + 1} must be 30 characters or fewer.`)
          }
        })
      }
      if (type === "POST") {
        if (media.length < 1 || media.length > 10) {
          errors.push("Instagram posts require 1 to 10 media items.")
        }
        media.filter((item) => item.kind === "IMAGE").forEach((item) => {
          pushMediaSizeLimit(errors, item, 8 * 1024 * 1024, "Instagram image")
          pushAspectRange(errors, item, 0.8, 1.91, "Instagram image")
        })
        media.filter((item) => item.kind === "VIDEO").forEach((item) => {
          pushAspectRange(errors, item, 0.01, 10, "Instagram video")
          pushDurationRange(errors, item, 3, 900, "Instagram video")
        })
      }
      if (type === "REEL") {
        if (videoCount !== 1 || media.length !== 1) errors.push("Instagram reels require exactly 1 video.")
        media.filter((item) => item.kind === "VIDEO").forEach((item) => {
          pushAspectRange(errors, item, 0.01, 10, "Instagram reel")
          pushDurationRange(errors, item, 3, 900, "Instagram reel")
        })
      }
      if (type === "STORY") {
        if (media.length !== 1) errors.push("Instagram stories require exactly 1 image or video.")
        if (Array.isArray(metadata.collaborators) && metadata.collaborators.length > 0) {
          errors.push("Instagram stories do not support collaborators.")
        }
        media.filter((item) => item.kind === "IMAGE").forEach((item) => {
          pushMediaSizeLimit(errors, item, 8 * 1024 * 1024, "Instagram story image")
          pushAspectRange(errors, item, 0.01, 10 / 6, "Instagram story image")
        })
        media.filter((item) => item.kind === "VIDEO").forEach((item) => {
          pushMediaSizeLimit(errors, item, 100 * 1024 * 1024, "Instagram story video")
          pushAspectRange(errors, item, 0.01, 10 / 6, "Instagram story video")
          pushDurationRange(errors, item, 3, 60, "Instagram story video")
        })
      }
      break
    }
    case "THREADS": {
      if (!text && media.length === 0) errors.push("Threads posts need text or media.")
      if (text.length > 500) errors.push("Threads text exceeds 500 characters.")
      if (media.length > 10) errors.push("Threads supports at most 10 attachments.")
      media.filter((item) => item.kind === "IMAGE").forEach((item) => {
        pushMediaSizeLimit(errors, item, 8 * 1024 * 1024, "Threads image")
        pushAspectRange(errors, item, 0.01, 1.91, "Threads image")
      })
      media.filter((item) => item.kind === "VIDEO").forEach((item) => {
        pushAspectRange(errors, item, 0.01, 1.91, "Threads video")
      })
      break
    }
    case "TIKTOK": {
      const type = metadata.type || "VIDEO"
      if (text.length > 2200) errors.push("TikTok captions must be 2,200 characters or fewer.")
      if (type === "VIDEO") {
        if (videoCount !== 1 || media.length !== 1) errors.push("TikTok video posts require exactly 1 video.")
        media.filter((item) => item.kind === "VIDEO").forEach((item) => {
          pushMediaSizeLimit(errors, item, 1024 * 1024 * 1024, "TikTok video")
          pushAspectRange(errors, item, 0.01, 10 / 6, "TikTok video")
          pushDurationRange(errors, item, 0, 600, "TikTok video")
        })
      } else {
        if (media.length < 1 || media.length > 10 || videoCount > 0) {
          errors.push("TikTok photo mode requires 1 to 10 JPG/JPEG images.")
        }
        media.forEach((item) => {
          if (!/image\/jpe?g/i.test(item.mimeType)) {
            errors.push("TikTok photo mode only accepts JPG or JPEG images.")
          }
          pushMediaSizeLimit(errors, item, 20 * 1024 * 1024, "TikTok image")
        })
      }
      if (typeof metadata.photoCoverIndex === "number" && metadata.photoCoverIndex >= media.length) {
        errors.push("TikTok photo cover index must point to an uploaded image.")
      }
      const soundInfo =
        metadata.musicSoundInfo && typeof metadata.musicSoundInfo === "object"
          ? (metadata.musicSoundInfo as MusicSoundInfo)
          : undefined
      if (soundInfo?.musicSoundVolume != null && (soundInfo.musicSoundVolume < 0 || soundInfo.musicSoundVolume > 100)) {
        errors.push("TikTok music volume must be between 0 and 100.")
      }
      if (
        soundInfo?.videoOriginalSoundVolume != null &&
        (soundInfo.videoOriginalSoundVolume < 0 || soundInfo.videoOriginalSoundVolume > 100)
      ) {
        errors.push("TikTok original sound volume must be between 0 and 100.")
      }
      break
    }
    case "LINKEDIN": {
      if (!text) errors.push("LinkedIn posts require text.")
      if (text.length > 3000) errors.push("LinkedIn text exceeds 3,000 characters.")
      pushStringMax(errors, "LinkedIn media title", metadata.mediaTitle, 200)
      if (media.length > 10) errors.push("LinkedIn supports at most 10 attachments.")
      if ([imageCount > 0, videoCount > 0, documentCount > 0].filter(Boolean).length > 1) {
        errors.push("LinkedIn posts cannot mix images, videos, and documents.")
      }
      if (videoCount > 1) errors.push("LinkedIn supports only 1 video.")
      if (documentCount > 1) errors.push("LinkedIn supports only 1 document.")
      media.filter((item) => item.kind === "IMAGE").forEach((item) => {
        pushMediaSizeLimit(errors, item, 5 * 1024 * 1024, "LinkedIn image")
      })
      media.filter((item) => item.kind === "VIDEO").forEach((item) => {
        pushMediaSizeLimit(errors, item, 1024 * 1024 * 1024, "LinkedIn video")
        pushAspectRange(errors, item, 1 / 2.4, 2.4, "LinkedIn video")
        pushDurationRange(errors, item, 3, 1800, "LinkedIn video")
      })
      media.filter((item) => item.kind === "PDF").forEach((item) => {
        pushMediaSizeLimit(errors, item, 100 * 1024 * 1024, "LinkedIn document")
      })
      break
    }
    case "YOUTUBE": {
      const type = metadata.type || "VIDEO"
      if (!metadata.text) errors.push("YouTube videos require a title.")
      pushStringMax(errors, "YouTube title", metadata.text, 100)
      pushStringMax(errors, "YouTube description", metadata.description || text, 5000)
      if (videoCount !== 1 || media.length !== 1) errors.push("YouTube uploads require exactly 1 video.")
      media.filter((item) => item.kind === "VIDEO").forEach((item) => {
        pushMediaSizeLimit(errors, item, 1024 * 1024 * 1024, "YouTube video")
        if (type === "SHORT") {
          pushAspectRange(errors, item, 1 / 3, 1, "YouTube Short")
          pushDurationRange(errors, item, 0, 180, "YouTube Short")
        } else {
          pushAspectRange(errors, item, 1 / 3, 3, "YouTube video")
          pushDurationRange(errors, item, 0, 14400, "YouTube video")
        }
      })
      break
    }
    case "REDDIT": {
      if (!metadata.sr) errors.push("Reddit posts require a subreddit or profile target.")
      if (!metadata.text) errors.push("Reddit posts require a title.")
      pushStringMax(errors, "Reddit title", metadata.text, 300)
      pushStringMax(errors, "Reddit body", metadata.description || text, 30000)
      pushUrl(errors, "Reddit link", metadata.link)
      if (videoCount > 1 || documentCount > 0) errors.push("Reddit supports either images or a single video.")
      if (imageCount > 10) errors.push("Reddit galleries support up to 10 images.")
      if (videoCount > 0 && imageCount > 0) errors.push("Reddit posts cannot mix video and images.")
      media.filter((item) => item.kind === "IMAGE").forEach((item) => {
        pushMediaSizeLimit(errors, item, 20 * 1024 * 1024, "Reddit image")
      })
      media.filter((item) => item.kind === "VIDEO").forEach((item) => {
        pushMediaSizeLimit(errors, item, 1024 * 1024 * 1024, "Reddit video")
        pushAspectRange(errors, item, 9 / 16, 16 / 9, "Reddit video")
        pushDurationRange(errors, item, 4, 900, "Reddit video")
      })
      break
    }
    case "DISCORD": {
      if (!metadata.channelId) errors.push("Discord posts require a channel.")
      if (!text && media.length === 0) errors.push("Discord messages need text or media.")
      if (text.length > 2000) errors.push("Discord text exceeds 2,000 characters.")
      if (media.length > 10) errors.push("Discord supports at most 10 attachments.")
      pushStringMax(errors, "Discord username", metadata.username, 80)
      pushStringMax(errors, "Discord avatar URL", metadata.avatarUrl, 2048)
      pushUrl(errors, "Discord avatar URL", metadata.avatarUrl)
      media.forEach((item) => {
        pushMediaSizeLimit(errors, item, 25 * 1024 * 1024, "Discord attachment")
      })
      break
    }
    case "SLACK": {
      if (!metadata.channelId) errors.push("Slack posts require a channel.")
      if (!text && media.length === 0) errors.push("Slack messages need text or media.")
      if (text.length > 30000) errors.push("Slack text exceeds 30,000 characters.")
      if (media.length > 4) errors.push("Slack supports at most 4 attachments.")
      pushStringMax(errors, "Slack username", metadata.username, 80)
      pushStringMax(errors, "Slack avatar URL", metadata.avatarUrl, 2048)
      pushUrl(errors, "Slack avatar URL", metadata.avatarUrl)
      media.forEach((item) => {
        pushMediaSizeLimit(errors, item, 1024 * 1024 * 1024, "Slack attachment")
      })
      break
    }
    case "MASTODON": {
      if (!text && media.length === 0) errors.push("Mastodon posts need text or media.")
      if (text.length > 30000) warnings.push("Mastodon instances can apply lower text limits than Bundle's default.")
      if (media.length > 4) errors.push("Mastodon supports at most 4 attachments.")
      if (videoCount > 1) errors.push("Mastodon supports only 1 video.")
      if (imageCount > 4) errors.push("Mastodon supports at most 4 images.")
      pushStringMax(errors, "Mastodon spoiler text", metadata.spoiler, 50)
      media.filter((item) => item.kind === "IMAGE").forEach((item) => {
        pushMediaSizeLimit(errors, item, 16 * 1024 * 1024, "Mastodon image")
      })
      media.filter((item) => item.kind === "VIDEO").forEach((item) => {
        pushMediaSizeLimit(errors, item, 99 * 1024 * 1024, "Mastodon video")
        pushAspectRange(errors, item, 1 / 3, 1, "Mastodon video")
      })
      break
    }
    case "BLUESKY": {
      if (!text && media.length === 0 && !metadata.externalUrl && !metadata.quoteUri) {
        errors.push("Bluesky posts need text, media, an external card, or a quote.")
      }
      if (text.length > 300) errors.push("Bluesky text exceeds 300 characters.")
      if (media.length > 4) errors.push("Bluesky supports at most 4 attachments.")
      if (Array.isArray(metadata.tags) && metadata.tags.length > 8) {
        errors.push("Bluesky supports up to 8 tags.")
      }
      pushStringMax(errors, "Bluesky external title", metadata.externalTitle, 300)
      pushStringMax(errors, "Bluesky external description", metadata.externalDescription, 1000)
      pushStringMax(errors, "Bluesky video alt text", metadata.videoAlt, 10000)
      pushUrl(errors, "Bluesky external URL", metadata.externalUrl)
      break
    }
    case "GOOGLE_BUSINESS": {
      if (text.length > 1500) errors.push("Google Business text exceeds 1,500 characters.")
      if (media.length > 1) errors.push("Google Business supports at most 1 image.")
      if (videoCount > 0 || documentCount > 0) errors.push("Google Business only supports images.")
      pushStringMax(errors, "Google event title", metadata.eventTitle, 58)
      pushStringMax(errors, "Google offer coupon code", metadata.offerCouponCode, 58)
      pushStringMax(errors, "Google offer terms", metadata.offerTermsConditions, 1500)
      pushUrl(errors, "Google call to action URL", metadata.callToActionUrl)
      pushUrl(errors, "Google offer redeem URL", metadata.offerRedeemOnlineUrl)
      if (metadata.topicType === "EVENT") {
        if (!metadata.eventTitle) errors.push("Google Business events require an event title.")
        if (!metadata.eventStartDate) errors.push("Google Business events require a start date.")
        if (!metadata.eventEndDate) errors.push("Google Business events require an end date.")
      }
      if (metadata.topicType === "ALERT" && !metadata.alertType) {
        errors.push("Google Business alerts require an alert type.")
      }
      break
    }
  }

  return { errors, warnings }
}

export function getBundlePlatformSections(platform: BundlePlatformId) {
  return BUNDLE_PLATFORM_SECTIONS[platform] || []
}

export function getChannelOptions(account?: BundleAccountContext, mode: "id" | "name" = "id") {
  const channels = account?.metadata?.available_channels
  if (!Array.isArray(channels)) return []

  return channels
    .filter((channel) => channel && (channel.id || channel.name))
    .map((channel) => ({
      value: mode === "name" ? String(channel.name || channel.id) : String(channel.id || channel.name),
      label: String(channel.name || channel.id),
    }))
}

export function getBundlePlatformSummary(platform: BundlePlatformId) {
  const summaries: Record<BundlePlatformId, string> = {
    TWITTER: "0-4 attachments, 280 chars by default unless the connected account is premium.",
    PINTEREST: "Exactly 1 image or video, board required, title/description optimized for discovery.",
    FACEBOOK: "Supports feed posts, reels, and stories with different media rules.",
    INSTAGRAM: "Posts, reels, and stories each have different media and tagging limits.",
    THREADS: "Mixed media up to 10 attachments, 500 characters max.",
    TIKTOK: "Video or photo mode with privacy, duet, stitch, music, and AI flags.",
    LINKEDIN: "One asset type at a time: images, videos, or PDF documents.",
    YOUTUBE: "Exactly 1 video, short or long-form, plus compliance flags.",
    REDDIT: "Title and community required, with gallery and flair support.",
    DISCORD: "Channel-targeted messages with optional identity overrides.",
    SLACK: "Channel-targeted messages with optional identity overrides.",
    MASTODON: "Instance-sensitive text limits, privacy, and content warnings.",
    BLUESKY: "Text, media, quote posts, external cards, tags, and self-labels.",
    GOOGLE_BUSINESS: "Single image updates with CTA, event, offer, and alert variants.",
  }

  return summaries[platform]
}
