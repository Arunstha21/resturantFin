import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { SessionProvider } from "@/components/session-provider"
import "../globals.css"
import { Toaster } from "@/components/ui/sonner"
import { OfflineIndicator } from "@/components/offline/offline-indicator"
import { InstallPrompt } from "@/components/pwa/install-prompt"
import { Navbar } from "@/components/layout/navbar"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const inter = Inter({ subsets: ["latin"] })

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
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const serverSession = await getServerSession(authOptions)

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* <link rel="apple-touch-icon" href="/icon-192x192.png" /> */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="RestaurantFin" />
      </head>
      <body className={inter.className}>
        <SessionProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <Navbar serverSession={serverSession} />
            {children}
            <Toaster />
            <OfflineIndicator />
            <InstallPrompt />
          </ThemeProvider>
        </SessionProvider>
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
      </body>
    </html>
  )
}
