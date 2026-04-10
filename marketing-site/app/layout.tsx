import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Syncrio | AI Social Media Scheduling and Analytics",
    template: "%s | Syncrio",
  },
  description:
    "Create, schedule, publish, and analyze social content with Syncrio. An AI-powered social media platform for teams, creators, and brands.",
  keywords: [
    "social media management",
    "AI social media",
    "social media scheduler",
    "content planning",
    "social analytics",
    "Syncrio",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Syncrio | AI Social Media Scheduling and Analytics",
    description:
      "Create, schedule, publish, and analyze social content with Syncrio.",
    url: "/",
    siteName: "Syncrio",
    type: "website",
    images: [
      {
        url: "/applogo.PNG",
        width: 512,
        height: 512,
        alt: "Syncrio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Syncrio | AI Social Media Scheduling and Analytics",
    description:
      "Create, schedule, publish, and analyze social content with Syncrio.",
    images: ["/applogo.PNG"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
