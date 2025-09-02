import { cn } from "@/lib/utils"

export function LogoMark({ className }: { className?: string }) {
  // Bold, geometric "C" + bolt that suggests energy/creation; name can evolve later
  return (
    <div className={cn("relative", className)} aria-label="Brand mark">
      <div className="size-9 rounded-xl gradient-primary shadow-modern-lg" />
      <svg className="absolute inset-0 m-auto" width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M8 6a6 6 0 1 1 0 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M12.5 9.5L11 13h3l-1.5 3" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  )
}

