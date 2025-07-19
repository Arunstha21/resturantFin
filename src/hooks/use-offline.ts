"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { syncManager } from "@/lib/offline/sync-manager"

export function useOffline() {
  const [isOnline, setIsOnline] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingOperations, setPendingOperations] = useState(0)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [isCheckingConnectivity, setIsCheckingConnectivity] = useState(false)

  // Use refs to prevent infinite loops and memory leaks
  const connectivityCheckRef = useRef<NodeJS.Timeout | null>(null)
  const isCheckingRef = useRef(false)
  const lastCheckTimeRef = useRef(0)
  const mountedRef = useRef(true)

  // Optimized connectivity test with better mobile handling
  const testConnectivity = useCallback(async (): Promise<boolean> => {
    if (isCheckingRef.current || !mountedRef.current) {
      return isOnline
    }

    const now = Date.now()
    if (now - lastCheckTimeRef.current < 15000) {
      // Increased debounce for mobile
      return isOnline
    }

    if (!navigator.onLine) {
      return false
    }

    isCheckingRef.current = true
    lastCheckTimeRef.current = now

    try {
      if (mountedRef.current) {
        setIsCheckingConnectivity(true)
      }

      // Use shorter timeout for mobile
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2000) // Reduced from 3000

      try {
        const response = await fetch("/api/health", {
          method: "HEAD",
          cache: "no-cache",
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        return response.ok
      } catch (error) {
        clearTimeout(timeoutId)

        // Fallback test with even shorter timeout
        try {
          const controller2 = new AbortController()
          const timeoutId2 = setTimeout(() => controller2.abort(), 3000)

          await fetch("https://www.google.com/favicon.ico", {
            method: "HEAD",
            mode: "no-cors",
            cache: "no-cache",
            signal: controller2.signal,
          })
          clearTimeout(timeoutId2)
          return true
        } catch (fallbackError) {
          return false
        }
      }
    } catch (error) {
      console.error("Connectivity check error:", error)
      return false
    } finally {
      if (mountedRef.current) {
        setIsCheckingConnectivity(false)
      }
      isCheckingRef.current = false
    }
  }, [isOnline])

  const updateOnlineStatus = useCallback(async () => {
    if (!mountedRef.current) return

    const online = await testConnectivity()
    if (mountedRef.current) {
      setIsOnline((prevOnline) => {
        if (prevOnline !== online) {
          console.log("Connectivity status changed:", online ? "Online" : "Offline")
        }
        return online
      })
    }
  }, [testConnectivity])

  const updateSyncStatus = useCallback(() => {
    if (mountedRef.current) {
      setIsSyncing(syncManager.getSyncStatus())
    }
  }, [])

  const updatePendingOperations = useCallback(async () => {
    if (!mountedRef.current) return

    try {
      const count = await syncManager.getPendingOperationsCount()
      if (mountedRef.current) {
        setPendingOperations(count)
      }
    } catch (error) {
      console.error("Failed to get pending operations:", error)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true

    // Initial status check
    updateOnlineStatus()
    updateSyncStatus()
    updatePendingOperations()

    // Optimized network event listeners
    const handleOnline = () => {
      if (connectivityCheckRef.current) {
        clearTimeout(connectivityCheckRef.current)
      }
      connectivityCheckRef.current = setTimeout(() => {
        updateOnlineStatus()
      }, 1500) // Slightly longer delay for mobile
    }

    const handleOffline = () => {
      if (mountedRef.current) {
        setIsOnline(false)
        setIsCheckingConnectivity(false)
      }
      if (connectivityCheckRef.current) {
        clearTimeout(connectivityCheckRef.current)
        connectivityCheckRef.current = null
      }
    }

    // Visibility change handler for mobile optimization
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && mountedRef.current) {
        // App became visible, check connectivity
        setTimeout(updateOnlineStatus, 1000)
      }
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    // Sync completion callback
    syncManager.onSyncComplete(() => {
      if (mountedRef.current) {
        setIsSyncing(false)
        setLastSyncTime(new Date())
        updatePendingOperations()
      }
    })

    // Reduced polling intervals for mobile battery optimization
    const connectivityInterval = setInterval(
      () => {
        if (!isCheckingRef.current && mountedRef.current) {
          updateOnlineStatus()
        }
      },
      isOnline ? 180000 : 90000, // 3 minutes when online, 1.5 minutes when offline
    )

    const operationsInterval = setInterval(() => {
      if (mountedRef.current) {
        updatePendingOperations()
        updateSyncStatus()
      }
    }, 15000) // Every 15 seconds instead of 10

    return () => {
      mountedRef.current = false
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
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
    if (mountedRef.current) {
      setPendingOperations(0)
    }
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
    testConnectivity,
  }
}
