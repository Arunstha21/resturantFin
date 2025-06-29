"use client"

import { useState, useEffect } from "react"
import { syncManager } from "@/lib/offline/sync-manager"

export function useOffline() {
  const [isOnline, setIsOnline] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingOperations, setPendingOperations] = useState(0)
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)

  useEffect(() => {
    const updateOnlineStatus = () => {
      const online = navigator.onLine
      setIsOnline(online)
      console.log("Online status changed:", online)
    }

    const updateSyncStatus = () => {
      setIsSyncing(syncManager.getSyncStatus())
    }

    // Initial status
    updateOnlineStatus()
    updateSyncStatus()

    // Event listeners
    window.addEventListener("online", updateOnlineStatus)
    window.addEventListener("offline", updateOnlineStatus)

    // Sync completion callback
    syncManager.onSyncComplete(() => {
      setIsSyncing(false)
      setLastSyncTime(new Date())
      updatePendingOperations()
    })

    // Check pending operations periodically
    const interval = setInterval(() => {
      updatePendingOperations()
      updateSyncStatus()
    }, 2000)

    // Initial check
    updatePendingOperations()

    return () => {
      window.removeEventListener("online", updateOnlineStatus)
      window.removeEventListener("offline", updateOnlineStatus)
      clearInterval(interval)
    }
  }, [])

  const updatePendingOperations = async () => {
    try {
      const count = await syncManager.getPendingOperationsCount()
      setPendingOperations(count)
    } catch (error) {
      console.error("Failed to get pending operations:", error)
    }
  }

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
    manualSync,
    clearLocalData,
    getStorageStats,
    syncManager,
  }
}
