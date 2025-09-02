"use client"

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { TopRightControls } from '@/components/layout/top-right-controls'
import { Sidebar } from '@/components/layout/sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Settings,
  Plus,
  Users,
  BarChart3,
  Shield,
  Zap,
  Database,
  Server,
  Activity,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Menu,
  Search,
  Bell,
  Sun,
  Moon,
  Home,
  Rocket,
  FileText,
  Calendar,
  ArrowRight,
  Eye,
  Edit,
  Trash2
} from 'lucide-react'
import Link from 'next/link'

interface AppStats {
  totalUsers: number
  activeUsers: number
  totalPosts: number
  scheduledPosts: number
  publishedPosts: number
  failedPosts: number
  totalRevenue: number
  monthlyRevenue: number
  systemHealth: 'excellent' | 'good' | 'warning' | 'critical'
  aiModels: number
  activeModels: number
}

interface RecentActivity {
  id: string
  type: 'user_signup' | 'post_published' | 'post_failed' | 'model_updated' | 'system_alert'
  message: string
  timestamp: string
  severity: 'info' | 'warning' | 'error' | 'success'
}

export default function AppOwnerPage() {
  const { data: session, status } = useSession()
  const [collapsed, setCollapsed] = useState(false)
  const [stats, setStats] = useState<AppStats>({
    totalUsers: 1247,
    activeUsers: 892,
    totalPosts: 5678,
    scheduledPosts: 234,
    publishedPosts: 5234,
    failedPosts: 210,
    totalRevenue: 45600,
    monthlyRevenue: 8900,
    systemHealth: 'excellent',
    aiModels: 8,
    activeModels: 6
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([
    {
      id: '1',
      type: 'user_signup',
      message: 'New user registered: john.doe@example.com',
      timestamp: '2 minutes ago',
      severity: 'success'
    },
    {
      id: '2',
      type: 'post_published',
      message: 'Post successfully published to LinkedIn for user: sarah.wilson',
      timestamp: '5 minutes ago',
      severity: 'success'
    },
    {
      id: '3',
      type: 'model_updated',
      message: 'AI model "GPT-4 Turbo" performance metrics updated',
      timestamp: '15 minutes ago',
      severity: 'info'
    },
    {
      id: '4',
      type: 'system_alert',
      message: 'High CPU usage detected on server node-2',
      timestamp: '1 hour ago',
      severity: 'warning'
    }
  ])

  useEffect(() => {
    if (session) {
      // Fetch real data here
      fetchAppOwnerData()
    }
  }, [session])

  if (status === 'loading') {
    return <div>Loading...</div>
  }

  if (!session) {
    redirect('/auth/signin')
  }

  // Check if user is app owner (hardcoded for simplicity)
  const isAppOwner = session?.user?.email === 'ghazanfarnaseer91@gmail.com'

  if (!isAppOwner) {
    redirect('/dashboard')
  }

  const fetchAppOwnerData = async () => {
    try {
      // Fetch app owner data here
      console.log('Fetching app owner data...')
    } catch (error) {
      console.error('Failed to fetch app owner data:', error)
    }
  }

  const getSystemHealthColor = (health: string) => {
    switch (health) {
      case 'excellent':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'good':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_signup':
        return <Users className="w-4 h-4" />
      case 'post_published':
        return <CheckCircle className="w-4 h-4" />
      case 'post_failed':
        return <XCircle className="w-4 h-4" />
      case 'model_updated':
        return <Zap className="w-4 h-4" />
      case 'system_alert':
        return <AlertTriangle className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  const getActivityColor = (severity: string) => {
    switch (severity) {
      case 'success':
        return 'text-green-600 dark:text-green-400'
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400'
      case 'error':
        return 'text-red-600 dark:text-red-400'
      case 'info':
        return 'text-blue-600 dark:text-blue-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  return (
    <div className="min-h-screen font-sans bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Sidebar */}
      <Sidebar 
        collapsed={collapsed}
        onToggleCollapse={setCollapsed}
        showPlanInfo={true}
      />

      <div className={`max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 ${collapsed ? 'ml-16' : 'ml-64'} transition-all duration-300`}>
        {/* Main area */}
        <main className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">App Owner</h1>
            </div>
            <div className="flex items-center gap-4">
              <TopRightControls unreadNotificationsCount={5} />
            </div>
          </div>

          <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">App Owner Dashboard</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Monitor and manage your application's performance, users, and AI models
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Export Report
                </Button>
                <Button className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  System Settings
                </Button>
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Users</p>
                      <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.totalUsers.toLocaleString()}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-blue-600 dark:text-blue-400">
                        {((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)}% active
                      </span>
                      <Progress value={(stats.activeUsers / stats.totalUsers) * 100} className="flex-1 h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Posts</p>
                      <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.totalPosts.toLocaleString()}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-green-600 dark:text-green-400">
                        {((stats.publishedPosts / stats.totalPosts) * 100).toFixed(1)}% success
                      </span>
                      <Progress value={(stats.publishedPosts / stats.totalPosts) * 100} className="flex-1 h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Monthly Revenue</p>
                      <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">${stats.monthlyRevenue.toLocaleString()}</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-purple-600 dark:text-purple-400">
                        ${(stats.monthlyRevenue / 12).toFixed(0)} avg/month
                      </span>
                      <Progress value={75} className="flex-1 h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-amber-600 dark:text-amber-400">System Health</p>
                      <p className="text-2xl font-bold text-amber-900 dark:text-amber-100 capitalize">{stats.systemHealth}</p>
                    </div>
                    <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
                      <Server className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Badge className={`${getSystemHealthColor(stats.systemHealth)} text-xs font-medium`}>
                      {stats.systemHealth === 'excellent' ? '100%' : '95%'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* AI Models Overview */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">AI Models Management</CardTitle>
                    <CardDescription>Monitor and configure your AI models</CardDescription>
                  </div>
                  <Link href="/app-owner/ai-models">
                    <Button variant="outline" className="flex items-center gap-2">
                      Manage Models
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100">{stats.activeModels}</h3>
                    <p className="text-sm text-blue-600 dark:text-blue-400">Active Models</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-green-900 dark:text-green-100">{stats.aiModels}</h3>
                    <p className="text-sm text-green-600 dark:text-green-400">Total Models</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                    <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-purple-900 dark:text-purple-100">98.5%</h3>
                    <p className="text-sm text-purple-600 dark:text-purple-400">Uptime</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Recent Activity</CardTitle>
                <CardDescription>Latest system events and user activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getActivityColor(activity.severity)} bg-opacity-10`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.message}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{activity.timestamp}</p>
                      </div>
                      <Badge className={`text-xs ${getActivityColor(activity.severity)} bg-opacity-10`}>
                        {activity.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">User Management</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Manage user accounts and permissions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                      <Server className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">System Health</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Monitor server performance and alerts</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Billing & Plans</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Manage subscriptions and billing</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
