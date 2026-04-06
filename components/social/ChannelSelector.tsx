import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle2 } from 'lucide-react'

interface Channel {
  id: string
  name: string
}

interface ChannelSelectorProps {
  isOpen: boolean
  onClose: () => void
  platform: string
  channels: Channel[]
  onSuccess: () => void
}

export function ChannelSelector({
  isOpen,
  onClose,
  platform,
  channels,
  onSuccess,
}: ChannelSelectorProps) {
  const [selectedChannelId, setSelectedChannelId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    if (!selectedChannelId) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/social/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set-channel',
          platform,
          channelId: selectedChannelId,
        }),
      })

      const data = await response.json()

      if (data.success) {
        onSuccess()
        onClose()
      } else {
        throw new Error(data.error || 'Failed to select channel')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            Complete {platform} Setup
          </DialogTitle>
          <DialogDescription>
            Select the specific channel or organization you want to use for publishing.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-xs border border-red-100">
              {error}
            </div>
          )}

          <RadioGroup
            value={selectedChannelId}
            onValueChange={setSelectedChannelId}
            className="space-y-3"
          >
            {channels.map((channel) => (
              <div
                key={channel.id}
                className={`flex items-center space-x-3 space-y-0 rounded-2xl border p-4 transition-all hover:bg-slate-50 cursor-pointer ${
                  selectedChannelId === channel.id
                    ? 'border-indigo-500 bg-indigo-50/50'
                    : 'border-slate-200'
                }`}
                onClick={() => setSelectedChannelId(channel.id)}
              >
                <RadioGroupItem value={channel.id} id={channel.id} />
                <Label
                  htmlFor={channel.id}
                  className="flex-1 font-medium cursor-pointer"
                >
                  {channel.name}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedChannelId || loading}
            className="rounded-xl min-w-[100px]"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
