"use client"

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"

import { SampleCreatePostComposer } from "@/components/create-post/modal/sample-create-post-composer"

interface CreatePostModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreatePostModal({ open, onOpenChange }: CreatePostModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="[&>button]:hidden max-h-[calc(100vh-24px)] w-[calc(100vw-24px)] max-w-[1500px] overflow-visible rounded-[24px] border border-white/50 bg-[var(--sample-create-glass)] p-0 shadow-[0_24px_60px_rgba(0,0,0,0.28)] backdrop-blur-[18px]">
        <DialogTitle className="sr-only">Create Post</DialogTitle>
        <DialogDescription className="sr-only">
          Create a new post with shared content, per-platform customization, preview, scheduling, and upload support.
        </DialogDescription>
        <SampleCreatePostComposer onCompleted={() => onOpenChange(false)} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
