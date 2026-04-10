"use client"

import React from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  Clock3,
  Code2,
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

export function BundleComposer() {
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

  const totalErrors = React.useMemo(
    () => Object.values(validationByAccount).reduce((count, result) => count + result.errors.length, 0),
    [validationByAccount]
  )

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
    [accountMap, buildRequestBody, queryClient, scheduledAt, selectedAccounts, toast, validationByAccount]
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
    <div className="px-5 pb-5">
      <div className="rounded-[24px] bg-[#f3f4f6] p-4 md:p-6">
        <div className="mb-5 flex flex-wrap items-center gap-3">
            {accounts.map((account) => {
              const selected = selectedAccounts.includes(account.id)
              const requiresChannel = getIntegrationChannelSelectionState(account)

            return (
              <button
                key={account.id}
                type="button"
                disabled={requiresChannel}
                onClick={() => toggleAccount(account.id)}
                className={cn(
                  "relative rounded-full transition-all",
                  requiresChannel ? "cursor-not-allowed opacity-45" : selected ? "opacity-100" : "opacity-60 hover:opacity-100"
                )}
                title={requiresChannel ? `${account.accountName} requires channel setup` : account.accountName}
              >
                <Avatar className={cn("h-11 w-11 border-2 bg-white", selected ? "border-[#2d7ff9]" : "border-white")}>
                  <AvatarImage src={account.avatarUrl} alt={account.accountName} />
                  <AvatarFallback className="bg-[#edf3ff] text-[11px] font-semibold text-[#2d7ff9]">
                    {(account.displayName || account.accountName || account.platform).slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 rounded-full border border-white bg-white px-1.5 py-0.5 text-[9px] font-semibold text-[#3f4854] shadow-sm">
                  {account.platform.slice(0, 2)}
                </span>
              </button>
            )
          })}

          <div className="ml-auto flex items-center gap-2 text-xs text-[#6b7280]">
            <span>{selectedAccounts.length} selected</span>
            {totalErrors > 0 ? (
              <span className="rounded-full bg-[#fdecec] px-2 py-1 font-medium text-[#b42318]">
                {totalErrors} issue{totalErrors === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.28fr_0.92fr]">
          <section className="rounded-[20px] border border-[#e6e9ef] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
            <div className="border-b border-[#edf0f4] px-5 pt-4">
              <div className="flex items-end gap-2 overflow-x-auto pb-0">
                <button
                  type="button"
                  onClick={() => setActiveEditorTab("original")}
                  className={cn(
                    "rounded-t-[10px] border px-5 py-3 text-[15px] font-medium transition-colors",
                    activeEditorTab === "original"
                      ? "border-[#cdddfd] border-b-white bg-white text-[#222b38]"
                      : "border-transparent bg-transparent text-[#6b7280] hover:text-[#222b38]"
                  )}
                >
                  Original Draft
                </button>

                {selectedAccounts.map((accountId) => {
                  const account = accountMap[accountId]
                  if (!account) return null
                  return <AccountTabButton key={account.id} account={account} active={activeEditorTab === account.id} onClick={() => setActiveEditorTab(account.id)} />
                })}
              </div>
            </div>
            <div className="p-5">
              {!selectedAccounts.length ? (
                <div className="flex min-h-[540px] items-center justify-center rounded-[14px] border border-dashed border-[#d8dde6] bg-[#fafbfc] p-8 text-center">
                  <div className="max-w-sm space-y-3">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#eef4ff] text-[#2d7ff9]">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-semibold text-[#1f2937]">Select at least one connected account</h3>
                    <p className="text-sm leading-6 text-[#6b7280]">Choose destinations above, then tailor the post with shared content, media, and platform-specific fields.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {activeEditorAccount && activeTypeField ? (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {(activeTypeField.options || []).map((option) => {
                          const currentValue = asText(getNestedValue(activeEditorDraft, activeTypeField.key)) || activeTypeField.options?.[0]?.value
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => updateAccountValue(activeEditorAccount.id, activeTypeField.key, option.value)}
                              className={cn(
                                "rounded-[6px] border px-4 py-2 text-sm font-medium transition-colors",
                                currentValue === option.value
                                  ? "border-[#2d7ff9] bg-[#2d7ff9] text-white"
                                  : "border-[#d6dbe3] bg-white text-[#6b7280] hover:border-[#aeb7c3] hover:text-[#1f2937]"
                              )}
                            >
                              {option.label.replace(/^Page /, "")}
                            </button>
                          )
                        })}
                      </div>

                      {activeAccountValidation.errors.length ? (
                        <div className="rounded-[10px] border border-[#f5d0d0] bg-[#fff4f4] px-4 py-3 text-sm text-[#b42318]">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <div>
                              <div className="font-medium">Fix these platform issues before publishing</div>
                              <div className="mt-1">{activeAccountValidation.errors[0]}</div>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="rounded-[10px] border border-[#cfdcf7] bg-white">
                    <Textarea
                      value={activeEditorDraft.content || ""}
                      onChange={(event) => setActiveEditorContent(event.target.value)}
                      placeholder="Start writing post caption or ? Generate with AI Pilot"
                      className="min-h-[250px] resize-none border-0 px-4 py-4 text-[18px] leading-8 text-[#222b38] shadow-none placeholder:text-[#8b93a1] focus-visible:ring-0"
                    />

                    <div className="border-t border-[#edf0f4] px-4 py-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-1">
                          <ComposerToolbarButton icon={<ImageIcon className="h-4 w-4" />} label="Add media" onClick={() => mediaInputRef.current?.click()} />
                          <ComposerToolbarButton icon={<Upload className="h-4 w-4" />} label="Thumbnail" onClick={() => thumbnailInputRef.current?.click()} />
                          <ComposerToolbarButton icon={<SmilePlus className="h-4 w-4" />} label="Emoji" onClick={() => setActiveEditorContent(`${activeEditorDraft.content || ""}${activeEditorDraft.content ? " " : ""}??`)} />
                          <ComposerToolbarButton icon={<Video className="h-4 w-4" />} label="Media" onClick={() => mediaInputRef.current?.click()} />
                          <ComposerToolbarButton icon={<Code2 className="h-4 w-4" />} label="Code" />
                          <ComposerToolbarButton icon={<Link2 className="h-4 w-4" />} label="UTM" />
                          <ComposerToolbarButton icon={<Hash className="h-4 w-4" />} label="Hashtags" onClick={() => setActiveEditorContent(`${activeEditorDraft.content || ""}${activeEditorDraft.content ? " " : ""}#`)} />
                          <ComposerToolbarButton icon={<ScanText className="h-4 w-4" />} label="Formatting" />
                          <button type="button" onClick={openAiPilot} className="ml-2 flex h-10 w-10 items-center justify-center rounded-[12px] border border-[#e6c861] bg-white text-[#d9a300] transition-colors hover:bg-[#fff9df]" title="Open AI Pilot">
                            <Sparkles className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="text-sm text-[#6b7280]">{(activeEditorDraft.content || "").length}</div>
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
                    <div className="rounded-[12px] border border-[#edf0f4] bg-[#fafbfc] px-4 py-4 text-sm text-[#667085]">
                      Shared content and shared media will flow into {selectedPlatformIds.length} selected platform{selectedPlatformIds.length === 1 ? "" : "s"}. Open a platform tab to tune its extra fields.
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    <button type="button" className="flex items-center gap-2 text-[#2563eb] transition-colors hover:text-[#1d4ed8]">
                      <Link2 className="h-4 w-4 rotate-45" />
                      Add Tags
                    </button>
                    <button type="button" className="flex items-center gap-2 text-[#2563eb] transition-colors hover:text-[#1d4ed8]">
                      Connect Shortener
                      <X className="h-3.5 w-3.5 text-[#8b93a1]" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-4 border-t border-[#edf0f4] pt-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                      <Label className="text-sm font-medium text-[#4b5563]">Schedule</Label>
                      <Input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className="h-11 w-full max-w-[260px] rounded-[8px] border-[#d7dde6] bg-white text-[#1f2937]" />
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button type="button" variant="outline" disabled={isSavingDrafts || isSubmitting} onClick={() => submitPosts("draft")} className="h-11 rounded-[8px] border-[#8fb6ff] px-6 text-[#6b8fd9] hover:bg-[#f7fbff]">
                        {isSavingDrafts ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock3 className="mr-2 h-4 w-4" />}
                        Save as Draft
                        <ChevronDown className="ml-3 h-4 w-4" />
                      </Button>
                      <Button type="button" disabled={isSavingDrafts || isSubmitting} onClick={() => submitPosts("publish")} className="h-11 rounded-[8px] bg-[#8cb6ff] px-6 font-medium text-white hover:bg-[#75a5fb]">
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarClock className="mr-2 h-4 w-4" />}
                        {scheduledAt ? "Schedule Post" : "Queue Post"}
                        <ChevronDown className="ml-3 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[20px] border border-[#e6e9ef] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
            <div className="border-b border-[#edf0f4] px-5 pt-4">
              <div className="flex items-end gap-2 overflow-x-auto pb-0">
                {selectedAccounts.map((accountId) => {
                  const account = accountMap[accountId]
                  if (!account) return null
                  return <AccountTabButton key={account.id} account={account} active={activePreviewAccountId === account.id} onClick={() => { setActivePreviewAccountId(account.id); setRightPaneMode("preview") }} />
                })}
              </div>
            </div>

            {!selectedAccounts.length ? (
              <div className="flex min-h-[760px] items-center justify-center p-8 text-center text-sm text-[#6b7280]">Preview will appear here once an account is selected.</div>
            ) : rightPaneMode === "ai" ? (
              <div className="min-h-[760px]">
                <div className="flex items-center justify-between border-b border-[#edf0f4] px-5 py-4">
                  <h3 className="text-[18px] font-semibold text-[#202939]">AI Pilot</h3>
                  <div className="flex items-center gap-3 text-[#6b7280]">
                    <button type="button" className="transition-colors hover:text-[#202939]"><HelpCircle className="h-5 w-5" /></button>
                    <button type="button" className="transition-colors hover:text-[#202939]" onClick={() => setRightPaneMode("preview")}><X className="h-6 w-6" /></button>
                  </div>
                </div>

                <div className="space-y-5 p-5">
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#6b7280]">You</div>
                    <div className="rounded-[12px] bg-[#eef4ff] px-5 py-5">
                      <div className="text-[15px] font-medium text-[#1f2937]">Generate Content</div>
                      <Textarea value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} placeholder="Describe what you want the AI pilot to write." className="mt-3 min-h-[92px] resize-none border-0 bg-transparent p-0 text-[15px] leading-7 text-[#475467] shadow-none focus-visible:ring-0" />
                    </div>
                  </div>

                  <div className="rounded-[14px] border border-[#ebeef3] bg-white p-5 shadow-sm">
                    <div className="mb-3 flex items-center gap-2 text-[#d9a300]"><Sparkles className="h-4 w-4" /></div>
                    <div className="whitespace-pre-wrap text-[15px] leading-8 text-[#313b4a]">{aiSuggestion || "Open AI Pilot from the composer to generate copy here."}</div>
                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <Button type="button" onClick={() => { if (!aiSuggestion.trim()) { setAiSuggestion(createAiSuggestion(aiPrompt)); return } setActiveEditorContent(aiSuggestion); setRightPaneMode("preview") }} className="h-9 rounded-[8px] bg-[#2d7ff9] px-5 text-white hover:bg-[#1f6deb]">Insert</Button>
                      <button type="button" onClick={() => setAiSuggestion(createAiSuggestion(aiPrompt || activeEditorDraft.content || generalContent))} className="text-[#667085] transition-colors hover:text-[#1f2937]" title="Regenerate"><Loader2 className="h-4 w-4" /></button>
                      <button type="button" onClick={async () => { if (!aiSuggestion.trim()) return; try { await navigator.clipboard.writeText(aiSuggestion); toast({ title: "Copied", description: "AI copy is on your clipboard.", variant: "success" }) } catch { toast({ title: "Copy failed", description: "Clipboard access is unavailable here.", variant: "destructive" }) } }} className="text-[#667085] transition-colors hover:text-[#1f2937]" title="Copy"><Code2 className="h-4 w-4" /></button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <AIPillButton label="Rephrase" onClick={() => setAiSuggestion(createAiSuggestion(aiSuggestion || aiPrompt))} />
                    <AIPillButton label="Change Tone" onClick={() => setAiSuggestion(`${(aiSuggestion || aiPrompt).trim()}\n\nTone: more polished, confident, and concise.`.trim())} />
                    <AIPillButton label="Shorten" onClick={() => setAiSuggestion((aiSuggestion || aiPrompt).slice(0, 180).trim())} />
                    <AIPillButton label="Expand" onClick={() => setAiSuggestion(`${(aiSuggestion || aiPrompt).trim()}\n\nAdd a short supporting detail and a CTA.`.trim())} />
                    <AIPillButton label="Translate" onClick={() => setAiSuggestion(`English:\n${(aiSuggestion || aiPrompt).trim()}\n\nSpanish:\nTraduce esta version con el mismo tone.`)} />
                    <AIPillButton label="Generate Hashtags" onClick={() => setAiSuggestion(`${(aiSuggestion || aiPrompt).trim()}\n\n#Marketing #ContentStrategy #SocialMedia`.trim())} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="min-h-[760px] p-5">
                {activePreviewAccount && previewDraft ? (
                  <div className="space-y-4">
                    <div className="rounded-[12px] border border-[#edf0f4] bg-white p-4">
                      <PostPreview platform={activePreviewAccount.platform} text={previewDraft.content || ""} images={previewDraft.imageUrls} videoUrl={previewDraft.videoUrl} hashtags={[]} />
                    </div>
                    <div className="rounded-[12px] border border-[#f2e3b3] bg-[#fdf7ea] px-5 py-4 text-[14px] leading-7 text-[#6a5730]">
                      <div className="mb-2 text-[16px] font-semibold text-[#6a5730]">Network Preview</div>
                      Preview approximates how your content will display when published. Tests and updates by social networks may affect the final appearance. Custom tags may also be replaced with account-specific values before delivery.
                    </div>
                    {previewValidation?.errors?.length || previewValidation?.warnings?.length ? (
                      <div className="rounded-[12px] border border-[#edf0f4] bg-[#fafbfc] px-5 py-4">
                        <div className="mb-3 text-sm font-semibold text-[#1f2937]">Validation</div>
                        {previewValidation.errors.map((error) => (<div key={error} className="mb-2 flex items-start gap-2 text-sm text-[#b42318] last:mb-0"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>))}
                        {previewValidation.warnings.map((warning) => (<div key={warning} className="mb-2 flex items-start gap-2 text-sm text-[#9a6700] last:mb-0"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{warning}</span></div>))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex min-h-[700px] items-center justify-center text-sm text-[#6b7280]">Choose an account to preview the post.</div>
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
    <button type="button" onClick={onClick} className={cn("relative rounded-t-[10px] border px-3 py-2 transition-colors", active ? "border-[#cdddfd] border-b-white bg-white" : "border-transparent bg-transparent hover:bg-[#f8fafc]")} title={account.accountName}>
      <Avatar className="h-10 w-10 border border-[#dbe4f2] bg-white">
        <AvatarImage src={account.avatarUrl} alt={account.accountName} />
        <AvatarFallback className="bg-[#edf3ff] text-[11px] font-semibold text-[#2d7ff9]">{(account.displayName || account.accountName || account.platform).slice(0, 2)}</AvatarFallback>
      </Avatar>
      <span className="absolute -bottom-0.5 -right-0.5 rounded-full border border-white bg-white px-1.5 py-0.5 text-[9px] font-semibold text-[#3f4854] shadow-sm">{account.platform.slice(0, 2)}</span>
    </button>
  )
}

function ComposerToolbarButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return <button type="button" onClick={onClick} title={label} className="flex h-9 w-9 items-center justify-center rounded-[8px] text-[#7b8494] transition-colors hover:bg-[#f5f7fa] hover:text-[#202939]">{icon}</button>
}

function AIPillButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="rounded-full border border-[#e3e7ee] bg-white px-4 py-2 text-[15px] text-[#414a59] transition-colors hover:bg-[#f8fafc]">{label}</button>
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
    <div className="space-y-3 rounded-[12px] border border-[#e6e9ef] bg-[#fafbfc] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#667085]">Media bundle</p>
          <p className="text-sm text-[#667085]">Upload images, video, PDF files, and an optional thumbnail.</p>
        </div>
        {uploading ? <Loader2 className="h-4 w-4 animate-spin text-[#475467]" /> : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="rounded-[8px]" onClick={() => mediaInputRef.current?.click()}><Upload className="mr-2 h-4 w-4" />Add media</Button>
        <Button type="button" variant="outline" className="rounded-[8px]" onClick={() => thumbnailInputRef.current?.click()}><ImagePlus className="mr-2 h-4 w-4" />Thumbnail</Button>
      </div>

      {draft.thumbnailMedia ? (
        <div className="rounded-[10px] border border-[#dde3ec] bg-white p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[#1f2937]">Thumbnail ready</p>
              <p className="text-xs text-[#667085]">{draft.thumbnailMedia.fileName || "Uploaded image"}</p>
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onRemoveThumbnail}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
      ) : null}

      {media.length ? (
        <div className="space-y-3">
          {media.map((item) => (
            <div key={item.uploadId} className="rounded-[10px] border border-[#dde3ec] bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#1f2937]">{item.fileName || item.uploadId}</p>
                  <p className="text-xs text-[#667085]">{item.kind} · {(item.fileSize / 1024 / 1024).toFixed(2)} MB{item.width && item.height ? ` · ${item.width}×${item.height}` : ""}{typeof item.duration === "number" ? ` · ${item.duration.toFixed(1)}s` : ""}</p>
                </div>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => onRemoveMedia(item.uploadId)}><Trash2 className="h-4 w-4" /></Button>
              </div>
              {item.kind !== "PDF" ? (
                <div className="mt-3 space-y-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#667085]">Alt text</Label>
                  <Input value={item.altText || ""} onChange={(event) => onAltTextChange(item.uploadId, event.target.value)} placeholder={`Accessibility text for ${platform ? BUNDLE_PLATFORM_LABELS[platform] : "this asset"}`} className="rounded-[8px] border-[#d7dde6] bg-[#fafbfc]" />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[10px] border border-dashed border-[#d5dbe5] px-4 py-6 text-center text-sm text-[#667085]">No media added yet.</div>
      )}

      <input ref={mediaInputRef} type="file" multiple accept="image/*,video/*,application/pdf" className="hidden" onChange={(event) => event.target.files && onUploadMedia(event.target.files)} />
      <input ref={thumbnailInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => event.target.files && onUploadThumbnail(event.target.files)} />
    </div>
  )
}

function PlatformSectionCard({ section, draft, account, onChange }: { section: BundlePlatformSection; draft: DraftState; account: SocialAccount; onChange: (path: string, value: DraftValue) => void }) {
  return (
    <div className="rounded-[12px] border border-[#e6e9ef] bg-[#fafbfc] p-4">
      <div className="mb-4">
        <h3 className="text-[15px] font-semibold text-[#1f2937]">{section.title}</h3>
        <p className="mt-1 text-sm text-[#667085]">{section.description}</p>
      </div>
      <div className="space-y-4">
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
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-[0.18em] text-[#667085]">{field.label}</Label>
      {field.type === "textarea" ? <Textarea value={asText(value)} onChange={(event) => onChange(event.target.value)} placeholder={field.placeholder} rows={field.rows || 3} className="rounded-[8px] border-[#d7dde6] bg-white" /> : null}
      {field.type === "text" ? (availableChannelOptions.length ? <Select value={asText(value) || undefined} onValueChange={onChange}><SelectTrigger className="rounded-[8px] border-[#d7dde6] bg-white"><SelectValue placeholder={field.placeholder || "Select an option"} /></SelectTrigger><SelectContent>{availableChannelOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select> : <Input value={asText(value)} onChange={(event) => onChange(event.target.value)} placeholder={field.placeholder} className="rounded-[8px] border-[#d7dde6] bg-white" />) : null}
      {field.type === "number" ? <Input type="number" value={asNumberInput(value)} min={field.min} max={field.max} step={field.step || "any"} onChange={(event) => onChange(event.target.value === "" ? undefined : Number(event.target.value))} placeholder={field.placeholder} className="rounded-[8px] border-[#d7dde6] bg-white" /> : null}
      {field.type === "date" ? <Input type="datetime-local" value={asText(value)} onChange={(event) => onChange(event.target.value)} className="rounded-[8px] border-[#d7dde6] bg-white" /> : null}
      {field.type === "switch" ? <div className="flex items-center justify-between rounded-[8px] border border-[#d7dde6] bg-white px-4 py-3"><span className="text-sm text-[#344054]">{field.description || field.label}</span><Switch checked={Boolean(value)} onCheckedChange={onChange} /></div> : null}
      {field.type === "select" ? <Select value={asText(value) || undefined} onValueChange={onChange}><SelectTrigger className="rounded-[8px] border-[#d7dde6] bg-white"><SelectValue placeholder={field.placeholder || "Select an option"} /></SelectTrigger><SelectContent>{(field.options || []).map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select> : null}
      {field.type === "multiselect" ? <div className="flex flex-wrap gap-2 rounded-[8px] border border-[#d7dde6] bg-white p-3">{(field.options || []).map((option) => { const selectedValues = asStringArray(value); const selected = selectedValues.includes(option.value); return <button key={option.value} type="button" onClick={() => onChange(selected ? selectedValues.filter((current) => current !== option.value) : [...selectedValues, option.value])} className={cn("rounded-full border px-3 py-1.5 text-xs font-medium transition-colors", selected ? "border-[#8fb6ff] bg-[#edf4ff] text-[#1d4ed8]" : "border-[#d7dde6] bg-white text-[#475467] hover:border-[#aab4c2]")}>{option.label}</button> })}</div> : null}
      {field.type === "tags" ? <Input value={asStringArray(value).join(", ")} onChange={(event) => onChange(event.target.value.split(",").map((item) => item.trim()).filter(Boolean))} placeholder={field.placeholder ? `${field.placeholder}, ${field.placeholder}` : "value, value"} className="rounded-[8px] border-[#d7dde6] bg-white" /> : null}
      {field.type === "object-list" ? <ObjectListEditor value={Array.isArray(value) ? (value as Array<Record<string, DraftValue>>) : []} columns={field.columns || []} onChange={onChange} /> : null}
      {field.description && field.type !== "switch" ? <p className="text-xs text-[#667085]">{field.description}</p> : null}
    </div>
  )
}

function ObjectListEditor({ value, columns, onChange }: { value: Array<Record<string, DraftValue>>; columns: NonNullable<BundlePlatformField["columns"]>; onChange: (value: Array<Record<string, DraftValue>>) => void }) {
  return (
    <div className="space-y-3 rounded-[8px] border border-[#d7dde6] bg-white p-3">
      {value.map((row, index) => (
        <div key={index} className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
          {columns.map((column) => (
            <Input key={column.key} type={column.type === "number" ? "number" : "text"} value={column.type === "number" ? asNumberInput(row[column.key]) : asText(row[column.key])} min={column.min} max={column.max} step={column.type === "number" ? "any" : undefined} placeholder={column.placeholder} onChange={(event) => { const next = [...value]; next[index] = { ...row, [column.key]: column.type === "number" ? event.target.value === "" ? undefined : Number(event.target.value) : event.target.value }; onChange(next) }} className="rounded-[8px] border-[#d7dde6] bg-[#fafbfc]" />
          ))}
          <Button type="button" variant="ghost" size="icon" className="h-10 w-10" onClick={() => onChange(value.filter((_, currentIndex) => currentIndex !== index))}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
      <Button type="button" variant="outline" className="rounded-[8px]" onClick={() => onChange([...value, {}])}><Plus className="mr-2 h-4 w-4" />Add item</Button>
    </div>
  )
}

