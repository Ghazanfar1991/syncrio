export interface BundleChannelLike {
  id?: string | null
  name?: string | null
  username?: string | null
  avatarUrl?: string | null
}

export interface BundleSocialAccountLike {
  id?: string
  type?: string
  externalId?: string
  platformId?: string
  displayName?: string | null
  username?: string | null
  name?: string | null
  avatarUrl?: string | null
  channels?: BundleChannelLike[] | null
  channelId?: string | null
  isRequireSetChannel?: boolean | null
  createdAt?: string | null
}

export const BUNDLE_CHANNEL_REQUIRED_PLATFORMS = [
  "FACEBOOK",
  "INSTAGRAM",
  "YOUTUBE",
  "LINKEDIN",
] as const

export type BundleChannelRequiredPlatform =
  (typeof BUNDLE_CHANNEL_REQUIRED_PLATFORMS)[number]

export interface NormalizedBundleMetadata {
  requires_channel_selection: boolean
  available_channels: Array<{
    id: string
    name: string
    username?: string | null
    avatar_url?: string | null
  }>
  channel_id: string | null
}

export interface NormalizedBundleAccountState {
  account_id: string
  account_name: string
  display_name: string
  username: string | null
  avatar_url: string | null
  metadata: NormalizedBundleMetadata
}

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function normalizeBundleChannels(
  channels: BundleSocialAccountLike["channels"]
): Array<{
  id: string
  name: string
  username: string | null
  avatar_url: string | null
}> {
  if (!Array.isArray(channels)) return []

  return channels
    .map((channel) => {
      const id = cleanString(channel?.id)
      const name = cleanString(channel?.name) || id
      if (!id || !name) return null
      return {
        id,
        name,
        username: cleanString(channel?.username),
        avatar_url: cleanString(channel?.avatarUrl),
      }
    })
    .filter((channel): channel is {
      id: string
      name: string
      username: string | null
      avatar_url: string | null
    } => channel !== null)
}

export function platformRequiresChannelSelection(platform: string | null | undefined) {
  return BUNDLE_CHANNEL_REQUIRED_PLATFORMS.includes(
    String(platform || "").toUpperCase() as BundleChannelRequiredPlatform
  )
}

export function getBundleChannelSelectionState(input: {
  platform?: string | null
  isRequireSetChannel?: boolean | null
  channelId?: string | null
  channels?: BundleSocialAccountLike["channels"]
}) {
  const channelId = cleanString(input.channelId)
  const availableChannels = normalizeBundleChannels(input.channels)
  const requiresChannelSelection =
    Boolean(input.isRequireSetChannel) ||
    (platformRequiresChannelSelection(input.platform) && !channelId)

  return {
    requiresChannelSelection,
    channelId,
    availableChannels,
  }
}

export function normalizeBundleAccountState(
  account: BundleSocialAccountLike,
  platformOverride?: string,
  selectedChannelIdOverride?: string | null
): NormalizedBundleAccountState {
  const platform = cleanString(platformOverride) || cleanString(account.type) || "UNKNOWN"
  const selectedChannelId = cleanString(selectedChannelIdOverride)
  const { requiresChannelSelection, channelId, availableChannels } =
    getBundleChannelSelectionState({
      platform,
      isRequireSetChannel: account.isRequireSetChannel,
      channelId: selectedChannelId || account.channelId,
      channels: account.channels,
    })

  const matchedChannel = channelId
    ? availableChannels.find((channel) => channel.id === channelId)
    : null

  const rawDisplayName =
    matchedChannel?.name ||
    cleanString(account.displayName) ||
    cleanString(account.name) ||
    null

  const displayName =
    rawDisplayName ||
    (requiresChannelSelection ? `Configure ${platform}` : `${platform} Account`)

  const accountName =
    matchedChannel?.name ||
    cleanString(account.displayName) ||
    cleanString(account.username) ||
    cleanString(account.name) ||
    `${platform} Account`

  return {
    account_id:
      matchedChannel?.id ||
      cleanString(account.platformId) ||
      cleanString(account.externalId) ||
      cleanString(account.id) ||
      `${platform.toLowerCase()}-account`,
    account_name: accountName,
    display_name: displayName,
    username: matchedChannel?.username || cleanString(account.username),
    avatar_url: matchedChannel?.avatar_url || cleanString(account.avatarUrl),
    metadata: {
      requires_channel_selection: requiresChannelSelection,
      available_channels: availableChannels,
      channel_id: channelId,
    },
  }
}

export function getIntegrationChannelSelectionState(account: {
  platform?: string | null
  accountId?: string | null
  account_id?: string | null
  metadata?: {
    requires_channel_selection?: boolean | null
    channel_id?: string | null
    available_channels?: Array<{
      id?: string | null
    }> | null
  } | null
}) {
  const platform = cleanString(account.platform)
  const explicitChannelId = cleanString(account.metadata?.channel_id)
  const accountId = cleanString(account.accountId) || cleanString(account.account_id)
  const inferredChannelId =
    explicitChannelId ||
    (Array.isArray(account.metadata?.available_channels) && accountId
      ? cleanString(
          account.metadata?.available_channels.find((channel) => cleanString(channel?.id) === accountId)?.id
        )
      : null)

  return (
    (Boolean(account.metadata?.requires_channel_selection) && !inferredChannelId) ||
    (platformRequiresChannelSelection(platform) && !inferredChannelId)
  )
}

export function normalizeBundleCallbackCode(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
}
