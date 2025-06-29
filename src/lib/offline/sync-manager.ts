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

        // Check if it's a client error (4xx) that shouldn't be retried
        const isClientError = error instanceof Error && error.message.includes("HTTP 4")

        if (isClientError) {
          console.log(`Client error for operation ${operation.id}, removing from queue`)
          await offlineDB.removeQueuedOperation(operation.id)
          toast.error(`Sync failed: ${error.message}`)
          continue
        }

        // Increment retry count for server errors
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

    // Import server actions dynamically to avoid issues
    const { createIncomeRecord, updateIncomeRecord, deleteIncomeRecord } = await import("@/app/actions/income-records")
    const { createExpenseRecord, updateExpenseRecord, deleteExpenseRecord } = await import(
      "@/app/actions/expense-records"
    )

    // Clean the data before sending (remove offline-specific fields)
    const cleanData = { ...data }
    delete cleanData._offline
    delete cleanData._localId
    delete cleanData._timestamp

    // Check if this is a temporary ID (starts with temp_)
    const isTemporaryId = cleanData._id && cleanData._id.toString().startsWith("temp_")

    let result: any

    try {
      // Execute the appropriate server action based on type and operation
      switch (type) {
        case "income":
          switch (op) {
            case "create":
              // For creates, don't send the temporary _id
              if (isTemporaryId) {
                delete cleanData._id
              }
              console.log(`Creating income record via server action:`, cleanData)
              result = await createIncomeRecord(cleanData)
              break

            case "update":
              // For updates with temporary IDs, treat as create
              if (isTemporaryId) {
                delete cleanData._id
                console.log(`Creating income record (was temp update) via server action:`, cleanData)
                result = await createIncomeRecord(cleanData)
              } else {
                console.log(`Updating income record via server action:`, cleanData._id, cleanData)
                result = await updateIncomeRecord(cleanData._id, cleanData)
              }
              break

            case "delete":
              // Don't try to delete temporary records
              if (isTemporaryId) {
                console.log(`Skipping delete of temporary income record: ${cleanData._id}`)
                return
              }
              console.log(`Deleting income record via server action:`, cleanData._id)
              result = await deleteIncomeRecord(cleanData._id)
              break

            default:
              throw new Error(`Unknown operation: ${op}`)
          }
          break

        case "expense":
          switch (op) {
            case "create":
              if (isTemporaryId) {
                delete cleanData._id
              }
              console.log(`Creating expense record via server action:`, cleanData)
              result = await createExpenseRecord(cleanData)
              break

            case "update":
              if (isTemporaryId) {
                delete cleanData._id
                console.log(`Creating expense record (was temp update) via server action:`, cleanData)
                result = await createExpenseRecord(cleanData)
              } else {
                console.log(`Updating expense record via server action:`, cleanData._id, cleanData)
                result = await updateExpenseRecord(cleanData._id, cleanData)
              }
              break

            case "delete":
              if (isTemporaryId) {
                console.log(`Skipping delete of temporary expense record: ${cleanData._id}`)
                return
              }
              console.log(`Deleting expense record via server action:`, cleanData._id)
              result = await deleteExpenseRecord(cleanData._id)
              break

            default:
              throw new Error(`Unknown operation: ${op}`)
          }
          break

        case "user":
          // For users, we'll still use fetch since we don't have server actions for them yet
          let endpoint = "/api/users"
          let method = ""
          let body = ""

          switch (op) {
            case "create":
              method = "POST"
              if (isTemporaryId) {
                delete cleanData._id
              }
              body = JSON.stringify(cleanData)
              break

            case "update":
              if (isTemporaryId) {
                method = "POST"
                delete cleanData._id
                body = JSON.stringify(cleanData)
              } else {
                method = "PUT"
                endpoint = `${endpoint}/${cleanData._id}`
                body = JSON.stringify(cleanData)
              }
              break

            case "delete":
              if (isTemporaryId) {
                console.log(`Skipping delete of temporary user record: ${cleanData._id}`)
                return
              }
              method = "DELETE"
              endpoint = `${endpoint}/${cleanData._id}`
              break

            default:
              throw new Error(`Unknown operation: ${op}`)
          }

          const requestOptions: RequestInit = {
            method,
            headers: { "Content-Type": "application/json" },
          }

          if (body) {
            requestOptions.body = body
          }

          console.log(`Syncing ${op} ${type} via API:`, { endpoint, method, data: cleanData, isTemporaryId })

          const response = await fetch(endpoint, requestOptions)

          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`HTTP ${response.status}: ${errorText}`)
          }

          result = await response.json()
          break

        default:
          throw new Error(`Unknown type: ${type}`)
      }

      // Check if the operation was successful
      if (!result || !result.success) {
        throw new Error(`Server action failed: ${result?.error || "Unknown error"}`)
      }

      console.log(`Successfully synced ${op} ${type} via server action`)

      // Update local record sync status
      const storeName = this.getStoreName(type)

      if (op === "delete") {
        await offlineDB.deleteRecord(storeName, cleanData._id)
      } else {
        // Get the server record from the result
        const serverRecord = result.record || result.user || result

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
        if (isTemporaryId) {
          try {
            await offlineDB.deleteRecord(storeName, data._id)
          } catch (error) {
            // Ignore if record doesn't exist
          }
        }
      }
    } catch (error) {
      console.error(`Failed to sync ${op} ${type}:`, error)
      throw error
    }
  }

  private getStoreName(type: "income" | "expense" | "user"): string {
    switch (type) {
      case "income":
        return "incomeRecords"
      case "expense":
        return "expenseRecords"
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
