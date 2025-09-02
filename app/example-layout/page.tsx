"use client"

import { useState } from "react"
import { UnifiedLayout } from "@/components/layout/unified-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function ExampleLayoutPage() {
  const [showSidebarSections, setShowSidebarSections] = useState({
    connectedAccounts: true,
    planInfo: true
  })

  return (
    <UnifiedLayout 
      pageTitle="Layout Example"
      showNewPostButton={true}
      showConnectedAccounts={showSidebarSections.connectedAccounts}
      showPlanInfo={showSidebarSections.planInfo}
    >
      <div className="space-y-6">
        {/* Introduction */}
        <Card>
          <CardHeader>
            <CardTitle>New Unified Layout System</CardTitle>
            <CardDescription>
              This page demonstrates the new sidebar and layout components that can be used across all pages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              The new system provides:
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Badge variant="secondary">✓</Badge>
                Universal theme switching that affects the entire app
              </li>
              <li className="flex items-center gap-2">
                <Badge variant="secondary">✓</Badge>
                Consistent sidebar navigation across all pages
              </li>
              <li className="flex items-center gap-2">
                <Badge variant="secondary">✓</Badge>
                Configurable sidebar sections (connected accounts, plan info)
              </li>
              <li className="flex items-center gap-2">
                <Badge variant="secondary">✓</Badge>
                Collapsible sidebar with smooth animations
              </li>
              <li className="flex items-center gap-2">
                <Badge variant="secondary">✓</Badge>
                Responsive design that works on all screen sizes
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Configuration Options */}
        <Card>
          <CardHeader>
            <CardTitle>Sidebar Configuration</CardTitle>
            <CardDescription>
              Customize which sections appear in the sidebar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Connected Accounts Section</p>
                <p className="text-sm text-muted-foreground">
                  Shows your connected social media accounts
                </p>
              </div>
              <Button
                variant={showSidebarSections.connectedAccounts ? "default" : "outline"}
                onClick={() => setShowSidebarSections(prev => ({
                  ...prev,
                  connectedAccounts: !prev.connectedAccounts
                }))}
              >
                {showSidebarSections.connectedAccounts ? "Hide" : "Show"}
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Plan Information Section</p>
                <p className="text-sm text-muted-foreground">
                  Shows your current subscription plan and upgrade options
                </p>
              </div>
              <Button
                variant={showSidebarSections.planInfo ? "default" : "outline"}
                onClick={() => setShowSidebarSections(prev => ({
                  ...prev,
                  planInfo: !prev.planInfo
                }))}
              >
                {showSidebarSections.planInfo ? "Hide" : "Show"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Usage Examples */}
        <Card>
          <CardHeader>
            <CardTitle>How to Use</CardTitle>
            <CardDescription>
              Examples of how to implement the new layout system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Basic Usage</h4>
                <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`import { UnifiedLayout } from "@/components/layout/unified-layout"

<UnifiedLayout pageTitle="Your Page">
  {/* Your content */}
</UnifiedLayout>`}
                </pre>
              </div>

              <div>
                <h4 className="font-medium mb-2">With Custom Sidebar Configuration</h4>
                <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`<UnifiedLayout 
  pageTitle="Custom Page"
  showNewPostButton={false}
  showConnectedAccounts={false}
  showPlanInfo={true}
>
  {/* Your content */}
</UnifiedLayout>`}
                </pre>
              </div>

              <div>
                <h4 className="font-medium mb-2">Just the Sidebar</h4>
                <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`import { Sidebar } from "@/components/layout/sidebar"

<Sidebar 
  collapsed={collapsed}
  onToggleCollapse={setCollapsed}
  showConnectedAccounts={true}
  showPlanInfo={false}
/>`}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Benefits */}
        <Card>
          <CardHeader>
            <CardTitle>Benefits of the New System</CardTitle>
            <CardDescription>
              Why this new approach is better
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-green-600">Consistency</h4>
                <p className="text-sm text-muted-foreground">
                  All pages now have the same layout structure and behavior
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-blue-600">Maintainability</h4>
                <p className="text-sm text-muted-foreground">
                  Single source of truth for layout logic and styling
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-purple-600">Reusability</h4>
                <p className="text-sm text-muted-foreground">
                  Components can be used across different pages and contexts
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-orange-600">Performance</h4>
                <p className="text-sm text-muted-foreground">
                  Reduced bundle size by eliminating duplicate code
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </UnifiedLayout>
  )
}
