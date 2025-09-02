// Social platform connection card component placeholder

interface PlatformCardProps {
  platform: string
  connected: boolean
  onConnect: () => void
  onDisconnect: () => void
}

export function PlatformCard({ platform, connected, onConnect, onDisconnect }: PlatformCardProps) {
  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-semibold">{platform}</h3>
      <p className="text-sm text-muted-foreground">
        {connected ? "Connected" : "Not connected"}
      </p>
      <button 
        onClick={connected ? onDisconnect : onConnect}
        className="mt-2 text-sm text-blue-600 hover:underline"
      >
        {connected ? "Disconnect" : "Connect"}
      </button>
    </div>
  )
}
