/**
 * Dashboard Layout - Protected dashboard layout with navbar and offline features
 */

import type React from "react"
import type { Metadata, Viewport } from "next"
import { Toaster } from "@/components/ui/sonner"
import { OfflineIndicator } from "@/components/offline/offline-indicator"
import { InstallPrompt } from "@/components/pwa/install-prompt"
import { Navbar } from "@/components/layout/navbar"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"


export const metadata: Metadata = {
  title: "Restaurant Finance Management System",
  description: "Comprehensive financial management for restaurants with offline support",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RestaurantFin",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  minimumScale: 1,
  userScalable: true,
  themeColor: "#000000",
  viewportFit: "cover",
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const serverSession = await getServerSession(authOptions)

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar serverSession={serverSession} />
      <div className="flex-1">
        {children}
      </div>
      <Toaster />
      <OfflineIndicator />
      <InstallPrompt />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js')
                  .then(function(registration) {
                    console.log('SW registered');
                  })
                  .catch(function(registrationError) {
                    console.log('SW registration failed: ', registrationError);
                  });
              });
            }
          `,
        }}
      />
    </div>
  )
}
