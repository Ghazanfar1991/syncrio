import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { initializeScheduler } from "@/lib/scheduler";
import { Toaster } from "@/components/ui/toaster";
import { UploadProgressProvider } from "@/components/upload-progress-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AuroraSocial – AI-Powered Social Media Studio",
  description: "Create, schedule, and analyze social content with an elegant, AI-first workflow."
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Initialize scheduler on server start
  if (typeof window === 'undefined') {
    initializeScheduler();
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-aurora bg-noise selection:bg-primary/20 selection:text-primary`}
        suppressHydrationWarning
      >
        <AuthProvider>
          <ThemeProvider>
            <div className="relative">
              {/* Background Gradients */}
              <div className="fixed inset-0 -z-10 overflow-hidden">
                <div className="glow-drift-1 absolute top-0 left-[10%] w-[800px] h-[600px] rounded-full bg-primary/20 blur-3xl" />
                <div className="glow-drift-2 absolute top-0 right-[10%] w-[600px] h-[400px] rounded-full bg-secondary/20 blur-3xl" />
                <div className="glow-drift-3 absolute bottom-0 left-[20%] w-[400px] h-[400px] rounded-full bg-success/20 blur-3xl" />
              </div>
              {children}
            </div>
            <Toaster />
            <UploadProgressProvider />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
