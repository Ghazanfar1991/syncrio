import { Sparkles } from "lucide-react"

export function MarketingFooter() {
  return (
    <footer className="border-t border-border/50 bg-muted/30 py-12">
      <div className="container mx-auto px-6">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              ConversAI Social
            </span>
          </div>
          <p className="text-muted-foreground">© 2025 ConversAI Social. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

