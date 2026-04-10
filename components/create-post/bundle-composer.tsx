"use client"

import React from "react"
import Image from "next/image"
import { useQueryClient } from "@tanstack/react-query"
import {
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  Clock3,
  Code2,
  FileText,
  Hash,
  HelpCircle,
  Image as ImageIcon,
  ImagePlus,
  Link2,
  Loader2,
  Plus,
  ScanText,
  SmilePlus,
  Sparkles,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react"

import PostPreview from "@/components/content/PostPreview"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { appQueryKeys, useSocialAccountsQuery } from "@/hooks/queries/use-app-queries"
import { getIntegrationChannelSelectionState } from "@/lib/bundle-account-state"
import {
  BUNDLE_PLATFORM_LABELS,
  getBundlePlatformSections,
  getChannelOptions,
  validateBundlePlatformPost,
  type BundleAccountContext,
  type BundlePlatformField,
  type BundlePlatformId,
  type BundlePlatformSection,
  type BundleUploadedMedia,
} from "@/lib/bundle-platforms"
import { cn } from "@/lib/utils"

type DraftValue = unknown
type DraftRecord = Record<string, DraftValue>

type SocialAccount = BundleAccountContext & {
  id: string
  platform: string
  accountId: string
  accountName: string
  username?: string
  avatarUrl?: string
  isActive: boolean
  isConnected: boolean
}

type DraftState = DraftRecord & {
  content?: string
  uploadedMedia?: BundleUploadedMedia[]
  thumbnailMedia?: BundleUploadedMedia | null
}

function getNestedValue(source: DraftRecord, path: string): DraftValue {
  return path.split(".").reduce<DraftValue>((acc, key) => {
    if (!acc || typeof acc !== "object") return undefined
    return (acc as DraftRecord)[key]
  }, source)
}

function setNestedValue(source: DraftRecord, path: string, value: DraftValue): DraftState {
  const clone = { ...source }
  const keys = path.split(".")
  let cursor: DraftRecord = clone

  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      cursor[key] = value
      return
    }

    const next = cursor[key]
    cursor[key] = typeof next === "object" && next !== null ? { ...(next as DraftRecord) } : {}
    cursor = cursor[key] as DraftRecord
  })

  return clone
}

function asText(value: DraftValue) {
  return typeof value === "string" ? value : ""
}

function asNumberInput(value: DraftValue) {
  return typeof value === "number" ? value : ""
}

function asStringArray(value: DraftValue) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function getMediaKind(file: File): BundleUploadedMedia["kind"] {
  if (file.type === "image/gif") return "GIF"
  if (file.type.startsWith("image/")) return "IMAGE"
  if (file.type.startsWith("video/")) return "VIDEO"
  return "PDF"
}

async function inspectFile(file: File) {
  const base = {
    kind: getMediaKind(file),
    mimeType: file.type || "application/octet-stream",
    fileSize: file.size,
    fileName: file.name,
  }

  if (file.type.startsWith("image/")) {
    return new Promise<Omit<BundleUploadedMedia, "uploadId" | "url">>((resolve) => {
      const objectUrl = URL.createObjectURL(file)
      const image = new window.Image()
      image.onload = () => {
        resolve({ ...base, width: image.naturalWidth, height: image.naturalHeight })
        URL.revokeObjectURL(objectUrl)
      }
      image.onerror = () => {
        resolve(base)
        URL.revokeObjectURL(objectUrl)
      }
      image.src = objectUrl
    })
  }

  if (file.type.startsWith("video/")) {
    return new Promise<Omit<BundleUploadedMedia, "uploadId" | "url">>((resolve) => {
      const objectUrl = URL.createObjectURL(file)
      const video = document.createElement("video")
      video.preload = "metadata"
      video.onloadedmetadata = () => {
        resolve({
          ...base,
          width: video.videoWidth,
          height: video.videoHeight,
          duration: Number.isFinite(video.duration) ? video.duration : undefined,
        })
        URL.revokeObjectURL(objectUrl)
      }
      video.onerror = () => {
        resolve(base)
        URL.revokeObjectURL(objectUrl)
      }
      video.src = objectUrl
    })
  }

  return base
}

function parseMetadata(value: unknown) {
  if (typeof value !== "string") return value || {}
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

function getPlatformIconSrc(platform: string) {
  const normalized = platform.toUpperCase()

  switch (normalized) {
    case "TWITTER":
    case "X":
      return "/social_icons/twitter_x.png"
    case "FACEBOOK":
      return "/social_icons/facebook.png"
    case "INSTAGRAM":
      return "/social_icons/instagram.png"
    case "LINKEDIN":
      return "/social_icons/linkedin.png"
    case "TIKTOK":
      return "/social_icons/tiktok.png"
    case "YOUTUBE":
      return "/social_icons/youtube.png"
    case "PINTEREST":
      return "/social_icons/pintrest.png"
    case "THREADS":
      return "/social_icons/thread.png"
    case "REDDIT":
      return "/social_icons/reddit.png"
    case "DISCORD":
      return "/social_icons/discord.png"
    case "SLACK":
      return "/social_icons/slack.png"
    case "MASTODON":
      return "/social_icons/Mastodon.png"
    case "BLUESKY":
      return "/social_icons/Bluesky.png"
    case "GOOGLE_BUSINESS":
      return "/social_icons/Google Business Profile.png"
    default:
      return null
  }
}

interface BundleComposerProps {
  onCompleted?: () => void
}

export function BundleComposer({ onCompleted }: BundleComposerProps = {}) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const socialAccountsQuery = useSocialAccountsQuery(true)

  const accounts = React.useMemo<SocialAccount[]>(() => {
    return (socialAccountsQuery.data || [])
      .map((account: Record<string, unknown>) => ({
        id: String(account.id || ""),
        platform: String(account.platform || ""),
        accountId: String(account.account_id || ""),
        accountName: String(account.account_name || ""),
        displayName: String(account.display_name || account.account_name || ""),
        username: String(account.username || account.account_name || ""),
        avatarUrl: typeof account.avatar_url === "string" ? account.avatar_url : undefined,
        isActive: Boolean(account.is_active),
        isConnected: Boolean(account.is_connected),
        metadata: parseMetadata(account.metadata),
      }))
      .filter((account) => account.isActive && account.isConnected)
  }, [socialAccountsQuery.data])

  const [selectedAccounts, setSelectedAccounts] = React.useState<string[]>([])
  const [generalContent, setGeneralContent] = React.useState("")
  const [generalMedia, setGeneralMedia] = React.useState<BundleUploadedMedia[]>([])
  const [generalThumbnail, setGeneralThumbnail] = React.useState<BundleUploadedMedia | null>(null)
  const [accountDrafts, setAccountDrafts] = React.useState<Record<string, DraftState>>({})
  const [scheduledAt, setScheduledAt] = React.useState("")
  const [isSavingDrafts, setIsSavingDrafts] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isSubmitted, setIsSubmitted] = React.useState(false)
  const [uploadingTarget, setUploadingTarget] = React.useState<string | null>(null)
  const [activeEditorTab, setActiveEditorTab] = React.useState("original")
  const [activePreviewAccountId, setActivePreviewAccountId] = React.useState("")
  const [rightPaneMode, setRightPaneMode] = React.useState<"preview" | "ai">("preview")
  const [aiPrompt, setAiPrompt] = React.useState("")
  const [aiSuggestion, setAiSuggestion] = React.useState("")

  const mediaInputRef = React.useRef<HTMLInputElement>(null)
  const thumbnailInputRef = React.useRef<HTMLInputElement>(null)

  const accountMap = React.useMemo(() => Object.fromEntries(accounts.map((account) => [account.id, account])), [accounts])

  const getResolvedDraft = React.useCallback(
    (accountId: string): DraftState => {
      const override = accountDrafts[accountId] || {}
      return {
        ...override,
        content: override.content ?? generalContent,
        uploadedMedia: override.uploadedMedia ?? generalMedia,
        thumbnailMedia: override.thumbnailMedia ?? generalThumbnail,
      }
    },
    [accountDrafts, generalContent, generalMedia, generalThumbnail]
  )

  const resolvedDrafts = React.useMemo(() => {
    return Object.fromEntries(
      selectedAccounts.map((accountId) => {
        const draft = getResolvedDraft(accountId)
        const media = draft.uploadedMedia || []

        return [
          accountId,
          {
            ...draft,
            imageUrls: media.filter((item) => item.kind === "IMAGE" || item.kind === "GIF").map((item) => item.url),
            videoUrl: media.find((item) => item.kind === "VIDEO")?.url,
          },
        ]
      })
    )
  }, [getResolvedDraft, selectedAccounts])

  React.useEffect(() => {
    if (!selectedAccounts.length) {
      setActiveEditorTab("original")
      setActivePreviewAccountId("")
      return
    }

    if (activeEditorTab !== "original" && !selectedAccounts.includes(activeEditorTab)) {
      setActiveEditorTab("original")
    }

    if (!activePreviewAccountId || !selectedAccounts.includes(activePreviewAccountId)) {
      setActivePreviewAccountId(selectedAccounts[0])
    }
  }, [activeEditorTab, activePreviewAccountId, selectedAccounts])

  const selectedPlatformIds = React.useMemo(
    () => Array.from(new Set(selectedAccounts.map((accountId) => accountMap[accountId]?.platform).filter(Boolean))) as BundlePlatformId[],
    [accountMap, selectedAccounts]
  )

  const activeEditorAccount = activeEditorTab === "original" ? null : accountMap[activeEditorTab]
  const activePreviewAccount = activePreviewAccountId ? accountMap[activePreviewAccountId] : undefined
  const activeEditorDraft =
    activeEditorTab === "original"
      ? ({ content: generalContent, uploadedMedia: generalMedia, thumbnailMedia: generalThumbnail } satisfies DraftState)
      : getResolvedDraft(activeEditorTab)

  const createAiSuggestion = React.useCallback((seed: string) => {
    const base = seed.trim()
    if (!base) {
      return "Share a concise update, lead with the outcome, keep the tone polished, and close with a clear call to action."
    }

    const cleaned = base.replace(/\s+/g, " ").trim()
    return `${cleaned}\n\nRefined with a stronger hook, tighter structure, and a clearer publish-ready finish.`
  }, [])

  const openAiPilot = React.useCallback(() => {
    const seed = activeEditorDraft.content || generalContent || ""
    setRightPaneMode("ai")
    setAiPrompt(seed)
    setAiSuggestion(createAiSuggestion(seed))
  }, [activeEditorDraft.content, createAiSuggestion, generalContent])

  const validationByAccount = React.useMemo(() => {
    return Object.fromEntries(
      selectedAccounts.map((accountId) => {
        const account = accountMap[accountId]
        if (!account) return [accountId, { errors: ["Connected account not found."], warnings: [] }]

        return [
          accountId,
          validateBundlePlatformPost(
            account.platform as BundlePlatformId,
            getResolvedDraft(accountId).content || "",
            getResolvedDraft(accountId),
            account
          ),
        ]
      })
    )
  }, [accountMap, getResolvedDraft, selectedAccounts])

  const totalErrors = React.useMemo(() => {
    return Object.values(validationByAccount).reduce((count, result) => {
      // Filter errors: always show media errors, but only show policy/field errors if isSubmitted
      const visibleErrors = result.errors.filter((err) => {
        const isMediaError = err.toLowerCase().includes("video") || err.toLowerCase().includes("image") || err.toLowerCase().includes("duration") || err.toLowerCase().includes("resolution") || err.toLowerCase().includes("size")
        return isMediaError || isSubmitted
      })
      return count + visibleErrors.length
    }, 0)
  }, [validationByAccount, isSubmitted])

  const updateAccountDraft = React.useCallback((accountId: string, updater: (draft: DraftState) => DraftState) => {
    setAccountDrafts((current) => ({ ...current, [accountId]: updater(current[accountId] || {}) }))
  }, [])

  const updateAccountValue = React.useCallback(
    (accountId: string, path: string, value: DraftValue) => {
      updateAccountDraft(accountId, (draft) => setNestedValue(draft, path, value))
    },
    [updateAccountDraft]
  )

  const toggleAccount = React.useCallback((accountId: string) => {
    setSelectedAccounts((current) =>
      current.includes(accountId) ? current.filter((value) => value !== accountId) : [...current, accountId]
    )
  }, [])

  const uploadFiles = React.useCallback(
    async (target: "general" | string, files: FileList | File[], mode: "media" | "thumbnail") => {
      const selected = Array.from(files)
      if (!selected.length) return

      const account = target === "general" ? null : accountMap[target]
      const platformLabel = account?.platform || "General"
      setUploadingTarget(`${target}:${mode}`)

      try {
        const uploaded = await Promise.all(
          selected.map(async (file) => {
            const inspected = await inspectFile(file)
            const formData = new FormData()
            formData.append("file", file)
            formData.append("platform", platformLabel)

            const response = await fetch("/api/upload/media", { method: "POST", body: formData })
            const payload = await response.json()
            if (!response.ok || !payload.success) {
              throw new Error(payload.error || "Upload failed")
            }

            return { ...inspected, uploadId: payload.data.uploadId, url: payload.data.url } as BundleUploadedMedia
          })
        )

        if (target === "general") {
          if (mode === "thumbnail") {
            setGeneralThumbnail(uploaded[0] || null)
          } else {
            setGeneralMedia((current) => [...current, ...uploaded])
          }
        } else {
          updateAccountDraft(target, (draft) => {
            const resolved = getResolvedDraft(target)
            if (mode === "thumbnail") {
              return { ...draft, thumbnailMedia: uploaded[0] || resolved.thumbnailMedia || null }
            }
            return { ...draft, uploadedMedia: [...(resolved.uploadedMedia || []), ...uploaded] }
          })
        }

        toast({
          title: "Upload complete",
          description: `${uploaded.length} file${uploaded.length > 1 ? "s" : ""} ready for publishing.`,
          variant: "success",
        })
      } catch (error) {
        toast({
          title: "Upload failed",
          description: error instanceof Error ? error.message : "Unknown upload error",
          variant: "destructive",
        })
      } finally {
        setUploadingTarget(null)
      }
    },
    [accountMap, getResolvedDraft, toast, updateAccountDraft]
  )

  const removeMediaItem = React.useCallback(
    (target: "general" | string, uploadId: string) => {
      if (target === "general") {
        setGeneralMedia((current) => current.filter((item) => item.uploadId !== uploadId))
        return
      }

      updateAccountDraft(target, (draft) => {
        const resolved = getResolvedDraft(target)
        return { ...draft, uploadedMedia: (resolved.uploadedMedia || []).filter((item) => item.uploadId !== uploadId) }
      })
    },
    [getResolvedDraft, updateAccountDraft]
  )

  const removeThumbnail = React.useCallback(
    (target: "general" | string) => {
      if (target === "general") {
        setGeneralThumbnail(null)
        return
      }
      updateAccountDraft(target, (draft) => ({ ...draft, thumbnailMedia: null }))
    },
    [updateAccountDraft]
  )

  const updateMediaAltText = React.useCallback(
    (accountId: string, uploadId: string, altText: string) => {
      updateAccountDraft(accountId, (draft) => {
        const resolved = getResolvedDraft(accountId)
        return {
          ...draft,
          uploadedMedia: (resolved.uploadedMedia || []).map((item) =>
            item.uploadId === uploadId ? { ...item, altText } : item
          ),
        }
      })
    },
    [getResolvedDraft, updateAccountDraft]
  )

  const updateGeneralMediaAltText = React.useCallback((uploadId: string, altText: string) => {
    setGeneralMedia((current) => current.map((item) => (item.uploadId === uploadId ? { ...item, altText } : item)))
  }, [])

  const buildRequestBody = React.useCallback(
    (accountId: string) => {
      const account = accountMap[accountId]
      const draft = getResolvedDraft(accountId)
      const media = draft.uploadedMedia || []
      const images = media.filter((item) => item.kind === "IMAGE" || item.kind === "GIF").map((item) => item.url)
      const videos = media.filter((item) => item.kind === "VIDEO").map((item) => item.url)
      const imageUploadIds = media.filter((item) => item.kind === "IMAGE" || item.kind === "GIF").map((item) => item.uploadId)
      const videoUploadId = media.find((item) => item.kind === "VIDEO")?.uploadId || null

      return {
        content: draft.content || "",
        platform: account?.platform,
        socialAccountIds: [accountId],
        scheduledAt: scheduledAt || undefined,
        images,
        videos,
        imageUploadIds,
        videoUploadId,
        thumbnailUploadId: draft.thumbnailMedia?.uploadId || null,
        title: typeof draft.text === "string" ? draft.text : undefined,
        description: typeof draft.description === "string" ? draft.description : undefined,
        metadata: draft,
      }
    },
    [accountMap, getResolvedDraft, scheduledAt]
  )

  const submitPosts = React.useCallback(
    async (mode: "draft" | "publish") => {
      if (mode === "publish") {
        setIsSubmitted(true)
      }

      if (!selectedAccounts.length) {
        toast({ title: "Select an account", description: "Choose at least one destination.", variant: "destructive" })
        return
      }

      const invalid = selectedAccounts.flatMap((accountId) =>
        validationByAccount[accountId]?.errors.map((message) => `${accountMap[accountId]?.platform}: ${message}`) || []
      )

      if (invalid.length > 0) {
        toast({ title: "Fix validation errors first", description: invalid[0], variant: "destructive" })
        return
      }

      if (mode === "draft") setIsSavingDrafts(true)
      else setIsSubmitting(true)

      try {
        const results = []
        for (const accountId of selectedAccounts) {
          const response = await fetch("/api/posts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(buildRequestBody(accountId)),
          })
          const payload = await response.json()
          if (!response.ok || !payload.success) {
            throw new Error(payload.error?.message || payload.error || "Failed to save post")
          }
          results.push(payload)
        }

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: appQueryKeys.posts }),
          queryClient.invalidateQueries({ queryKey: appQueryKeys.dashboardStats }),
          queryClient.invalidateQueries({ queryKey: appQueryKeys.dashboardInsights }),
        ])

        toast({
          title: mode === "draft" ? "Drafts saved" : scheduledAt ? "Posts scheduled" : "Posts queued",
          description: `${results.length} post${results.length > 1 ? "s" : ""} prepared successfully.`,
          variant: "success",
        })
        onCompleted?.()
      } catch (error) {
        toast({
          title: mode === "draft" ? "Failed to save drafts" : "Failed to submit posts",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        })
      } finally {
        setIsSavingDrafts(false)
        setIsSubmitting(false)
      }
    },
    [accountMap, buildRequestBody, onCompleted, queryClient, scheduledAt, selectedAccounts, toast, validationByAccount]
  )

  const activeAccountValidation =
    activeEditorAccount && validationByAccount[activeEditorAccount.id]
      ? validationByAccount[activeEditorAccount.id]
      : { errors: [] as string[], warnings: [] as string[] }
  const activeAccountSections = activeEditorAccount ? getBundlePlatformSections(activeEditorAccount.platform as BundlePlatformId) : []
  const activeMedia = activeEditorDraft.uploadedMedia || []
  const activeUploadTarget = activeEditorTab === "original" ? "general" : activeEditorTab
  const previewDraft = activePreviewAccountId ? resolvedDrafts[activePreviewAccountId] || getResolvedDraft(activePreviewAccountId) : undefined
  const previewValidation = activePreviewAccountId ? validationByAccount[activePreviewAccountId] : undefined
  const activeTypeField = activeAccountSections.flatMap((section) => section.fields).find((field) => field.key === "type" && field.options?.length)
  const visibleActiveSections = activeAccountSections
    .map((section) => ({ ...section, fields: section.fields.filter((field) => field.key !== activeTypeField?.key) }))
    .filter((section) => section.fields.length > 0)

  const setActiveEditorContent = React.useCallback(
    (value: string) => {
      if (activeEditorTab === "original") {
        setGeneralContent(value)
        return
      }
      updateAccountValue(activeEditorTab, "content", value)
    },
    [activeEditorTab, updateAccountValue]
  )

  return (
    <div className="px-3 pb-3 md:px-6 md:pb-6">
      <div className="rounded-[24px] border border-black/5 dark:border-white/10 bg-white/40 dark:bg-black/20 p-4 backdrop-blur-md md:p-6 shadow-lg">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {accounts.map((account) => {
              const selected = selectedAccounts.includes(account.id)
              const requiresChannel = getIntegrationChannelSelectionState(account)

              return (
                <div key={account.id} className="group relative focus-within:z-50">
                  <button
                    type="button"
                    disabled={requiresChannel}
                    onClick={() => toggleAccount(account.id)}
                    className={cn(
                      "transform transition-all duration-300 ease-out",
                      requiresChannel ? "cursor-not-allowed opacity-40 grayscale" : selected ? "scale-105 opacity-100" : "opacity-60 grayscale hover:scale-105 hover:opacity-100 hover:grayscale-0",
                      "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full"
                    )}
                  >
                    <div className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-full border-[2.5px] bg-card p-[2px] shadow-sm transition-all duration-300",
                      selected ? "border-primary shadow-md shadow-primary/20" : "border-black/5 dark:border-white/5 group-hover:border-primary/40"
                    )}>
                      <Avatar className="h-full w-full">
                        <AvatarImage src={account.avatarUrl} alt={account.accountName} className="object-cover" />
                        <AvatarFallback className="bg-primary/10 text-[12px] font-bold text-primary">
                          {(account.displayName || account.accountName || account.platform).slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <PlatformBadge
                      platform={account.platform}
                      className="absolute -bottom-0.5 -right-0.5 z-10 h-[20px] w-[20px] border-2 border-white dark:border-neutral-900 shadow-md ring-1 ring-black/5"
                    />
                  </button>

                  {/* Modern Tooltip for Selection Bar */}
                  <div className="pointer-events-none absolute bottom-full left-1/2 mb-3 w-max -translate-x-1/2 scale-90 transform opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100 z-[110]">
                    <div className="flex flex-col items-center rounded-2xl border border-black/10 dark:border-white/10 bg-neutral-50/98 dark:bg-popover/98 p-4 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] backdrop-blur-3xl">
                      <div className="flex items-center gap-2">
                        <PlatformBadge platform={account.platform} className="h-8 w-8" />
                        <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">
                          {BUNDLE_PLATFORM_LABELS[account.platform as BundlePlatformId]}
                        </span>
                      </div>
                      <div className="mt-1.5 text-[13px] font-bold text-foreground">
                        {account.displayName || account.accountName}
                      </div>
                      {requiresChannel && (
                        <div className="mt-2 rounded-lg bg-destructive/10 px-2 py-1 text-[10px] font-bold text-destructive italic">
                          Requires channel setup
                        </div>
                      )}
                      {/* Arrow */}
                      <div className="absolute top-full left-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1.5 bg-neutral-50 dark:bg-popover border-b border-r border-black/10 dark:border-white/10 rotate-45" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 rounded-full bg-secondary/50 dark:bg-white/5 px-3.5 py-1.5 font-medium text-muted-foreground border border-black/5 dark:border-white/5">
              <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(99,102,241,0.5)]"></span>
              <span>{selectedAccounts.length} accounts selected</span>
            </div>
            {totalErrors > 0 && (
              <div className="flex items-center gap-2 rounded-full bg-destructive/10 px-3.5 py-1.5 font-semibold text-destructive border border-destructive/20 animate-pulse">
                <AlertTriangle className="h-4 w-4" />
                <span>{totalErrors} issues found</span>
              </div>
            )}
            {totalErrors === 0 && selectedAccounts.length > 0 && (
              <div className="flex items-center gap-2 rounded-full bg-success/10 px-3.5 py-1.5 font-semibold text-success border border-success/20">
                <Sparkles className="h-4 w-4" />
                <span>Ready to publish</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid items-start gap-3.5 xl:grid-cols-[1.22fr_0.9fr]">
          <section className="rounded-[24px] border border-black/5 dark:border-white/5 bg-white/70 dark:bg-neutral-900/70 shadow-xl backdrop-blur-xl transition-all duration-500">
            <div className="border-b border-black/5 dark:border-white/5 bg-secondary/30 dark:bg-black/20 px-4">
              <div className="flex items-center gap-1 overflow-x-auto py-1.5 scrollbar-hide">
                <div className="flex h-[42px] items-center gap-1.5 rounded-full bg-secondary/50 dark:bg-white/5 p-1 border border-black/5 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setActiveEditorTab("original")}
                  className={cn(
                    "flex h-full items-center gap-2 rounded-full px-4 text-[13px] font-bold transition-all duration-300 whitespace-nowrap",
                    activeEditorTab === "original"
                      ? "bg-card text-foreground shadow-sm ring-1 ring-black/5"
                      : "text-muted-foreground hover:bg-white/50 dark:hover:bg-white/10 hover:text-foreground"
                  )}
                >
                  <Sparkles className={cn("h-3.5 w-3.5", activeEditorTab === "original" ? "text-primary" : "text-muted-foreground")} />
                  Original Draft
                </button>
                <div className="h-4 w-[1px] bg-border mx-1" />
                <div className="flex items-center gap-1">
                  {selectedAccounts.map((accountId) => {
                    const account = accountMap[accountId]
                    if (!account) return null
                    return <AccountTabButton key={account.id} account={account} active={activeEditorTab === account.id} onClick={() => setActiveEditorTab(account.id)} />
                  })}
                </div>
              </div>
            </div></div>
            <div className="p-4">
              {!selectedAccounts.length ? (
                <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[14px] border border-dashed border-black/10 dark:border-white/10 bg-secondary/20 p-6 text-center shadow-inner">
                  <div className="max-w-sm space-y-4">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-[17px] font-bold text-foreground">Prepare your message</h3>
                      <p className="text-[13px] leading-relaxed text-muted-foreground whitespace-normal">Select destinations above to begin crafting your story. You can customize the content for each platform individually.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeEditorAccount && activeTypeField ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {(activeTypeField.options || []).map((option) => {
                          const currentValue = asText(getNestedValue(activeEditorDraft, activeTypeField.key)) || activeTypeField.options?.[0]?.value
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => updateAccountValue(activeEditorAccount.id, activeTypeField.key, option.value)}
                              className={cn(
                                "rounded-[6px] border px-3 py-1.5 text-[12px] font-medium transition-colors",
                                currentValue === option.value
                                  ? "border-primary bg-primary text-white"
                                  : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
                              )}
                            >
                              {option.label.replace(/^Page /, "")}
                            </button>
                          )
                        })}
                      </div>

                      {/* Filter visible errors for this account: always show media errors, others only if isSubmitted */}
                      {(() => {
                        const visibleErrors = activeAccountValidation.errors.filter((err) => {
                          const isMediaError = err.toLowerCase().includes("video") || err.toLowerCase().includes("image") || err.toLowerCase().includes("duration") || err.toLowerCase().includes("resolution") || err.toLowerCase().includes("size")
                          return isMediaError || isSubmitted
                        })

                        if (!visibleErrors.length) return null

                        return (
                          <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 shadow-sm animate-in fade-in slide-in-from-top-1 duration-300">
                            <div className="flex items-start gap-3">
                              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                              <div>
                                <div className="text-[13px] font-bold text-destructive">Fix these platform issues before publishing</div>
                                <div className="mt-1 text-[12px] font-medium text-destructive/80">{visibleErrors[0]}.</div>
                              </div>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  ) : null}

                  <div className="group relative rounded-[16px] border border-black/5 dark:border-white/10 bg-card transition-all duration-300 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/5 shadow-sm">
                    <Textarea
                      value={activeEditorDraft.content || ""}
                      onChange={(event) => setActiveEditorContent(event.target.value)}
                      placeholder="Start writing post caption or Generate with AI Pilot..."
                      className="min-h-[180px] w-full resize-none border-0 bg-transparent px-4 py-4 text-[15px] leading-relaxed text-foreground shadow-none placeholder:text-muted-foreground focus-visible:ring-0"
                    />

                    <div className="flex items-center justify-between border-t border-black/5 dark:border-white/5 bg-secondary/30 dark:bg-black/20 px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-1 rounded-lg bg-background p-1 border border-border shadow-sm">
                          <ComposerToolbarButton icon={<ImageIcon className="h-4 w-4" />} label="Add image" onClick={() => mediaInputRef.current?.click()} />
                          <ComposerToolbarButton icon={<Video className="h-4 w-4" />} label="Add video" onClick={() => mediaInputRef.current?.click()} />
                          <ComposerToolbarButton icon={<Upload className="h-4 w-4" />} label="Upload thumbnail" onClick={() => thumbnailInputRef.current?.click()} />
                        </div>

                        <div className="h-6 w-[1px] bg-border" />

                        <div className="flex items-center gap-1 rounded-lg bg-background p-1 border border-border shadow-sm">
                          <ComposerToolbarButton icon={<SmilePlus className="h-4 w-4" />} label="Emoji" onClick={() => setActiveEditorContent(`${activeEditorDraft.content || ""}${activeEditorDraft.content ? " " : ""}:)`)} />
                          <ComposerToolbarButton icon={<Hash className="h-4 w-4" />} label="Hashtags" onClick={() => setActiveEditorContent(`${activeEditorDraft.content || ""}${activeEditorDraft.content ? " " : ""}#`)} />
                          <ComposerToolbarButton icon={<Code2 className="h-4 w-4" />} label="Insert code" />
                        </div>

                        <div className="h-6 w-[1px] bg-border" />

                        <div className="flex items-center gap-1 rounded-lg bg-background p-1 border border-border shadow-sm">
                          <ComposerToolbarButton icon={<Link2 className="h-4 w-4" />} label="UTM parameters" />
                          <ComposerToolbarButton icon={<ScanText className="h-4 w-4" />} label="OCR/Text scan" />
                        </div>

                        <div className="group/ai relative ml-1">
                          <button
                            type="button"
                            onClick={openAiPilot}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-500 transition-all duration-300 hover:scale-110 hover:shadow-lg active:scale-95"
                            title="Open AI Pilot"
                          >
                            <Sparkles className="h-4 w-5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "flex h-7 px-2 items-center justify-center rounded-md text-[11px] font-bold transition-all duration-300",
                          (activeEditorDraft.content || "").length > 0 ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                        )}>
                          {(activeEditorDraft.content || "").length}
                        </div>
                      </div>
                    </div>
                  </div>

                  {(activeMedia.length > 0 || activeEditorDraft.thumbnailMedia) && (
                    <MediaPanel
                      platform={activeEditorAccount?.platform as BundlePlatformId | undefined}
                      draft={activeEditorDraft}
                      onUploadMedia={(files) => uploadFiles(activeUploadTarget, files, "media")}
                      onUploadThumbnail={(files) => uploadFiles(activeUploadTarget, files, "thumbnail")}
                      onRemoveMedia={(uploadId) => removeMediaItem(activeUploadTarget, uploadId)}
                      onRemoveThumbnail={() => removeThumbnail(activeUploadTarget)}
                      onAltTextChange={(uploadId, altText) =>
                        activeEditorTab === "original" ? updateGeneralMediaAltText(uploadId, altText) : updateMediaAltText(activeEditorTab, uploadId, altText)
                      }
                      uploading={uploadingTarget === `${activeUploadTarget}:media` || uploadingTarget === `${activeUploadTarget}:thumbnail`}
                    />
                  )}

                  {activeEditorAccount ? (
                    <div className="space-y-4">
                      {visibleActiveSections.map((section) => (
                        <PlatformSectionCard key={section.id} section={section} draft={activeEditorDraft} account={activeEditorAccount} onChange={(path, value) => updateAccountValue(activeEditorAccount.id, path, value)} />
                      ))}
                    </div>
                  ) : selectedPlatformIds.length ? (
                    <div className="rounded-[12px] border border-border bg-secondary/20 dark:bg-white/5 px-4 py-3 text-[13px] text-muted-foreground font-medium">
                      Shared content and media will flow into {selectedPlatformIds.length} selected platform{selectedPlatformIds.length === 1 ? "" : "s"}. Open a platform tab to tune its extra fields.
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center justify-between gap-3 text-[13px]">
                    <button type="button" className="flex items-center gap-2 text-primary font-bold transition-all hover:scale-105 active:scale-95">
                      <Link2 className="h-4 w-4 rotate-45" />
                      Add Tags
                    </button>
                    <button type="button" className="flex items-center gap-2 text-primary font-bold transition-all hover:scale-105 active:scale-95">
                      Connect Shortener
                      <X className="h-3.5 w-3.5 text-muted-foreground/60" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-black/5 dark:border-white/5 bg-secondary/30 dark:bg-black/20 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                      <Label className="text-[13px] font-bold text-muted-foreground uppercase tracking-wide">Schedule</Label>
                      <div className="relative">
                        <Input
                          type="datetime-local"
                          value={scheduledAt}
                          onChange={(event) => setScheduledAt(event.target.value)}
                          className="h-10 w-full max-w-[240px] rounded-xl border-black/5 dark:border-white/10 bg-card text-[13px] font-bold text-foreground shadow-sm transition-all focus:border-primary focus:ring-4 focus:ring-primary/5"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isSavingDrafts || isSubmitting}
                        onClick={() => submitPosts("draft")}
                        className="h-10 rounded-xl border-black/5 dark:border-white/10 bg-card px-5 text-[13px] font-bold text-muted-foreground shadow-sm transition-all hover:bg-secondary hover:text-foreground"
                      >
                        {isSavingDrafts ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock3 className="mr-2 h-4 w-4 text-primary" />}
                        Save as Draft
                      </Button>
                      <Button
                        type="button"
                        disabled={isSavingDrafts || isSubmitting}
                        onClick={() => submitPosts("publish")}
                        className="h-10 rounded-xl bg-primary px-6 text-[13px] font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 active:scale-95"
                      >
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarClock className="mr-2 h-4 w-4" />}
                        {scheduledAt ? "Schedule Post" : "Queue Post"}
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[24px] border border-black/5 dark:border-white/5 bg-white/70 dark:bg-neutral-900/70 shadow-xl backdrop-blur-xl transition-all duration-500">
            <div className="border-b border-black/5 dark:border-white/5 bg-secondary/30 dark:bg-black/20 px-4">
              <div className="flex items-center gap-1 overflow-x-auto py-1.5 scrollbar-hide">
                {selectedAccounts.map((accountId) => {
                  const account = accountMap[accountId]
                  if (!account) return null
                  return <AccountTabButton key={account.id} account={account} active={activePreviewAccountId === account.id} onClick={() => { setActivePreviewAccountId(account.id); setRightPaneMode("preview") }} />
                })}
              </div>
            </div>

            {!selectedAccounts.length ? (
              <div className="flex min-h-[360px] items-center justify-center p-6 text-center text-sm text-muted-foreground font-medium">Preview will appear here once an account is selected.</div>
            ) : rightPaneMode === "ai" ? (
              <div className="min-h-[360px]">
                <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 px-4 py-3">
                  <h3 className="text-[15px] font-bold text-foreground">AI Pilot</h3>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <button type="button" className="transition-all hover:text-foreground hover:scale-110 active:scale-90"><HelpCircle className="h-5 w-5" /></button>
                    <button type="button" className="transition-all hover:text-foreground hover:scale-110 active:scale-90" onClick={() => setRightPaneMode("preview")}><X className="h-6 w-6" /></button>
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <div>
                    <div className="mb-2.5 flex items-center justify-between">
                      <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80">AI Input</div>
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    </div>
                    <div className="rounded-2xl border border-border bg-background p-4 shadow-sm transition-all focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/5">
                      <Textarea
                        value={aiPrompt}
                        onChange={(event) => setAiPrompt(event.target.value)}
                        placeholder="Describe your content goals..."
                        className="min-h-[80px] w-full resize-none border-0 bg-transparent p-0 text-[14px] leading-relaxed text-foreground shadow-none focus-visible:ring-0"
                      />
                    </div>
                  </div>

                  <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-background p-5 shadow-sm">
                    <div className="absolute right-0 top-0 h-24 w-24 -translate-y-8 translate-x-8 rounded-full bg-primary/10 blur-2xl" />
                    <div className="mb-3 flex items-center gap-2 font-bold text-primary">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                        <Sparkles className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-[12px] uppercase tracking-wider">AI Suggestion</span>
                    </div>
                    <div className="whitespace-pre-wrap text-[14px] leading-relaxed text-foreground/90">
                      {aiSuggestion || "Generate high-performing social copy with AI Pilot."}
                    </div>
                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <Button
                        type="button"
                        onClick={() => { if (!aiSuggestion.trim()) { setAiSuggestion(createAiSuggestion(aiPrompt)); return } setActiveEditorContent(aiSuggestion); setRightPaneMode("preview") }}
                        className="h-9 rounded-xl bg-primary px-6 text-[13px] font-bold text-primary-foreground shadow-md shadow-primary/10 transition-all hover:bg-primary/90 active:scale-95"
                      >
                        Apply Draft
                      </Button>
                      <div className="flex items-center gap-1 rounded-lg bg-secondary p-1 border border-border">
                        <button type="button" onClick={() => setAiSuggestion(createAiSuggestion(aiPrompt || activeEditorDraft.content || generalContent))} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground hover:shadow-sm" title="Regenerate"><Loader2 className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={async () => { if (!aiSuggestion.trim()) return; try { await navigator.clipboard.writeText(aiSuggestion); toast({ title: "Copied", description: "AI copy is on your clipboard.", variant: "success" }) } catch { toast({ title: "Copy failed", description: "Clipboard access is unavailable here.", variant: "destructive" }) } }} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground hover:shadow-sm" title="Copy"><Code2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <AIPillButton label="Rephrase" onClick={() => setAiSuggestion(createAiSuggestion(aiSuggestion || aiPrompt))} />
                    <AIPillButton label="Polish Tone" onClick={() => setAiSuggestion(`${(aiSuggestion || aiPrompt).trim()}\n\nTone: more polished, confident, and concise.`.trim())} />
                    <AIPillButton label="Shorten" onClick={() => setAiSuggestion((aiSuggestion || aiPrompt).slice(0, 180).trim())} />
                    <AIPillButton label="Expand" onClick={() => setAiSuggestion(`${(aiSuggestion || aiPrompt).trim()}\n\nAdd a short supporting detail and a CTA.`.trim())} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="min-h-[420px] space-y-5 p-5">
                {activePreviewAccount && previewDraft ? (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-5">
                    <div className="rounded-[20px] border border-black/5 dark:border-white/10 bg-card p-4 shadow-sm">
                      <div className="mb-4 flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
                        <div className="flex items-center gap-2.5">
                          <PlatformBadge platform={activePreviewAccount.platform} className="h-6 w-6 border-0 shadow-sm" />
                          <div>
                            <p className="text-[13px] font-bold text-foreground leading-none">
                              {BUNDLE_PLATFORM_LABELS[activePreviewAccount.platform as BundlePlatformId]}
                            </p>
                            <p className="mt-1 text-[11px] font-bold text-muted-foreground/80 leading-none">Preview</p>
                          </div>
                        </div>
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary dark:bg-white/5 text-muted-foreground">
                          <HelpCircle className="h-3.5 w-3.5" />
                        </div>
                      </div>

                      <div className="overflow-hidden rounded-xl border border-black/5 dark:border-white/5 bg-secondary/10 dark:bg-black/20">
                        <PostPreview
                          platform={activePreviewAccount.platform}
                          text={previewDraft.content || ""}
                          images={previewDraft.imageUrls}
                          videoUrl={previewDraft.videoUrl}
                          hashtags={[]}
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-primary/20 bg-primary/10 p-4 text-[12px] leading-relaxed text-muted-foreground">
                      <div className="mb-2 flex items-center gap-2 font-bold text-primary">
                        <ScanText className="h-4 w-4" />
                        <span>NETWORK PREVIEW</span>
                      </div>
                      Preview approximates how your content will display when published. Social network{/* */} changes may affect final appearance. Custom tags are replaced automatically.
                    </div>

                    {previewValidation?.errors?.length || previewValidation?.warnings?.length ? (
                      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                        <div className="mb-3 flex items-center gap-2 text-[12px] font-bold text-destructive uppercase tracking-wider">
                          <AlertTriangle className="h-4 w-4" />
                          <span>Platform Requirements</span>
                        </div>
                        <div className="space-y-2">
                          {previewValidation.errors.map((error) => (
                            <div key={error} className="flex items-start gap-2 text-[13px] font-medium text-destructive">
                              <div className="mt-1 h-1 w-1 shrink-0 rounded-full bg-destructive" />
                              <span>{error}</span>
                            </div>
                          ))}
                          {previewValidation.warnings.map((warning) => (
                            <div key={warning} className="flex items-start gap-2 text-[13px] font-medium text-amber-600 dark:text-amber-500">
                              <div className="mt-1 h-1 w-1 shrink-0 rounded-full bg-amber-600 dark:bg-amber-500" />
                              <span>{warning}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex min-h-[420px] flex-col items-center justify-center space-y-3 text-center transition-all duration-500 animate-in fade-in">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary dark:bg-white/5 text-muted-foreground ring-8 ring-secondary/50 dark:ring-white/5">
                      <ImageIcon className="h-6 w-6 opacity-70" />
                    </div>
                    <p className="text-[14px] font-bold text-muted-foreground">Choose an account to preview</p>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      <input ref={mediaInputRef} type="file" multiple accept="image/*,video/*,application/pdf" className="hidden" onChange={(event) => { if (!event.target.files?.length) return; uploadFiles(activeUploadTarget, event.target.files, "media"); event.target.value = "" }} />
      <input ref={thumbnailInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => { if (!event.target.files?.length) return; uploadFiles(activeUploadTarget, event.target.files, "thumbnail"); event.target.value = "" }} />
    </div>
  )
}

function AccountTabButton({ account, active, onClick }: { account: SocialAccount; active: boolean; onClick: () => void }) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300",
          active
            ? "bg-primary shadow-md shadow-primary/20 ring-2 ring-primary/40 ring-offset-2 ring-offset-white dark:ring-offset-neutral-900"
            : "bg-transparent hover:bg-secondary"
        )}
      >
        <div className="relative h-6 w-6">
          <div className={cn(
            "h-full w-full rounded-full ring-1 transition-all duration-300 overflow-hidden",
            active ? "ring-white/20" : "ring-border group-hover:ring-primary/50"
          )}>
            <Image
              src={account.avatarUrl || ""}
              alt={account.accountName}
              width={24}
              height={24}
              className="object-cover"
            />
          </div>
          <PlatformBadge
            platform={account.platform}
            className="absolute -bottom-0.5 -right-0.5 z-10 h-3 w-3 border border-white dark:border-neutral-900 shadow-sm"
          />
        </div>
      </button>

      {/* Modern Tooltip */}
      <div className="pointer-events-none absolute bottom-full left-1/2 mb-3 w-max -translate-x-1/2 scale-90 transform opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100 z-[110]">
        <div className="flex flex-col items-center rounded-2xl border border-black/10 dark:border-white/10 bg-neutral-50/98 dark:bg-popover/98 p-3 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] backdrop-blur-3xl">
          <div className="flex items-center gap-2">
            <PlatformBadge platform={account.platform} className="h-5 w-5" />
            <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">
              {BUNDLE_PLATFORM_LABELS[account.platform as BundlePlatformId]}
            </span>
          </div>
          <div className="mt-1 text-[12px] font-bold text-foreground">
            {account.displayName || account.accountName}
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1.5 bg-neutral-50 dark:bg-popover border-b border-r border-black/10 dark:border-white/10 rotate-45" />
        </div>
      </div>
    </div>
  )
}

function ComposerToolbarButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return <button type="button" onClick={onClick} title={label} className="flex h-8 w-8 items-center justify-center rounded-[8px] text-muted-foreground/80 transition-colors hover:bg-secondary hover:text-foreground">{icon}</button>
}

function AIPillButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 items-center justify-center rounded-xl border border-black/5 dark:border-white/5 bg-card px-3 text-[12px] font-bold text-muted-foreground shadow-sm transition-all hover:border-primary/50 hover:bg-secondary hover:text-primary active:scale-95"
    >
      {label}
    </button>
  )
}

function PlatformBadge({ platform, className = "" }: { platform: string; className?: string }) {
  const iconSrc = getPlatformIconSrc(platform)

  return (
    <span className={cn("relative flex items-center justify-center overflow-hidden rounded-full bg-card shadow-sm shrink-0", className)}>
      {iconSrc ? (
        <Image src={iconSrc} alt={platform} fill sizes="20px" className="object-contain p-[2px]" />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-primary/10 text-[9px] font-bold text-primary uppercase">
          {platform.slice(0, 1)}
        </span>
      )}
    </span>
  )
}

function MediaPanel({
  platform,
  draft,
  onUploadMedia,
  onUploadThumbnail,
  onRemoveMedia,
  onRemoveThumbnail,
  onAltTextChange,
  uploading,
}: {
  platform?: BundlePlatformId
  draft: DraftState
  onUploadMedia: (files: FileList | File[]) => void
  onUploadThumbnail: (files: FileList | File[]) => void
  onRemoveMedia: (uploadId: string) => void
  onRemoveThumbnail: () => void
  onAltTextChange: (uploadId: string, altText: string) => void
  uploading: boolean
}) {
  const mediaInputRef = React.useRef<HTMLInputElement>(null)
  const thumbnailInputRef = React.useRef<HTMLInputElement>(null)
  const media = draft.uploadedMedia || []

  return (
    <div className="space-y-4 rounded-2xl border border-black/5 dark:border-white/5 bg-secondary/10 dark:bg-white/5 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 dark:border-white/5 pb-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Media Assets</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground/80">Upload images, video, or PDF files.</p>
        </div>
        {uploading ? (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary dark:bg-white/5">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2.5">
        <Button
          type="button"
          variant="outline"
          className="h-9 rounded-xl border-black/5 dark:border-white/10 bg-card px-4 text-[13px] font-bold text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
          onClick={() => mediaInputRef.current?.click()}
        >
          <Upload className="mr-2 h-4 w-4 text-primary" />
          Add Media
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-9 rounded-xl border-black/5 dark:border-white/10 bg-card px-4 text-[13px] font-bold text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
          onClick={() => thumbnailInputRef.current?.click()}
        >
          <ImagePlus className="mr-2 h-4 w-4 text-primary" />
          Thumbnail
        </Button>
      </div>

      {draft.thumbnailMedia ? (
        <div className="rounded-xl border border-black/5 dark:border-white/5 bg-secondary/20 dark:bg-black/20 p-3 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ImageIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-foreground">Thumbnail</p>
                <p className="truncate text-[11px] text-muted-foreground">{draft.thumbnailMedia.fileName}</p>
              </div>
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={onRemoveThumbnail}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      {media.length ? (
        <div className="grid gap-3 sm:grid-cols-1">
          {media.map((item) => (
            <div key={item.uploadId} className="rounded-xl border border-black/5 dark:border-white/5 bg-card p-3 shadow-sm transition-all hover:border-primary/30">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary dark:bg-white/5 text-muted-foreground">
                    {item.kind === "PDF" ? <FileText className="h-4 w-4" /> : item.kind === "VIDEO" ? <Video className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold text-foreground">{item.fileName || item.uploadId}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {item.kind} • {(item.fileSize / 1024 / 1024).toFixed(2)} MB
                      {item.width ? ` • ${item.width}x${item.height}` : ""}
                    </p>
                  </div>
                </div>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => onRemoveMedia(item.uploadId)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {item.kind !== "PDF" ? (
                <div className="mt-3">
                  <Input
                    value={item.altText || ""}
                    onChange={(event) => onAltTextChange(item.uploadId, event.target.value)}
                    placeholder="Add accessibility alt text..."
                    className="h-8 rounded-lg border-black/5 dark:border-white/10 bg-secondary/30 dark:bg-black/20 text-[12px] placeholder:text-muted-foreground focus:border-primary"
                  />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-black/10 dark:border-white/10 px-4 py-8 text-center bg-secondary/10 dark:bg-white/5">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-card text-muted-foreground shadow-sm">
            <Upload className="h-5 w-5" />
          </div>
          <p className="text-[13px] font-bold text-muted-foreground">No media added yet.</p>
        </div>
      )}

      <input ref={mediaInputRef} type="file" multiple accept="image/*,video/*,application/pdf" className="hidden" onChange={(event) => event.target.files && onUploadMedia(event.target.files)} />
      <input ref={thumbnailInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => event.target.files && onUploadThumbnail(event.target.files)} />
    </div>
  )
}

function PlatformSectionCard({ section, draft, account, onChange }: { section: BundlePlatformSection; draft: DraftState; account: SocialAccount; onChange: (path: string, value: DraftValue) => void }) {
  return (
    <div className="rounded-2xl border border-black/5 dark:border-white/5 bg-white/70 dark:bg-neutral-900/70 shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-md">
      <div className="bg-secondary/30 dark:bg-black/20 px-4 py-3 border-b border-black/5 dark:border-white/5">
        <h3 className="text-[14px] font-bold text-foreground uppercase tracking-wide">{section.title}</h3>
        {section.description && <p className="mt-0.5 text-[12px] text-muted-foreground">{section.description}</p>}
      </div>
      <div className="p-4 space-y-4">
        {section.fields.map((field) => (
          <BundleFieldControl key={field.key} field={field} value={getNestedValue(draft, field.key)} account={account} onChange={(value) => onChange(field.key, value)} />
        ))}
      </div>
    </div>
  )
}

function BundleFieldControl({ field, value, account, onChange }: { field: BundlePlatformField; value: DraftValue; account: SocialAccount; onChange: (value: DraftValue) => void }) {
  const availableChannelOptions = field.key === "channelId" ? getChannelOptions(account, "id") : field.key === "boardName" ? getChannelOptions(account, "name") : []

  return (
    <div className="space-y-2.5">
      <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">{field.label}</Label>
      {field.type === "textarea" ? (
        <Textarea 
          value={asText(value)} 
          onChange={(event) => onChange(event.target.value)} 
          placeholder={field.placeholder} 
          rows={field.rows || 3} 
          className="rounded-xl border-border bg-secondary/30 dark:bg-white/5 text-[13px] transition-all focus:border-primary focus:ring-4 focus:ring-primary/5" 
        />
      ) : null}
      {field.type === "text" ? (
        availableChannelOptions.length ? (
          <Select value={asText(value) || undefined} onValueChange={onChange}>
            <SelectTrigger className="h-10 rounded-xl border-border bg-secondary/30 dark:bg-white/5 px-4 text-[13px] transition-all">
              <SelectValue placeholder={field.placeholder || "Select an option"} />
            </SelectTrigger>
            <SelectContent>
              {availableChannelOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input 
            value={asText(value)} 
            onChange={(event) => onChange(event.target.value)} 
            placeholder={field.placeholder} 
            className="h-10 rounded-xl border-border bg-secondary/30 dark:bg-white/5 px-4 text-[13px] transition-all focus:border-primary focus:ring-4 focus:ring-primary/5" 
          />
        )
      ) : null}
      {field.type === "number" ? (
        <Input 
          type="number" 
          value={asNumberInput(value)} 
          min={field.min} 
          max={field.max} 
          step={field.step || "any"} 
          onChange={(event) => onChange(event.target.value === "" ? undefined : Number(event.target.value))} 
          placeholder={field.placeholder} 
          className="h-10 rounded-xl border-border bg-secondary/30 dark:bg-white/5 px-4 text-[13px] transition-all focus:border-primary focus:ring-4 focus:ring-primary/5" 
        />
      ) : null}
      {field.type === "date" ? (
        <Input 
          type="datetime-local" 
          value={asText(value)} 
          onChange={(event) => onChange(event.target.value)} 
          className="h-10 rounded-xl border-border bg-secondary/30 dark:bg-white/5 px-4 text-[13px] transition-all focus:border-primary focus:ring-4 focus:ring-primary/5" 
        />
      ) : null}
      {field.type === "switch" ? (
        <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/20 dark:bg-white/5 px-4 py-3 shadow-sm">
          <span className="text-[13px] font-medium text-foreground">{field.description || field.label}</span>
          <Switch checked={Boolean(value)} onCheckedChange={onChange} />
        </div>
      ) : null}
      {field.type === "select" ? (
        <Select value={asText(value) || undefined} onValueChange={onChange}>
          <SelectTrigger className="h-10 rounded-xl border-border bg-secondary/30 dark:bg-white/5 px-4 text-[13px] transition-all">
            <SelectValue placeholder={field.placeholder || "Select an option"} />
          </SelectTrigger>
          <SelectContent>
            {(field.options || []).map((option) => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
      {field.type === "multiselect" ? (
        <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-secondary/20 dark:bg-white/5 p-3 shadow-sm">
          {(field.options || []).map((option) => { 
            const selectedValues = asStringArray(value); 
            const selected = selectedValues.includes(option.value); 
            return (
              <button 
                key={option.value} 
                type="button" 
                onClick={() => onChange(selected ? selectedValues.filter((current) => current !== option.value) : [...selectedValues, option.value])} 
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-[12px] font-bold transition-all active:scale-95", 
                  selected ? "border-primary bg-primary/10 text-primary shadow-sm" : "border-border bg-card text-muted-foreground hover:border-black/20 dark:hover:border-white/20 hover:text-foreground"
                )}
              >
                {option.label}
              </button>
            ) 
          })}
        </div>
      ) : null}
      {field.type === "tags" ? (
        <Input 
          value={asStringArray(value).join(", ")} 
          onChange={(event) => onChange(event.target.value.split(",").map((item) => item.trim()).filter(Boolean))} 
          placeholder={field.placeholder ? `${field.placeholder}, ${field.placeholder}` : "value, value"} 
          className="h-10 rounded-xl border-border bg-secondary/30 dark:bg-white/5 px-4 text-[13px] transition-all focus:border-primary focus:ring-4 focus:ring-primary/5" 
        />
      ) : null}
      {field.type === "object-list" ? <ObjectListEditor value={Array.isArray(value) ? (value as Array<Record<string, DraftValue>>) : []} columns={field.columns || []} onChange={onChange} /> : null}
      {field.description && field.type !== "switch" ? <p className="mt-1.5 text-[11px] font-medium text-muted-foreground/70">{field.description}</p> : null}
    </div>
  )
}

function ObjectListEditor({ value, columns, onChange }: { value: Array<Record<string, DraftValue>>; columns: NonNullable<BundlePlatformField["columns"]>; onChange: (value: Array<Record<string, DraftValue>>) => void }) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-secondary/10 dark:bg-white/5 p-4 shadow-sm">
      {value.map((row, index) => (
        <div key={index} className="grid gap-2.5 md:grid-cols-[1fr_1fr_1fr_auto] items-end">
          {columns.map((column) => (
            <div key={column.key} className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">{column.key}</p>
              <Input 
                type={column.type === "number" ? "number" : "text"} 
                value={column.type === "number" ? asNumberInput(row[column.key]) : asText(row[column.key])} 
                min={column.min} 
                max={column.max} 
                step={column.type === "number" ? "any" : undefined} 
                placeholder={column.placeholder} 
                onChange={(event) => { const next = [...value]; next[index] = { ...row, [column.key]: column.type === "number" ? event.target.value === "" ? undefined : Number(event.target.value) : event.target.value }; onChange(next) }} 
                className="h-10 rounded-xl border-border bg-secondary/30 dark:bg-white/5 px-4 text-[13px] transition-all focus:border-primary focus:ring-4 focus:ring-primary/5" 
              />
            </div>
          ))}
          <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => onChange(value.filter((_, currentIndex) => currentIndex !== index))}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
      <Button type="button" variant="outline" className="h-10 w-full rounded-xl border-border bg-card text-[13px] font-bold text-muted-foreground transition-all hover:bg-secondary hover:text-foreground active:scale-[0.98] shadow-sm" onClick={() => onChange([...value, {}])}>
        <Plus className="mr-2 h-4 w-4 text-primary" />
        Add Item
      </Button>
    </div>
  )
}

