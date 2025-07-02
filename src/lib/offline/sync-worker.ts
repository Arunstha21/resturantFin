import { offlineDB, type QueuedOperation, type OfflineRecord } from "./indexeddb"
import { toast } from "sonner"

export class SyncManager {
  private isOnline = typeof navigator !== "undefined" ? navigator.onLine : true
  private syncInProgress = false
  private syncCallbacks: (() => void)[] = []
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map()

  constructor() {
    if (typeof window !== "undefined") {
      this.setupEventListeners()
      this.initializeDB()
    }
  }

  private async initializeDB() {
    try {
      await offlineDB.init()
      console.log("Sync Manager: Database initialized")

      // Try to sync any pending operations on startup
      if (this.isOnline) {
        setTimeout(() => this.triggerSync(), 1000)
      }
    } catch (error) {
      console.error("Failed to initialize offline database:", error)
    }
  }

  private setupEventListeners() {
    window.addEventListener("online", () => {
      console.log("Network: Online")
      this.isOnline = true
      toast.success("Connection restored - syncing data...")
      this.triggerSync()
    })

    window.addEventListener("offline", () => {
      console.log("Network: Offline")
      this.isOnline = false
      toast.info("Working offline - changes will sync when online")
    })

    // Listen for service worker messages
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data.type === "SYNC_QUEUED_OPERATIONS") {
          this.triggerSync()
        }
      })
    }

    // Periodic sync check
    setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.checkAndSync()
      }
    }, 30000) // Check every 30 seconds
  }

  async queueOperation(
    type: "income" | "expense" | "user",
    operation: "create" | "update" | "delete",
    data: any,
    originalId?: string,
  ): Promise<string> {
    const id = `${type}_${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const queuedOp: QueuedOperation = {
      id,
      type,
      operation,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      originalId,
    }

    await offlineDB.addQueuedOperation(queuedOp)
    console.log("Operation queued:", queuedOp)

    // Also store in local records for immediate UI updates
    if (operation !== "delete") {
      const record: OfflineRecord = {
        id: data._id || id,
        type,
        data: {
          ...data,
          _id: data._id || id,
          _offline: true,
          _localId: id,
        },
        timestamp: Date.now(),
        synced: false,
        operation,
        localId: id,
      }

      const storeName = this.getStoreName(type)
      await offlineDB.addRecord(storeName, record)
    }

    // Try to sync immediately if online
    if (this.isOnline) {
      this.triggerSync()
    }

    return id
  }

  async getLocalRecords(type: "income" | "expense" | "user"): Promise<any[]> {
    try {
      const storeName = this.getStoreName(type)
      const records = await offlineDB.getRecords(storeName)

      return records
        .map((record) => ({
          ...record.data,
          _offline: !record.synced,
          _localId: record.localId || record.id,
          _timestamp: record.timestamp,
        }))
        .sort((a, b) => {
          // Sort by date for income/expense, by timestamp for others
          if (type === "income" || type === "expense") {
            return new Date(b.date || b._timestamp).getTime() - new Date(a.date || a._timestamp).getTime()
          }
          return b._timestamp - a._timestamp
        })
    } catch (error) {
      console.error(`Failed to get local ${type} records:`, error)
      return []
    }
  }

  async cacheServerData(type: "income" | "expense" | "user", data: any[]): Promise<void> {
    try {
      const storeName = this.getStoreName(type)

      // Clear existing synced records
      const existingRecords = await offlineDB.getRecords(storeName, true)
      for (const record of existingRecords) {
        await offlineDB.deleteRecord(storeName, record.id)
      }

      // Add new server data
      for (const item of data) {
        const record: OfflineRecord = {
          id: item._id,
          type,
          data: item,
          timestamp: Date.now(),
          synced: true,
          operation: "create",
        }
        await offlineDB.addRecord(storeName, record)
      }

      console.log(`Cached ${data.length} ${type} records from server`)
    } catch (error) {
      console.error(`Failed to cache ${type} data:`, error)
    }
  }

  private async checkAndSync() {
    try {
      const operations = await offlineDB.getQueuedOperations()
      if (operations.length > 0) {
        console.log(`Found ${operations.length} pending operations, triggering sync`)
        this.triggerSync()
      }
    } catch (error) {
      console.error("Failed to check pending operations:", error)
    }
  }

  async triggerSync(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) {
      console.log("Sync skipped:", { syncInProgress: this.syncInProgress, isOnline: this.isOnline })
      return
    }

    this.syncInProgress = true
    console.log("Starting sync...")

    try {
      await this.syncQueuedOperations()
      console.log("Sync completed successfully")
      this.notifySyncComplete()
      toast.success("Data synced successfully")
    } catch (error) {
      console.error("Sync failed:", error)
      toast.error("Sync failed - will retry automatically")
    } finally {
      this.syncInProgress = false
    }
  }

  private async syncQueuedOperations() {
    const operations = await offlineDB.getQueuedOperations()
    console.log(`Syncing ${operations.length} operations`)

    for (const operation of operations) {
      try {
        await this.syncSingleOperation(operation)
        await offlineDB.removeQueuedOperation(operation.id)
        console.log(`Successfully synced operation: ${operation.id}`)
      } catch (error) {
        console.error(`Failed to sync operation ${operation.id}:`, error)

        // Increment retry count
        operation.retryCount++
        if (operation.retryCount < 5) {
          await offlineDB.addQueuedOperation(operation)

          // Schedule retry with exponential backoff
          const retryDelay = Math.min(1000 * Math.pow(2, operation.retryCount), 30000)
          const timeoutId = setTimeout(() => {
            this.triggerSync()
            this.retryTimeouts.delete(operation.id)
          }, retryDelay)

          this.retryTimeouts.set(operation.id, timeoutId)

          console.log(`Scheduled retry for operation ${operation.id} in ${retryDelay}ms`)
        } else {
          console.error(`Max retries reached for operation ${operation.id}, removing from queue`)
          await offlineDB.removeQueuedOperation(operation.id)
          toast.error(`Failed to sync operation after multiple attempts`)
        }
      }
    }
  }

  private async syncSingleOperation(operation: QueuedOperation) {
    const { type, operation: op, data } = operation

    let endpoint = ""
    switch (type) {
      case "income":
        endpoint = "/api/income-records"
        break
      case "expense":
        endpoint = "/api/expense-records"
        break
      case "user":
        endpoint = "/api/users"
        break
    }
    let method = ""
    let body = ""

    // Prepare request based on operation
    switch (op) {
      case "create":
        method = "POST"
        body = JSON.stringify(data)
        break

      case "update":
        method = "PUT"
        endpoint = `${endpoint}/${data._id}`
        body = JSON.stringify(data)
        break

      case "delete":
        method = "DELETE"
        endpoint = `${endpoint}/${data._id}`
        break

      default:
        throw new Error(`Unknown operation: ${op}`)
    }

    // Make the request
    const requestOptions: RequestInit = {
      method,
      headers: { "Content-Type": "application/json" },
    }

    if (body) {
      requestOptions.body = body
    }

    const response: Response  = await fetch(endpoint, requestOptions)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    // Update local record sync status
    const storeName = this.getStoreName(type)

    if (op === "delete") {
      await offlineDB.deleteRecord(storeName, data._id)
    } else {
      // Get the response data for creates/updates
      const responseData = await response.json()
      const serverRecord = responseData.record || responseData

      // Update local record with server data
      const record: OfflineRecord = {
        id: serverRecord._id,
        type,
        data: serverRecord,
        timestamp: Date.now(),
        synced: true,
        operation: op,
      }

      await offlineDB.addRecord(storeName, record)

      // Remove the temporary local record if it exists
      if (operation.originalId && operation.originalId !== serverRecord._id) {
        try {
          await offlineDB.deleteRecord(storeName, operation.originalId)
        } catch (error) {
            console.warn(`Failed to delete temporary local record ${operation.originalId}:`, error)
          // Ignore if record doesn't exist
        }
      }
    }
  }

  private getStoreName(type: "income" | "expense" | "user" | "dueAccount"): string {
    switch (type) {
      case "income":
        return "incomeRecords"
      case "expense":
        return "expenseRecords"
      case "dueAccount":
        return "dueAccounts"
      case "user":
        return "users"
      default:
        throw new Error(`Unknown type: ${type}`)
    }
  }

  onSyncComplete(callback: () => void) {
    this.syncCallbacks.push(callback)
  }

  private notifySyncComplete() {
    this.syncCallbacks.forEach((callback) => {
      try {
        callback()
      } catch (error) {
        console.error("Error in sync callback:", error)
      }
    })
  }

  async clearLocalData() {
    try {
      await offlineDB.clearStore("incomeRecords")
      await offlineDB.clearStore("expenseRecords")
      await offlineDB.clearStore("users")
      await offlineDB.clearStore("queuedOperations")
      await offlineDB.clearStore("apiCache")
      console.log("Local data cleared")
      toast.success("Local data cleared")
    } catch (error) {
      console.error("Failed to clear local data:", error)
      toast.error("Failed to clear local data")
    }
  }

  getOnlineStatus() {
    return this.isOnline
  }

  getSyncStatus() {
    return this.syncInProgress
  }

  async getPendingOperationsCount(): Promise<number> {
    try {
      const operations = await offlineDB.getQueuedOperations()
      return operations.length
    } catch (error) {
      console.error("Failed to get pending operations count:", error)
      return 0
    }
  }

  async getStorageStats() {
    try {
      return await offlineDB.getStorageStats()
    } catch (error) {
      console.error("Failed to get storage stats:", error)
      return {}
    }
  }
}

export const syncManager = new SyncManager()
