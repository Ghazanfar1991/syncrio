"use client"

import { useSession } from "next-auth/react"
import React from 'react';
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { TopRightControls } from "@/components/layout/top-right-controls"
import { Sidebar } from "@/components/layout/sidebar"
import { SubscriptionCard } from "@/components/subscription/subscription-card"
import { Settings, Sparkles, ArrowLeft, User, Mail, FileText, Shield, CreditCard, Users, Bell } from 'lucide-react'
import Link from "next/link"

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
  if (typeof window === "undefined") return false;
  try {
    return JSON.parse(localStorage.getItem("sidebar:collapsed") ?? "false");
  } catch {
    return false;
  }
});

React.useEffect(() => {
  localStorage.setItem("sidebar:collapsed", JSON.stringify(collapsed));
}, [collapsed]);



  useEffect(() => {
    if (status === "loading") return
    if (!session) router.push("/auth/signin")
  }, [session, status, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen font-sans bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900 text-slate-900 dark:text-slate-100 transition-colors">
        {/* Sidebar */}
        <Sidebar 
          collapsed={collapsed}
          onToggleCollapse={setCollapsed}
          showPlanInfo={true}
        />

        <div className={`max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 ${collapsed ? 'ml-16' : 'ml-64'} transition-all duration-300`}>
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-cyan-400 rounded-2xl flex items-center justify-center mb-6 mx-auto animate-pulse shadow-xl">
              <Settings className="h-8 w-8 text-white" />
            </div>
            <div className="w-12 h-12 border-3 border-indigo-300 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg opacity-60 font-medium">Loading settings...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!session) return null

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
                    <h2 className="text-xl font-bold tracking-tight mb-1">Account Settings</h2>
                    <p className="text-sm opacity-60 mt-1">
                      Manage your account, social connections, and preferences
                    </p>
                  </div>
            <div className="flex items-center gap-4">
              <TopRightControls unreadNotificationsCount={3} />
            </div>
          </div>

          <div className="space-y-6">
           

          {/* Main Content */}
          <div className="space-y-8">

            {/* Subscription Section */}
            <div className="rounded-3xl p-6 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-sm border border-black/5 dark:border-white/5 shadow-lg">
              <div className="mb-6">
                <h3 className="text-lg font-bold mb-1">Subscription & Billing</h3>
                <p className="text-sm opacity-60">Manage your subscription plan and billing preferences</p>
              </div>
              <SubscriptionCard />
            </div>

            {/* Account Settings Section */}
            <div className="rounded-3xl p-6 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-sm border border-black/5 dark:border-white/5 shadow-lg">
              <div className="mb-6">
                <h3 className="text-lg font-bold mb-1">Account Settings</h3>
                <p className="text-sm opacity-60">Manage your profile, security, and notification preferences</p>
              </div>
              <div className="space-y-8">
                {/* Profile Information */}
                <div className="space-y-6">
                  <h3 className="text-lg font-bold mb-1">Profile Information</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="relative rounded-3xl p-5 bg-white/40 dark:bg-neutral-800/30 backdrop-blur-sm border border-black/10 dark:border-white/10 shadow-lg overflow-hidden transition-transform hover:-translate-y-1">
                      <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full opacity-20" style={{ background: 'linear-gradient(135deg,#3b82f6, #06b6d4)' }} />
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs opacity-70">Full Name</div>
                          <div className="mt-2 text-2xl font-semibold tracking-tight">{session.user?.name || 'Not set'}</div>
                          <div className="mt-1 text-xs opacity-60">Profile name</div>
                        </div>
                        <div className="p-2 rounded-lg bg-black/5 dark:bg-white/8"><User className="w-5 h-5 text-indigo-600" /></div>
                      </div>
                    </div>
                    
                    <div className="relative rounded-3xl p-5 bg-white/40 dark:bg-neutral-800/30 backdrop-blur-sm border border-black/10 dark:border-white/10 shadow-lg overflow-hidden transition-transform hover:-translate-y-1">
                      <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full opacity-20" style={{ background: 'linear-gradient(135deg,#8b5cf6, #ec4899)' }} />
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs opacity-70">Email Address</div>
                          <div className="mt-2 text-2xl font-semibold tracking-tight">{session.user?.email}</div>
                          <div className="mt-1 text-xs opacity-60">Account email</div>
                        </div>
                        <div className="p-2 rounded-lg bg-black/5 dark:bg-white/8"><Mail className="w-5 h-5 text-purple-600" /></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Security & Privacy */}
                <div className="space-y-6">
                  <h3 className="text-lg font-bold mb-1">Security & Privacy</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="relative rounded-3xl p-5 bg-white/40 dark:bg-neutral-800/30 backdrop-blur-sm border border-black/10 dark:border-white/10 shadow-lg overflow-hidden transition-transform hover:-translate-y-1">
                      <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full opacity-20" style={{ background: 'linear-gradient(135deg,#10b981, #06b6d4)' }} />
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs opacity-70">Account Status</div>
                          <div className="mt-2 text-2xl font-semibold tracking-tight">Active & Secure</div>
                          <div className="mt-1 text-xs opacity-60">Account verified</div>
                        </div>
                        <div className="p-2 rounded-lg bg-black/5 dark:bg-white/8"><Shield className="w-5 h-5 text-green-600" /></div>
                      </div>
                    </div>
                    
                    <div className="relative rounded-3xl p-5 bg-white/40 dark:bg-neutral-800/30 backdrop-blur-sm border border-black/10 dark:border-white/10 shadow-lg overflow-hidden transition-transform hover:-translate-y-1">
                      <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full opacity-20" style={{ background: 'linear-gradient(135deg,#f97316, #ef4444)' }} />
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs opacity-70">Notifications</div>
                          <div className="mt-2 text-2xl font-semibold tracking-tight">Email & Push</div>
                          <div className="mt-1 text-xs opacity-60">Alert preferences</div>
                        </div>
                        <div className="p-2 rounded-lg bg-black/5 dark:bg-white/8"><Bell className="w-5 h-5 text-orange-600" /></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Coming Soon Features */}
                <div className="rounded-3xl p-6 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-sm border border-black/5 dark:border-white/5 shadow-lg">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-cyan-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <Sparkles className="h-8 w-8 text-white" />
                    </div>
                    <h4 className="text-lg font-bold mb-2">Coming Soon</h4>
                    <p className="text-sm opacity-60 mb-4 max-w-2xl mx-auto">
                      We're working on exciting new features including profile editing, password management, 
                      advanced security options, and customizable notification preferences.
                    </p>
                    <div className="flex flex-wrap justify-center gap-3 text-sm">
                      <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full border border-indigo-200 dark:border-indigo-700">
                        Profile Editing
                      </span>
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-700">
                        Password Management
                      </span>
                      <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full border border-purple-200 dark:border-purple-700">
                        Security Options
                      </span>
                      <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full border border-green-200 dark:border-green-700">
                        Notifications
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </main>
      </div>
    </div>
  )
}
