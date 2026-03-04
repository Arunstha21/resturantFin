"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { syncManager } from "@/lib/offline/sync-manager"

/**
 * useOffline - Hook for offline status and sync management
 *
 * Provides:
 * - Online/offline status with connectivity checking
 * - Sync status and pending operations count
 * - Manual sync trigger and local data clearing
 */
export function useOffline() {
  const [isOnline, setIsOnline] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingOperations, setPendingOperations] = useState(0)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [isCheckingConnectivity, setIsCheckingConnectivity] = useState(false)

  const connectivityCheckRef = useRef<NodeJS.Timeout | null>(null)
  const isCheckingRef = useRef(false)
  const lastCheckTimeRef = useRef(0)

  // Test actual internet connectivity with debouncing
  const testConnectivity = useCallback(async (): Promise<boolean> => {
    if (isCheckingRef.current) return isOnline

    const now = Date.now()
    if (now - lastCheckTimeRef.current < 10000) return isOnline

    if (!navigator.onLine) return false

    isCheckingRef.current = true
    lastCheckTimeRef.current = now

    try {
      setIsCheckingConnectivity(true)

      // Test our own API first
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)

      try {
        const response = await fetch("/api/health", {
          method: "HEAD",
          cache: "no-cache",
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        if (response.ok) return true
      } catch {
        clearTimeout(timeoutId)
      }

      // Fallback to external endpoint
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
      } catch {
        return false
      }
    } finally {
      setIsCheckingConnectivity(false)
      isCheckingRef.current = false
    }
  }, [isOnline])

  const updateOnlineStatus = useCallback(async () => {
    const online = await testConnectivity()
    setIsOnline((prevOnline) => {
      if (prevOnline !== online) {
        console.log("Connectivity status changed:", online ? "Online" : "Offline")
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
    updateOnlineStatus()
    updateSyncStatus()
    updatePendingOperations()

    const handleOnline = () => {
      if (connectivityCheckRef.current) clearTimeout(connectivityCheckRef.current)
      connectivityCheckRef.current = setTimeout(() => updateOnlineStatus(), 1000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setIsCheckingConnectivity(false)
      if (connectivityCheckRef.current) {
        clearTimeout(connectivityCheckRef.current)
        connectivityCheckRef.current = null
      }
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    syncManager.onSyncComplete(() => {
      setIsSyncing(false)
      setLastSyncTime(new Date())
      updatePendingOperations()
    })

    // Periodic checks (2 min online, 1 min offline)
    const connectivityInterval = setInterval(
      () => { if (!isCheckingRef.current) updateOnlineStatus() },
      isOnline ? 120000 : 60000,
    )

    const operationsInterval = setInterval(() => {
      updatePendingOperations()
      updateSyncStatus()
    }, 10000)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      clearInterval(connectivityInterval)
      clearInterval(operationsInterval)
      if (connectivityCheckRef.current) clearTimeout(connectivityCheckRef.current)
    }
  }, [updateOnlineStatus, updateSyncStatus, updatePendingOperations, isOnline])

  const manualSync = async () => {
    if (!isOnline) throw new Error("Cannot sync while offline")
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
    testConnectivity,
  }
}
