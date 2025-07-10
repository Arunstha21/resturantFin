"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { syncManager } from "@/lib/offline/sync-manager"

export function useOffline() {
  const [isOnline, setIsOnline] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingOperations, setPendingOperations] = useState(0)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [isCheckingConnectivity, setIsCheckingConnectivity] = useState(false)

  // Use refs to prevent infinite loops
  const connectivityCheckRef = useRef<NodeJS.Timeout | null>(null)
  const isCheckingRef = useRef(false)
  const lastCheckTimeRef = useRef(0)

  // Test actual internet connectivity with debouncing
  const testConnectivity = useCallback(async (): Promise<boolean> => {
    // Prevent multiple simultaneous checks
    if (isCheckingRef.current) {
      return isOnline
    }

    // Debounce: Don't check more than once every 10 seconds (increased from 5)
    const now = Date.now()
    if (now - lastCheckTimeRef.current < 10000) {
      return isOnline
    }

    if (!navigator.onLine) {
      return false
    }

    isCheckingRef.current = true
    lastCheckTimeRef.current = now

    try {
      setIsCheckingConnectivity(true)

      // Test our own API first (fastest and most reliable for our app)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)

      try {
        const response = await fetch("/api/health", {
          method: "HEAD",
          cache: "no-cache",
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (response.ok) {
          return true
        }
      } catch (error) {
        clearTimeout(timeoutId)
        console.error("API health check failed:", error)
      }

      // If our API fails, try one external endpoint
      try {
        const controller2 = new AbortController()
        const timeoutId2 = setTimeout(() => controller2.abort(), 5000)

        await fetch("https://www.google.com/favicon.ico", {
          method: "HEAD",
          mode: "no-cors",
          cache: "no-cache",
          signal: controller2.signal,
        })
        clearTimeout(timeoutId2)
        return true
      } catch (error) {
        console.error("External connectivity check failed:", error)
        return false
      }
    } catch (error) {
      console.error("Connectivity check error:", error)
      return false
    } finally {
      setIsCheckingConnectivity(false)
      isCheckingRef.current = false
    }
  }, [isOnline])

  // Update online status with proper state management
  const updateOnlineStatus = useCallback(async () => {
    const online = await testConnectivity()
    setIsOnline((prevOnline) => {
      if (prevOnline !== online) {
        console.log("Connectivity status changed:", online ? "Online (Internet Available)" : "Offline (No Internet)")
      }
      return online
    })
  }, [testConnectivity])

  const updateSyncStatus = useCallback(() => {
    setIsSyncing(syncManager.getSyncStatus())
  }, [])

  const updatePendingOperations = useCallback(async () => {
    try {
      const count = await syncManager.getPendingOperationsCount()
      setPendingOperations(count)
    } catch (error) {
      console.error("Failed to get pending operations:", error)
    }
  }, [])

  useEffect(() => {
    // Initial status check
    updateOnlineStatus()
    updateSyncStatus()
    updatePendingOperations()

    // Network change listeners
    const handleOnline = () => {
      // Clear any existing timeout
      if (connectivityCheckRef.current) {
        clearTimeout(connectivityCheckRef.current)
      }
      // Delay the check slightly to avoid rapid firing
      connectivityCheckRef.current = setTimeout(() => {
        updateOnlineStatus()
      }, 1000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setIsCheckingConnectivity(false)
      // Clear any pending connectivity checks
      if (connectivityCheckRef.current) {
        clearTimeout(connectivityCheckRef.current)
        connectivityCheckRef.current = null
      }
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Sync completion callback
    syncManager.onSyncComplete(() => {
      setIsSyncing(false)
      setLastSyncTime(new Date())
      updatePendingOperations()
    })

    // Periodic connectivity check with longer intervals
    const connectivityInterval = setInterval(
      () => {
        if (!isCheckingRef.current) {
          updateOnlineStatus()
        }
      },
      isOnline ? 120000 : 60000, // 2 minutes when online, 1 minute when offline (increased from 60s/30s)
    )

    // Check pending operations periodically
    const operationsInterval = setInterval(() => {
      updatePendingOperations()
      updateSyncStatus()
    }, 10000) // Every 10 seconds instead of 5

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      clearInterval(connectivityInterval)
      clearInterval(operationsInterval)

      if (connectivityCheckRef.current) {
        clearTimeout(connectivityCheckRef.current)
      }
    }
  }, [updateOnlineStatus, updateSyncStatus, updatePendingOperations, isOnline])

  const manualSync = async () => {
    if (!isOnline) {
      throw new Error("Cannot sync while offline")
    }

    await syncManager.triggerSync()
  }

  const clearLocalData = async () => {
    await syncManager.clearLocalData()
    setPendingOperations(0)
  }

  const getStorageStats = async () => {
    return await syncManager.getStorageStats()
  }

  return {
    isOnline,
    isSyncing,
    pendingOperations,
    lastSyncTime,
    isCheckingConnectivity,
    manualSync,
    clearLocalData,
    getStorageStats,
    syncManager,
    testConnectivity, // Expose for manual testing
  }
}
