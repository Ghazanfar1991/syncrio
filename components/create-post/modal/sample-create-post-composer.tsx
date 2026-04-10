"use client"

import React from "react"
import Image from "next/image"
import { useQueryClient } from "@tanstack/react-query"
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  Code2,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  ImagePlus,
  Link2,
  Loader2,
  Plus,
  RotateCcw,
  ScanText,
  SmilePlus,
  Sparkles,
  Tags,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react"

import PostPreview from "@/components/content/PostPreview"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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

function isMediaValidationMessage(message: string) {
  return /(media|attachment|attachments|image|images|video|videos|thumbnail|pdf|gif|cover|carousel)/i.test(message)
}

function splitValidationMessages(result?: { errors: string[]; warnings: string[] }) {
  const source = result || { errors: [], warnings: [] }

  return {
    mediaErrors: source.errors.filter(isMediaValidationMessage),
    mediaWarnings: source.warnings.filter(isMediaValidationMessage),
    publishErrors: source.errors.filter((message) => !isMediaValidationMessage(message)),
    publishWarnings: source.warnings.filter((message) => !isMediaValidationMessage(message)),
  }
}

function hasDraftMedia(draft?: DraftState) {
  if (!draft) return false
  return Boolean((draft.uploadedMedia && draft.uploadedMedia.length > 0) || draft.thumbnailMedia)
}

function platformSupportsThumbnail(platform?: string) {
  return ["YOUTUBE", "FACEBOOK", "INSTAGRAM", "TIKTOK", "LINKEDIN"].includes((platform || "").toUpperCase())
}

function getCurrentLocalDateTimeValue() {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  const local = new Date(now.getTime() - offset * 60_000)
  return local.toISOString().slice(0, 16)
}

interface BundleComposerProps {
  onCompleted?: () => void
  onClose?: () => void
}

export function SampleCreatePostComposer({ onCompleted, onClose }: BundleComposerProps = {}) {
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
  const [scheduledAt, setScheduledAt] = React.useState(() => getCurrentLocalDateTimeValue())
  const [isSavingDrafts, setIsSavingDrafts] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [uploadingTarget, setUploadingTarget] = React.useState<string | null>(null)
  const [activeEditorTab, setActiveEditorTab] = React.useState("original")
  const [activePreviewAccountId, setActivePreviewAccountId] = React.useState("")
  const [rightPaneMode, setRightPaneMode] = React.useState<"preview" | "ai">("preview")
  const [aiPrompt, setAiPrompt] = React.useState("")
  const [aiSuggestion, setAiSuggestion] = React.useState("")
  const [showSettings, setShowSettings] = React.useState(false)
  const [showPublishMenu, setShowPublishMenu] = React.useState(false)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = React.useState(false)
  const [pendingRemovalAccount, setPendingRemovalAccount] = React.useState<{ id: string; name: string } | null>(null)

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
      setShowSettings(false)
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
    setSelectedAccounts((current) => {
      const exists = current.includes(accountId)
      const next = exists ? current.filter((value) => value !== accountId) : [...current, accountId]

      if (!exists) {
        setActiveEditorTab(accountId)
        setActivePreviewAccountId(accountId)
        setShowSettings(true)
      } else if (activeEditorTab === accountId) {
        setActiveEditorTab("original")
      }

      return next
    })
  }, [activeEditorTab])

  const requestRemoveAccount = React.useCallback((accountId: string, accountName?: string) => {
    setPendingRemovalAccount({ id: accountId, name: accountName || "this platform" })
  }, [])

  const confirmRemoveAccount = React.useCallback(() => {
    if (!pendingRemovalAccount) return
    toggleAccount(pendingRemovalAccount.id)
    setPendingRemovalAccount(null)
  }, [pendingRemovalAccount, toggleAccount])

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
      if (!selectedAccounts.length) {
        toast({ title: "Select an account", description: "Choose at least one destination.", variant: "destructive" })
        return
      }

      setHasAttemptedSubmit(true)

      if (mode === "publish") {
        const invalid = selectedAccounts.flatMap((accountId) =>
          validationByAccount[accountId]?.errors.map((message) => `${accountMap[accountId]?.platform}: ${message}`) || []
        )

        if (invalid.length > 0) {
          toast({ title: "Fix validation errors first", description: invalid[0], variant: "destructive" })
          return
        }
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
  const activeUploadTarget = activeEditorTab === "original" ? "general" : activeEditorTab
  const previewDraft = activePreviewAccountId ? resolvedDrafts[activePreviewAccountId] || getResolvedDraft(activePreviewAccountId) : undefined
  const previewValidation = activePreviewAccountId ? validationByAccount[activePreviewAccountId] : undefined
  const shouldShowThumbnailButton = activeEditorAccount ? platformSupportsThumbnail(activeEditorAccount.platform) : false
  const shouldShowMediaPanel = hasDraftMedia(activeEditorDraft) || uploadingTarget === `${activeUploadTarget}:media` || uploadingTarget === `${activeUploadTarget}:thumbnail`
  const activeDraftHasMedia = hasDraftMedia(activeEditorDraft)
  const previewDraftHasMedia = hasDraftMedia(previewDraft)
  const activeValidationSplit = splitValidationMessages(activeAccountValidation)
  const previewValidationSplit = splitValidationMessages(previewValidation)
  const visibleActiveErrors = hasAttemptedSubmit
    ? [...activeValidationSplit.mediaErrors, ...activeValidationSplit.publishErrors]
    : activeDraftHasMedia
      ? activeValidationSplit.mediaErrors
      : []
  const visiblePreviewErrors = hasAttemptedSubmit
    ? [...previewValidationSplit.mediaErrors, ...previewValidationSplit.publishErrors]
    : previewDraftHasMedia
      ? previewValidationSplit.mediaErrors
      : []
  const visiblePreviewWarnings = hasAttemptedSubmit
    ? [...previewValidationSplit.mediaWarnings, ...previewValidationSplit.publishWarnings]
    : previewDraftHasMedia
      ? previewValidationSplit.mediaWarnings
      : []
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

  React.useEffect(() => {
    if (activeEditorTab === "original") {
      setShowSettings(false)
      return
    }
    setShowSettings(true)
  }, [activeEditorTab])

  React.useEffect(() => {
    setShowPublishMenu(false)
  }, [scheduledAt, selectedAccounts.length])

  return (
    <div className="flex h-[calc(100vh-80px)] w-full flex-col overflow-hidden rounded-[24px] border border-white/40 bg-[var(--sample-create-glass)] text-[rgb(var(--sample-create-text))] backdrop-blur-[18px]">
      <div className="flex min-h-0 flex-1">
        <div className="flex min-h-0 flex-1 flex-col border-r border-[var(--sample-create-border)] bg-[var(--sample-create-surface)]">
          <div className="flex h-[55px] items-center bg-[var(--sample-create-header)] px-12 text-[20px] font-semibold tracking-[-0.04em] text-[rgb(var(--sample-create-text))] backdrop-blur-[18px]">
            Create Post
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="relative min-h-0 flex-1">
              <div className="absolute inset-0 overflow-y-auto px-5 pb-4 pt-3">
                <div className="flex min-h-full flex-col gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-1 flex-wrap gap-4 overflow-visible">
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
                                "transform rounded-full transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                                requiresChannel
                                  ? "cursor-not-allowed opacity-40 grayscale"
                                  : selected
                                    ? "scale-105 opacity-100 grayscale-0"
                                    : "grayscale"
                              )}
                            >
                              <div
                                className={cn(
                                  "flex h-[38px] w-[38px] items-center justify-center rounded-full bg-transparent transition-all duration-300",
                                  selected ? "border-[2px] border-[#622ff6]" : "border-0"
                                )}
                              >
                                <Avatar className="h-[34px] w-[34px] rounded-full border-0">
                                  <AvatarImage src={account.avatarUrl} alt={account.accountName} className="object-cover" />
                                  <AvatarFallback className="bg-primary/10 text-[12px] font-bold text-primary">
                                    {(account.displayName || account.accountName || account.platform).slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                              <PlatformBadge
                                platform={account.platform}
                                className="absolute -bottom-[1px] -right-[5px] z-10 h-[18px] w-[18px]"
                              />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                    <div className="rounded-full bg-[var(--sample-create-surface-inner)] px-3 py-1 text-[12px] font-semibold text-[rgb(var(--sample-create-text-muted))]">
                      {selectedAccounts.length} selected
                    </div>
                  </div>

                  <div className="flex flex-col gap-5">
                    <div className="flex w-full gap-[6px] overflow-x-auto pb-1">
                      <button
                        type="button"
                        onClick={() => setActiveEditorTab("original")}
                        className={cn(
                          "flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[8px] border bg-[var(--sample-create-strip)] transition-all",
                          activeEditorTab === "original"
                            ? "border-[#fc69ff] text-[#fc69ff]"
                            : "border-transparent text-[rgb(var(--sample-create-text-muted))]"
                        )}
                      >
                        <Sparkles className="h-4 w-4" />
                      </button>
                      {selectedAccounts.map((accountId) => {
                        const account = accountMap[accountId]
                        if (!account) return null
                        return (
                          <div key={account.id} className="relative shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveEditorTab(account.id)
                                setActivePreviewAccountId(account.id)
                                setShowSettings(true)
                              }}
                              className={cn(
                                "relative flex h-[38px] w-[38px] items-center justify-center rounded-[8px] border bg-[var(--sample-create-strip)] transition-all",
                                activeEditorTab === account.id ? "border-[#fc69ff]" : "border-transparent"
                              )}
                            >
                            <Avatar className="h-[26px] w-[26px] rounded-full border-0">
                              <AvatarImage src={account.avatarUrl} alt={account.accountName} className="object-cover" />
                              <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                                {(account.displayName || account.accountName || account.platform).slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <PlatformBadge platform={account.platform} className="absolute bottom-[2px] right-[2px] h-[12px] w-[12px]" />
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                requestRemoveAccount(account.id, account.displayName || account.accountName)
                              }}
                              className="absolute -left-[6px] -top-[6px] z-20 flex h-[14px] w-[14px] items-center justify-center rounded-full bg-[#ff4d4f] text-[10px] font-semibold leading-none text-white shadow-sm"
                              aria-label={`Remove ${account.displayName || account.accountName}`}
                            >
                              ×
                            </button>
                          </div>
                        )
                      })}
                    </div>

                    <div className="max-w-[700px] rounded-[18px] bg-[var(--sample-create-surface)]">
                      <div className="flex flex-col gap-4">
                          {activeEditorAccount && activeTypeField ? (
                            <div className="flex flex-wrap gap-2 px-2">
                              {(activeTypeField.options || []).map((option) => {
                                const currentValue = asText(getNestedValue(activeEditorDraft, activeTypeField.key)) || activeTypeField.options?.[0]?.value
                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => updateAccountValue(activeEditorAccount.id, activeTypeField.key, option.value)}
                                    className={cn(
                                      "rounded-[8px] px-4 py-2 text-[13px] font-semibold transition-all",
                                      currentValue === option.value
                                        ? "bg-[#612bd3] text-white"
                                        : "bg-[var(--sample-create-strip)] text-[rgb(var(--sample-create-text-muted))]"
                                    )}
                                  >
                                    {option.label.replace(/^Page /, "")}
                                  </button>
                                )
                              })}
                            </div>
                          ) : null}

                          {visibleActiveErrors.length ? (
                            <div className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>{visibleActiveErrors[0]}</span>
                              </div>
                            </div>
                          ) : null}

                          <div className="rounded-[18px] border border-black/6 bg-[var(--sample-create-editor)] p-4 dark:border-white/8">
                            <Textarea
                              value={activeEditorDraft.content || ""}
                              onChange={(event) => setActiveEditorContent(event.target.value)}
                              placeholder="Write something ..."
                              className="min-h-[126px] resize-none border-0 bg-transparent px-5 py-5 text-[14px] font-normal leading-[1.3] text-[rgb(var(--sample-create-text))] shadow-none placeholder:text-[rgb(var(--sample-create-text-muted))] focus-visible:ring-0"
                            />
                            <div className="border-t border-white/6 px-4 py-3">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <ComposerToolbarButton icon={<ImageIcon className="h-4 w-4" />} label="Insert media" onClick={() => mediaInputRef.current?.click()} />
                                  {shouldShowThumbnailButton ? (
                                    <ComposerToolbarButton icon={<ImagePlus className="h-4 w-4" />} label="Thumbnail" onClick={() => thumbnailInputRef.current?.click()} />
                                  ) : null}
                                  <ComposerToolbarButton icon={<Video className="h-4 w-4" />} label="Video" onClick={() => mediaInputRef.current?.click()} />
                                  <ComposerToolbarButton icon={<CalendarDays className="h-4 w-4" />} label="Date" />
                                  <div className="mx-1 h-[22px] w-px bg-white/10" />
                                  <ComposerToolbarButton icon={<ScanText className="h-4 w-4" />} label="Signature" />
                                  <ComposerToolbarButton icon={<Link2 className="h-4 w-4" />} label="Link" />
                                  <ComposerToolbarButton icon={<Code2 className="h-4 w-4" />} label="Bold" />
                                  <ComposerToolbarButton icon={<SmilePlus className="h-4 w-4" />} label="Emoji" onClick={() => setActiveEditorContent(`${activeEditorDraft.content || ""}${activeEditorDraft.content ? " " : ""}:)`)} />
                                </div>
                                <div className="rounded-[8px] bg-[#ff4747] px-3 py-2 text-[12px] font-semibold text-white">
                                  <span className="text-[#22c55e]">{Math.max(0, 3000 - (activeEditorDraft.content || "").length)}</span>/3000
                                </div>
                              </div>
                            </div>
                          </div>

                          {activeEditorAccount ? (
                            <div className="flex flex-wrap items-center justify-between gap-4 px-0">
                              <Button
                                type="button"
                                onClick={() => mediaInputRef.current?.click()}
                                className="h-[36px] rounded-[9px] bg-[#d82d7e] px-5 text-[14px] font-semibold text-white hover:bg-[#c42778]"
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Add comment / post
                              </Button>
                              <div className="flex flex-wrap items-center gap-5 text-[13px] font-semibold text-[rgb(var(--sample-create-text))]">
                                <div className="inline-flex items-center gap-2">
                                  <span className="h-3 w-3 rounded-full bg-[#ef6cfb]" />
                                  Editing a Specific Network
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setActiveEditorTab("original")}
                                  className="inline-flex items-center gap-2 text-[rgb(var(--sample-create-text))] transition-colors hover:opacity-80"
                                >
                                <RotateCcw className="h-4 w-4" />
                                Back to global
                              </button>
                              </div>
                            </div>
                          ) : null}

                          {shouldShowMediaPanel ? (
                            <MediaPanel
                              draft={activeEditorDraft}
                              showThumbnailUpload={shouldShowThumbnailButton}
                              onUploadMedia={(files) => uploadFiles(activeUploadTarget, files, "media")}
                              onUploadThumbnail={(files) => uploadFiles(activeUploadTarget, files, "thumbnail")}
                              onRemoveMedia={(uploadId) => removeMediaItem(activeUploadTarget, uploadId)}
                              onRemoveThumbnail={() => removeThumbnail(activeUploadTarget)}
                              onAltTextChange={(uploadId, altText) =>
                                activeEditorTab === "original" ? updateGeneralMediaAltText(uploadId, altText) : updateMediaAltText(activeEditorTab, uploadId, altText)
                              }
                              uploading={uploadingTarget === `${activeUploadTarget}:media` || uploadingTarget === `${activeUploadTarget}:thumbnail`}
                            />
                          ) : null}

                          {activeEditorAccount ? (
                            <div className="rounded-[14px] bg-[var(--sample-create-settings)]">
                              <button
                                type="button"
                                onClick={() => setShowSettings((current) => !current)}
                                className={cn(
                                  "flex w-full items-center gap-3 rounded-[14px] bg-[linear-gradient(90deg,#4b16bf_0%,#6d2ff0_100%)] px-4 py-4 text-left text-white",
                                  showSettings ? "rounded-b-none" : ""
                                )}
                              >
                                <div className="flex flex-1 items-center gap-3 text-[14px] font-semibold">
                                  <PlatformBadge platform={activeEditorAccount.platform} className="h-5 w-5" />
                                  <span className="text-[14px]">{activeEditorAccount.displayName || BUNDLE_PLATFORM_LABELS[activeEditorAccount.platform as BundlePlatformId]} Settings</span>
                                </div>
                                <ChevronDown className={cn("h-4 w-4 transition-transform", showSettings ? "rotate-180" : "")} />
                              </button>
                              {showSettings ? (
                                <div className="space-y-3 bg-[var(--sample-create-surface)] p-4">
                                  {visibleActiveSections.length ? (
                                    visibleActiveSections.map((section) => (
                                      <PlatformSectionCard
                                        key={section.id}
                                        section={section}
                                        draft={activeEditorDraft}
                                        account={activeEditorAccount}
                                        onChange={(path, value) => updateAccountValue(activeEditorAccount.id, path, value)}
                                      />
                                    ))
                                  ) : (
                                    <div className="text-[13px] text-[rgb(var(--sample-create-text-muted))]">
                                      No extra settings are available for this platform yet.
                                    </div>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          ) : null}

                          <div className="flex items-center justify-between gap-3 px-4 text-[13px] text-[rgb(var(--sample-create-text-muted))]">
                            <button type="button" onClick={openAiPilot} className="inline-flex items-center gap-2 font-medium text-[#d82d7e]">
                              <Sparkles className="h-4 w-4" />
                              AI assistant
                            </button>
                            <span>{selectedPlatformIds.length} platform{selectedPlatformIds.length === 1 ? "" : "s"} selected</span>
                          </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex w-[48%] min-h-0 flex-col bg-[var(--sample-create-surface)]">
          <div className="flex h-[55px] items-center bg-[var(--sample-create-header)] px-10 text-[20px] font-semibold tracking-[-0.04em] text-[rgb(var(--sample-create-text))] backdrop-blur-[18px]">
            <div className="flex-1">Post Preview</div>
            <button type="button" onClick={onClose} className="text-[rgb(var(--sample-create-text-muted))] transition-colors hover:text-[rgb(var(--sample-create-text))]">
              <X className="h-6 w-6 stroke-[1.75]" />
            </button>
          </div>
          <div className="relative min-h-0 flex-1">
            <div className="absolute inset-0 overflow-y-auto px-4 py-6">
              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  {selectedAccounts.map((accountId) => {
                    const account = accountMap[accountId]
                    if (!account) return null
                    return (
                      <AccountTabButton
                        key={account.id}
                        account={account}
                        active={activePreviewAccountId === account.id}
                        onClick={() => {
                          setActivePreviewAccountId(account.id)
                          setRightPaneMode("preview")
                        }}
                      />
                    )
                  })}
                </div>

                {!selectedAccounts.length ? (
                  <div className="pt-2 text-[15px] font-medium tracking-[-0.02em] text-[rgb(var(--sample-create-text))]">
                    Preview will appear here once an account is selected.
                  </div>
                ) : rightPaneMode === "ai" ? (
                  <div className="space-y-4 rounded-[22px] bg-[var(--sample-create-panel)] p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[18px] font-semibold">AI Pilot</h3>
                      <div className="flex items-center gap-3 text-[rgb(var(--sample-create-text-muted))]">
                        <button type="button"><HelpCircle className="h-5 w-5" /></button>
                        <button type="button" onClick={() => setRightPaneMode("preview")}><X className="h-5 w-5" /></button>
                      </div>
                    </div>
                    <div className="rounded-[12px] bg-[var(--sample-create-panel-strong)] px-5 py-5">
                      <div className="text-[15px] font-medium text-foreground">Generate Content</div>
                      <Textarea value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} placeholder="Describe what you want the AI pilot to write." className="mt-3 min-h-[92px] resize-none border-0 bg-transparent p-0 text-[15px] leading-7 text-muted-foreground shadow-none focus-visible:ring-0" />
                    </div>
                    <div className="rounded-[12px] bg-[var(--sample-create-panel-strong)] p-5">
                      <div className="mb-3 flex items-center gap-2 text-[#d9a300]"><Sparkles className="h-4 w-4" /></div>
                      <div className="whitespace-pre-wrap text-[15px] leading-8 text-foreground">{aiSuggestion || "Open AI Pilot from the composer to generate copy here."}</div>
                      <div className="mt-5 flex flex-wrap items-center gap-3">
                        <Button type="button" onClick={() => { if (!aiSuggestion.trim()) { setAiSuggestion(createAiSuggestion(aiPrompt)); return } setActiveEditorContent(aiSuggestion); setRightPaneMode("preview") }} className="h-9 rounded-[8px] bg-[#2d7ff9] px-5 text-white hover:bg-[#1f6deb]">Insert</Button>
                        <button type="button" onClick={() => setAiSuggestion(createAiSuggestion(aiPrompt || activeEditorDraft.content || generalContent))} className="text-muted-foreground transition-colors hover:text-foreground" title="Regenerate"><Loader2 className="h-4 w-4" /></button>
                        <button type="button" onClick={async () => { if (!aiSuggestion.trim()) return; try { await navigator.clipboard.writeText(aiSuggestion); toast({ title: "Copied", description: "AI copy is on your clipboard.", variant: "success" }) } catch { toast({ title: "Copy failed", description: "Clipboard access is unavailable here.", variant: "destructive" }) } }} className="text-muted-foreground transition-colors hover:text-foreground" title="Copy"><Code2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <AIPillButton label="Rephrase" onClick={() => setAiSuggestion(createAiSuggestion(aiSuggestion || aiPrompt))} />
                      <AIPillButton label="Change Tone" onClick={() => setAiSuggestion(`${(aiSuggestion || aiPrompt).trim()}\n\nTone: more polished, confident, and concise.`.trim())} />
                      <AIPillButton label="Shorten" onClick={() => setAiSuggestion((aiSuggestion || aiPrompt).slice(0, 180).trim())} />
                      <AIPillButton label="Expand" onClick={() => setAiSuggestion(`${(aiSuggestion || aiPrompt).trim()}\n\nAdd a short supporting detail and a CTA.`.trim())} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activePreviewAccount && previewDraft ? (
                      <>
                        <div className="rounded-[18px] border border-white/30 bg-[var(--sample-create-preview-card)] p-4">
                          <PostPreview platform={activePreviewAccount.platform} text={previewDraft.content || ""} images={previewDraft.imageUrls} videoUrl={previewDraft.videoUrl} hashtags={[]} />
                        </div>

                        {visiblePreviewErrors.length || visiblePreviewWarnings.length ? (
                          <div className="rounded-[14px] bg-[var(--sample-create-panel)] px-4 py-3">
                            <div className="mb-3 text-sm font-semibold text-foreground">Validation</div>
                            {visiblePreviewErrors.map((error) => (<div key={error} className="mb-2 flex items-start gap-2 text-sm text-[#b42318] last:mb-0"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>))}
                            {visiblePreviewWarnings.map((warning) => (<div key={warning} className="mb-2 flex items-start gap-2 text-sm text-[#9a6700] last:mb-0"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{warning}</span></div>))}
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div className="pt-2 text-[15px] font-medium tracking-[-0.02em] text-[rgb(var(--sample-create-text))]">
                        Choose an account to preview the post.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[65px] items-center border-t border-[var(--sample-create-border)] bg-[var(--sample-create-footer)] px-10">
        <div className="flex flex-1 items-center gap-3">
          <button
            type="button"
            disabled
            className="inline-flex h-[45px] min-w-[180px] items-center justify-between rounded-[6px] border border-[var(--sample-create-border)] bg-[var(--sample-create-surface-inner)] px-5 text-[15px] font-semibold text-[rgb(var(--sample-create-text))] opacity-90"
          >
            <span className="flex items-center gap-4">
              <Tags className="h-4 w-4" />
              Add New Tag
            </span>
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled
            className="inline-flex h-[45px] min-w-[200px] items-center justify-between rounded-[6px] border border-[var(--sample-create-border)] bg-[var(--sample-create-surface-inner)] px-5 text-[15px] font-semibold text-[rgb(var(--sample-create-text))] opacity-90"
          >
            <span className="flex items-center gap-4">
              <RotateCcw className="h-4 w-4" />
              Repeat Post Every...
            </span>
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center justify-end gap-2">
          <Input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className="h-[45px] min-w-[230px] rounded-[6px] border-[var(--sample-create-border)] bg-[var(--sample-create-surface-inner)] px-5 text-[15px] font-semibold" />
          <button
            type="button"
            disabled={isSavingDrafts || isSubmitting || selectedAccounts.length === 0}
            onClick={() => submitPosts("draft")}
            className="relative flex h-[45px] min-w-[170px] items-center justify-center rounded-[6px] bg-[var(--sample-create-button-simple)] px-7 text-[15px] font-semibold text-[rgb(var(--sample-create-text))] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSavingDrafts ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save as draft"}
          </button>
          <div className="relative">
            <button
              type="button"
              disabled={isSavingDrafts || isSubmitting || selectedAccounts.length === 0}
              onClick={() => setShowPublishMenu((current) => !current)}
              className="flex h-[45px] min-w-[180px] items-center justify-center gap-2 rounded-[6px] bg-[linear-gradient(90deg,#4b16bf_0%,#6d2ff0_100%)] px-7 text-[15px] font-semibold text-[#c8becf] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : scheduledAt ? "Add to calendar" : "Post now"}
              <ChevronDown className="h-4 w-4" />
            </button>
            {showPublishMenu ? (
              <div className="absolute bottom-[calc(100%+10px)] right-0 z-[160] w-[220px] rounded-[14px] border border-white/30 bg-[var(--sample-create-glass)] p-2 shadow-2xl backdrop-blur-[18px]">
                <button
                  type="button"
                  onClick={() => {
                    setShowPublishMenu(false)
                    submitPosts("publish")
                  }}
                  className="w-full rounded-[10px] bg-[#d82d7e] px-4 py-3 text-left text-[14px] font-semibold text-white"
                >
                  Post now
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPublishMenu(false)
                    submitPosts("publish")
                  }}
                  className="mt-2 w-full rounded-[10px] px-4 py-3 text-left text-[14px] font-medium text-white hover:bg-white/5"
                >
                  Schedule
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <input ref={mediaInputRef} type="file" multiple accept="image/*,video/*,application/pdf" className="hidden" onChange={(event) => { if (!event.target.files?.length) return; uploadFiles(activeUploadTarget, event.target.files, "media"); event.target.value = "" }} />
      <input ref={thumbnailInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => { if (!event.target.files?.length) return; uploadFiles(activeUploadTarget, event.target.files, "thumbnail"); event.target.value = "" }} />

      <AlertDialog open={Boolean(pendingRemovalAccount)} onOpenChange={(open) => { if (!open) setPendingRemovalAccount(null) }}>
        <AlertDialogContent className="max-w-[420px] rounded-[18px] border border-white/50 bg-[var(--sample-create-glass)] text-[rgb(var(--sample-create-text))] shadow-2xl backdrop-blur-[18px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[18px] font-semibold text-[rgb(var(--sample-create-text))]">Remove platform?</AlertDialogTitle>
            <AlertDialogDescription className="text-[14px] text-[rgb(var(--sample-create-text-muted))]">
              {pendingRemovalAccount ? `Remove ${pendingRemovalAccount.name} from this post?` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/30 bg-[var(--sample-create-panel)] text-[rgb(var(--sample-create-text))] hover:bg-[var(--sample-create-panel-strong)] hover:text-[rgb(var(--sample-create-text))]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveAccount}
              className="bg-[#ff4d4f] text-white hover:bg-[#e44547]"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
              width={36}
              height={36}
              className="object-cover"
            />
          </div>
          <PlatformBadge
            platform={account.platform}
            className="absolute -bottom-0.5 -right-0.5 z-10 h-3 w-3"
          />
        </div>
      </button>

      {/* Modern Tooltip */}
      <div className="pointer-events-none absolute bottom-full left-1/2 mb-3 w-max -translate-x-1/2 scale-90 transform opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100 z-[110]">
        <div className="flex flex-col items-center rounded-2xl border border-white/30 bg-[var(--sample-create-glass)] p-3 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] backdrop-blur-3xl">
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
          <div className="absolute top-full left-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1.5 rotate-45 border-b border-r border-white/30 bg-[var(--sample-create-glass)]" />
        </div>
      </div>
    </div>
  )
}

function ComposerToolbarButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return <button type="button" onClick={onClick} title={label} className="flex h-[34px] w-[34px] items-center justify-center rounded-[8px] bg-[#2d2b2c] text-[#dedede] transition-colors hover:bg-[#383536] hover:text-white">{icon}</button>
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
    <span className={cn("relative flex items-center justify-center overflow-hidden shrink-0", className)}>
      {iconSrc ? (
        <Image src={iconSrc} alt={platform} fill sizes="20px" className="object-contain" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[9px] font-bold text-primary uppercase">
          {platform.slice(0, 1)}
        </span>
      )}
    </span>
  )
}

function MediaPanel({
  draft,
  showThumbnailUpload,
  onUploadMedia,
  onUploadThumbnail,
  onRemoveMedia,
  onRemoveThumbnail,
  onAltTextChange,
  uploading,
}: {
  draft: DraftState
  showThumbnailUpload: boolean
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
    <div className="space-y-4 rounded-[18px] border border-white/30 bg-[var(--sample-create-panel)] p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/20 pb-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[rgb(var(--sample-create-text-muted))]">Media Assets</p>
          <p className="mt-0.5 text-[12px] text-[rgb(var(--sample-create-text-muted))]">Upload images, video, or PDF files.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-[10px] border-white/30 bg-[var(--sample-create-panel-strong)] px-4 text-[13px] font-bold text-[rgb(var(--sample-create-text))] transition-all hover:bg-white/80 hover:text-[rgb(var(--sample-create-text))]"
            onClick={() => mediaInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4 text-primary" />
            Add Media
          </Button>
          {showThumbnailUpload ? (
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-[10px] border-white/30 bg-[var(--sample-create-panel-strong)] px-4 text-[13px] font-bold text-[rgb(var(--sample-create-text))] transition-all hover:bg-white/80 hover:text-[rgb(var(--sample-create-text))]"
              onClick={() => thumbnailInputRef.current?.click()}
            >
              <ImagePlus className="mr-2 h-4 w-4 text-primary" />
              Thumbnail
            </Button>
          ) : null}
          {uploading ? (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary dark:bg-white/5">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            </div>
          ) : null}
        </div>
      </div>

      {draft.thumbnailMedia ? (
        <div className="rounded-xl border border-white/20 bg-[var(--sample-create-panel-strong)] p-3 shadow-sm">
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
            <div key={item.uploadId} className="rounded-xl border border-white/20 bg-[var(--sample-create-panel-strong)] p-3 shadow-sm transition-all hover:border-primary/30">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--sample-create-surface)] text-muted-foreground">
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
                    className="h-8 rounded-lg border-white/20 bg-[var(--sample-create-surface)] text-[12px] placeholder:text-muted-foreground focus:border-primary"
                  />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <input ref={mediaInputRef} type="file" multiple accept="image/*,video/*,application/pdf" className="hidden" onChange={(event) => event.target.files && onUploadMedia(event.target.files)} />
      <input ref={thumbnailInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => event.target.files && onUploadThumbnail(event.target.files)} />
    </div>
  )
}

function PlatformSectionCard({ section, draft, account, onChange }: { section: BundlePlatformSection; draft: DraftState; account: SocialAccount; onChange: (path: string, value: DraftValue) => void }) {
  return (
    <div className="rounded-[16px] border border-white/25 bg-[var(--sample-create-panel)] shadow-sm">
      <div className="border-b border-white/20 bg-[var(--sample-create-panel-strong)] px-4 py-3">
        <h3 className="text-[14px] font-bold uppercase tracking-wide text-[rgb(var(--sample-create-text))]">{section.title}</h3>
        {section.description && <p className="mt-0.5 text-[12px] text-[rgb(var(--sample-create-text-muted))]">{section.description}</p>}
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
      <Label className="px-1 text-[11px] font-bold uppercase tracking-wider text-[rgb(var(--sample-create-text-muted))]">{field.label}</Label>
      {field.type === "textarea" ? (
        <Textarea 
          value={asText(value)} 
          onChange={(event) => onChange(event.target.value)} 
          placeholder={field.placeholder} 
          rows={field.rows || 3} 
          className="rounded-xl border-white/20 bg-[var(--sample-create-panel-strong)] text-[13px] text-[rgb(var(--sample-create-text))] transition-all focus:border-primary focus:ring-4 focus:ring-primary/5" 
        />
      ) : null}
      {field.type === "text" ? (
        availableChannelOptions.length ? (
          <Select value={asText(value) || undefined} onValueChange={onChange}>
            <SelectTrigger className="h-10 rounded-xl border-white/20 bg-[var(--sample-create-panel-strong)] px-4 text-[13px] text-[rgb(var(--sample-create-text))] transition-all">
              <SelectValue placeholder={field.placeholder || "Select an option"} />
            </SelectTrigger>
            <SelectContent className="z-[200]">
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
            className="h-10 rounded-xl border-white/20 bg-[var(--sample-create-panel-strong)] px-4 text-[13px] text-[rgb(var(--sample-create-text))] transition-all placeholder:text-[rgb(var(--sample-create-text-muted))] focus:border-[#7c4dff] focus:ring-4 focus:ring-[#7c4dff]/10" 
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
          className="h-10 rounded-xl border-white/20 bg-[var(--sample-create-panel-strong)] px-4 text-[13px] text-[rgb(var(--sample-create-text))] transition-all placeholder:text-[rgb(var(--sample-create-text-muted))] focus:border-[#7c4dff] focus:ring-4 focus:ring-[#7c4dff]/10" 
        />
      ) : null}
      {field.type === "date" ? (
        <Input 
          type="datetime-local" 
          value={asText(value)} 
          onChange={(event) => onChange(event.target.value)} 
          className="h-10 rounded-xl border-white/20 bg-[var(--sample-create-panel-strong)] px-4 text-[13px] text-[rgb(var(--sample-create-text))] transition-all focus:border-[#7c4dff] focus:ring-4 focus:ring-[#7c4dff]/10" 
        />
      ) : null}
      {field.type === "switch" ? (
        <div className="flex items-center justify-between rounded-xl border border-white/20 bg-[var(--sample-create-panel-strong)] px-4 py-3 shadow-sm">
          <span className="text-[13px] font-medium text-[rgb(var(--sample-create-text))]">{field.description || field.label}</span>
          <Switch checked={Boolean(value)} onCheckedChange={onChange} />
        </div>
      ) : null}
      {field.type === "select" ? (
        <Select value={asText(value) || undefined} onValueChange={onChange}>
          <SelectTrigger className="h-10 rounded-xl border-white/20 bg-[var(--sample-create-panel-strong)] px-4 text-[13px] text-[rgb(var(--sample-create-text))] transition-all">
            <SelectValue placeholder={field.placeholder || "Select an option"} />
          </SelectTrigger>
          <SelectContent className="z-[200]">
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
      {field.description && field.type !== "switch" ? <p className="mt-1.5 text-[11px] font-medium text-[rgb(var(--sample-create-text-muted))]">{field.description}</p> : null}
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

