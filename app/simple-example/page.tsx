"use client"

import { TopRightControls } from "@/components/layout/top-right-controls"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SimpleExamplePage() {
  return (
    <div className="min-h-screen font-sans bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900 text-slate-900 dark:text-slate-100 transition-colors">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header with Top-Right Controls */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Simple Example Page</h1>
            <p className="text-muted-foreground mt-2">
              This page demonstrates how to use the TopRightControls component in any page
            </p>
          </div>
          <TopRightControls unreadNotificationsCount={7} />
        </div>

        {/* Page Content */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>How to Use TopRightControls</CardTitle>
              <CardDescription>
                Import and use the component in any page for consistent controls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">1. Import the Component</h4>
                  <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`import { TopRightControls } from "@/components/layout/top-right-controls"`}
                  </pre>
                </div>

                <div>
                  <h4 className="font-medium mb-2">2. Use in Your Page</h4>
                  <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`<TopRightControls unreadNotificationsCount={5} />`}
                  </pre>
                </div>

                <div>
                  <h4 className="font-medium mb-2">3. Position with Page Title</h4>
                  <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`<div className="flex items-center justify-between mb-6">
  <h1 className="text-2xl font-bold">Your Page Title</h1>
  <TopRightControls unreadNotificationsCount={3} />
</div>`}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Features</CardTitle>
              <CardDescription>
                What the TopRightControls component provides
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <strong>Theme Toggle:</strong> Switch between light and dark modes
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <strong>Notifications:</strong> Shows unread count with badge
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  <strong>Profile View:</strong> User avatar and name display
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  <strong>Universal:</strong> Theme changes affect entire app
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Benefits</CardTitle>
              <CardDescription>
                Why use this component approach
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-green-600">Consistency</h4>
                  <p className="text-sm text-muted-foreground">
                    Same controls appear in the same position across all pages
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-blue-600">Reusability</h4>
                  <p className="text-sm text-muted-foreground">
                    Import once, use anywhere - no duplicate code
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-purple-600">Maintainability</h4>
                  <p className="text-sm text-muted-foreground">
                    Update controls in one place, affects all pages
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-orange-600">Flexibility</h4>
                  <p className="text-sm text-muted-foreground">
                    Use with or without the full layout wrapper
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
