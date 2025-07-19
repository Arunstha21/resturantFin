import { offlineDB, type QueuedOperation, type OfflineRecord } from "./indexeddb"
import { toast } from "sonner"

export class SyncManager {
  private isOnline = typeof navigator !== "undefined" ? navigator.onLine : true
  private syncInProgress = false
  private syncCallbacks: (() => void)[] = []
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map()
  private onlineStatusUpdateTimeout: NodeJS.Timeout | null = null

  constructor() {
    if (typeof window !== "undefined") {
      this.setupEventListeners()
      this.initializeDB()
    }
  }

  private async initializeDB() {
    try {
      await offlineDB.init()

      // Try to sync any pending operations on startup (with delay)
      if (this.isOnline) {
        setTimeout(() => this.triggerSync(), 2000)
      }
    } catch (error) {
      console.error("Failed to initialize offline database:", error)
    }
  }

  private setupEventListeners() {
    // Basic network event listeners (don't trigger connectivity tests here)
    window.addEventListener("online", () => {
      console.log("Network: Connected")
      this.isOnline = true
    })

    window.addEventListener("offline", () => {
      console.log("Network: Disconnected")
      this.isOnline = false
      toast.info("Network disconnected - working offline")
    })

    // Listen for service worker messages
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data.type === "SYNC_QUEUED_OPERATIONS") {
          this.triggerSync()
        }
      })
    }

    // Periodic sync check (less frequent)
    setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.checkAndSync()
      }
    }, 60000) // Check every 60 seconds instead of 30
  }

  // Method to update online status from external source (like useOffline hook)
  setOnlineStatus(online: boolean) {
    const wasOnline = this.isOnline
    this.isOnline = online

    // Debounce status updates to prevent rapid firing
    if (this.onlineStatusUpdateTimeout) {
      clearTimeout(this.onlineStatusUpdateTimeout)
    }

    this.onlineStatusUpdateTimeout = setTimeout(() => {
      // If we just came back online, trigger sync
      if (!wasOnline && online) {
        toast.success("Connection restored - syncing data...")
        setTimeout(() => this.triggerSync(), 2000)
      } else if (wasOnline && !online) {
        toast.info("Working offline - changes will sync when online")
      }
    }, 1000)
  }

  async queueOperation(
    type: "income" | "expense" | "user" | "dueAccount" | "menuItem",
    operation: "create" | "update" | "delete",
    data: any,
    originalId?: string,
  ): Promise<string> {
    const id = `${type}_${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // For updates, check if there's already a pending operation for this record
    if (operation === "update" && data._id) {
      await this.consolidatePendingOperations(type, data._id, operation, data)
    }

    const queuedOp: QueuedOperation = {
      id,
      type,
      operation,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      originalId: originalId || data._id,
    }

    await offlineDB.addQueuedOperation(queuedOp)

    // Store/update in local records for immediate UI updates
    await this.updateLocalRecord(type, operation, data, id)

    // Try to sync immediately if online (with delay to prevent rapid firing)
    if (this.isOnline) {
      setTimeout(() => this.triggerSync(), 1000)
    }

    return id
  }

  private async consolidatePendingOperations(
    type: "income" | "expense" | "user" | "dueAccount" | "menuItem",
    recordId: string,
    newOperation: "create" | "update" | "delete",
    newData: any,
  ) {
    try {
      const existingOperations = await offlineDB.getQueuedOperations()

      // Find operations for the same record
      const relatedOperations = existingOperations.filter(
        (op) => op.type === type && (op.originalId === recordId || op.data._id === recordId),
      )

      if (relatedOperations.length === 0) return
      // Remove all existing operations for this record
      for (const op of relatedOperations) {
        await offlineDB.removeQueuedOperation(op.id)
      }

      // Determine the final operation based on the sequence
      let finalOperation = newOperation
      let finalData = { ...newData }

      // If there was a create operation, and now we're updating, keep it as create with latest data
      const hasCreate = relatedOperations.some((op) => op.operation === "create")
      if (hasCreate && newOperation === "update") {
        finalOperation = "create"
        // Merge the original create data with the update data
        const createOp = relatedOperations.find((op) => op.operation === "create")
        if (createOp) {
          finalData = { ...createOp.data, ...newData }
        }
      }

      // If we're deleting, that takes precedence
      if (newOperation === "delete") {
        finalOperation = "delete"
        finalData = newData
      }

      // Queue the consolidated operation
      const consolidatedId = `${type}_${finalOperation}_${Date.now()}_consolidated`
      const consolidatedOp: QueuedOperation = {
        id: consolidatedId,
        type,
        operation: finalOperation,
        data: finalData,
        timestamp: Date.now(),
        retryCount: 0,
        originalId: recordId,
      }

      await offlineDB.addQueuedOperation(consolidatedOp)
    } catch (error) {
      console.error("Failed to consolidate operations:", error)
    }
  }

  private async updateLocalRecord(
    type: "income" | "expense" | "user" | "dueAccount" | "menuItem",
    operation: "create" | "update" | "delete",
    data: any,
    queueId: string,
  ) {
    const storeName = this.getStoreName(type)

    if (operation === "delete") {
      // For delete operations, remove from local storage
      try {
        await offlineDB.deleteRecord(storeName, data._id)
      } catch (error) {
        console.warn(`Failed to delete ${type} record locally:`, error)
        // Record might not exist locally, which is fine
      }
      return
    }

    // For create/update operations, store/update the record
    const record: OfflineRecord = {
      id: data._id || queueId,
      type,
      data: {
        ...data,
        _id: data._id || queueId,
        _offline: true,
        _localId: queueId,
      },
      timestamp: Date.now(),
      synced: false,
      operation,
      localId: queueId,
    }

    // Check if record already exists and update it
    try {
      const existingRecord = await offlineDB.getRecord(storeName, record.id)
      if (existingRecord) {
        // Update existing record with new data
        record.data = { ...existingRecord.data, ...data, _offline: true }
      }
    } catch (error) {
        console.warn(`Failed to get existing ${type} record locally:`, error)
      // Record doesn't exist, will create new one
    }

    await offlineDB.addRecord(storeName, record)
  }

  async getLocalRecords(type: "income" | "expense" | "user" | "dueAccount" | "menuItem"): Promise<any[]> {
    try {
      const storeName = this.getStoreName(type)
      const records = await offlineDB.getRecords(storeName)

      // Group records by ID and keep the latest version
      const recordMap = new Map<string, any>()

      records.forEach((record) => {
        const id = record.data._id
        const existing = recordMap.get(id)

        if (!existing || record.timestamp > existing._timestamp) {
          recordMap.set(id, {
            ...record.data,
            _offline: !record.synced,
            _localId: record.localId || record.id,
            _timestamp: record.timestamp,
          })
        }
      })

      const uniqueRecords = Array.from(recordMap.values())

      return uniqueRecords.sort((a, b) => {
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

  async cacheServerData(type: "income" | "expense" | "user" | "dueAccount" | "menuItem", data: any[]): Promise<void> {
    try {
      const storeName = this.getStoreName(type)

      // Get existing unsynced records to preserve them
      const existingRecords = await offlineDB.getRecords(storeName, false) // Get unsynced records
      const unsyncedRecords = existingRecords.filter((record) => !record.synced)

      // Clear existing synced records
      const syncedRecords = await offlineDB.getRecords(storeName, true)
      for (const record of syncedRecords) {
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

      // Re-add unsynced records (they take precedence for UI)
      for (const record of unsyncedRecords) {
        await offlineDB.addRecord(storeName, record)
      }

    } catch (error) {
      console.error(`Failed to cache ${type} data:`, error)
    }
  }

  private async checkAndSync() {
    try {
      const operations = await offlineDB.getQueuedOperations()
      if (operations.length > 0) {
        this.triggerSync()
      }
    } catch (error) {
      console.error("Failed to check pending operations:", error)
    }
  }

  async triggerSync(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) {
      return
    }

    this.syncInProgress = true

    try {
      await this.syncQueuedOperations()
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

    // Group operations by record ID to handle them in order
    const operationGroups = new Map<string, QueuedOperation[]>()

    operations.forEach((op) => {
      const key = `${op.type}_${op.originalId || op.data._id}`
      if (!operationGroups.has(key)) {
        operationGroups.set(key, [])
      }
      operationGroups.get(key)!.push(op)
    })

    // Process each group of operations - use Array.from() for compatibility
    for (const [key, groupOps] of Array.from(operationGroups.entries())) {
      // Sort operations by timestamp to process in order
      groupOps.sort((a, b) => a.timestamp - b.timestamp)

      // Process the final operation (latest one)
      const finalOperation = groupOps[groupOps.length - 1]

      try {
        await this.syncSingleOperation(finalOperation)

        // Remove all operations for this record group
        for (const op of groupOps) {
          await offlineDB.removeQueuedOperation(op.id)
        }
      } catch (error) {
        console.error(`Failed to sync operations for ${key}:`, error)

        // Handle retry logic for the final operation
        await this.handleSyncError(finalOperation, error)
      }
    }
  }

  private async handleSyncError(operation: QueuedOperation, error: any) {
    // Check if it's a client error (4xx) that shouldn't be retried
    const isClientError = error instanceof Error && error.message.includes("HTTP 4")

    if (isClientError) {
      await offlineDB.removeQueuedOperation(operation.id)
      toast.error(`Sync failed: ${error.message}`)
      return
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
    } else {
      console.error(`Max retries reached for operation ${operation.id}, removing from queue`)
      await offlineDB.removeQueuedOperation(operation.id)
      toast.error(`Failed to sync operation after multiple attempts`)
    }
  }

  private async syncSingleOperation(operation: QueuedOperation) {
    const { type, operation: op, data } = operation

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
          result = await this.syncIncomeOperation(op, cleanData, isTemporaryId)
          break

        case "expense":
          result = await this.syncExpenseOperation(op, cleanData, isTemporaryId)
          break

        case "dueAccount":
          result = await this.syncDueAccountOperation(op, cleanData, isTemporaryId)
          break

        case "menuItem":
          result = await this.syncMenuItemOperation(op, cleanData, isTemporaryId)
          break

        case "user":
          result = await this.syncUserOperation(op, cleanData, isTemporaryId)
          break

        default:
          throw new Error(`Unknown type: ${type}`)
      }

      // Check if the operation was successful
      if (!result || !result.success) {
        throw new Error(`Server action failed: ${result?.error || "Unknown error"}`)
      }

      // Update local record sync status
      await this.updateLocalRecordAfterSync(type, op, data, result)
    } catch (error) {
      console.error(`Failed to sync ${op} ${type}:`, error)
      throw error
    }
  }

  private async syncIncomeOperation(operation: "create" | "update" | "delete", cleanData: any, isTemporaryId: boolean) {
    // Import server actions dynamically to avoid issues
    const { createIncomeRecord, updateIncomeRecord, deleteIncomeRecord } = await import("@/app/actions/income-records")

    switch (operation) {
      case "create":
        // For creates, don't send the temporary _id
        if (isTemporaryId) {
          delete cleanData._id
        }
        return await createIncomeRecord(cleanData)

      case "update":
        // For updates with temporary IDs, treat as create
        if (isTemporaryId) {
          delete cleanData._id
          return await createIncomeRecord(cleanData)
        } else {
          return await updateIncomeRecord(cleanData._id, cleanData)
        }

      case "delete":
        // Don't try to delete temporary records
        if (isTemporaryId) {
          return { success: true }
        }
        return await deleteIncomeRecord(cleanData._id)

      default:
        throw new Error(`Unknown operation: ${operation}`)
    }
  }

  private async syncExpenseOperation(
    operation: "create" | "update" | "delete",
    cleanData: any,
    isTemporaryId: boolean,
  ) {
    // Import server actions dynamically to avoid issues
    const { createExpenseRecord, updateExpenseRecord, deleteExpenseRecord } = await import(
      "@/app/actions/expense-records"
    )

    switch (operation) {
      case "create":
        if (isTemporaryId) {
          delete cleanData._id
        }
        return await createExpenseRecord(cleanData)

      case "update":
        if (isTemporaryId) {
          delete cleanData._id
          return await createExpenseRecord(cleanData)
        } else {
          return await updateExpenseRecord(cleanData._id, cleanData)
        }

      case "delete":
        if (isTemporaryId) {
          return { success: true }
        }
        return await deleteExpenseRecord(cleanData._id)

      default:
        throw new Error(`Unknown operation: ${operation}`)
    }
  }

  private async syncDueAccountOperation(
    operation: "create" | "update" | "delete",
    cleanData: any,
    isTemporaryId: boolean,
  ) {
    // Import server actions dynamically to avoid issues
    const { createDueAccount, updateDueAccount, deleteDueAccount } = await import("@/app/actions/due-accounts")

    switch (operation) {
      case "create":
        // For creates, don't send the temporary _id
        if (isTemporaryId) {
          delete cleanData._id
        }
        return await createDueAccount(cleanData)

      case "update":
        // For updates with temporary IDs, treat as create
        if (isTemporaryId) {
          delete cleanData._id
          return await createDueAccount(cleanData)
        } else {
          return await updateDueAccount(cleanData._id, cleanData)
        }

      case "delete":
        // Don't try to delete temporary records
        if (isTemporaryId) {
          return { success: true }
        }
        return await deleteDueAccount(cleanData._id)

      default:
        throw new Error(`Unknown operation: ${operation}`)
    }
  }

  private async syncMenuItemOperation(
    operation: "create" | "update" | "delete",
    cleanData: any,
    isTemporaryId: boolean,
  ) {
    // Import server actions dynamically to avoid issues
    const { createMenuItem, updateMenuItem, deleteMenuItem } = await import("@/app/actions/menu-items")

    switch (operation) {
      case "create":
        if (isTemporaryId) {
          delete cleanData._id
        }
        return await createMenuItem(cleanData)

      case "update":
        if (isTemporaryId) {
          delete cleanData._id
          return await createMenuItem(cleanData)
        } else {
          return await updateMenuItem(cleanData._id, cleanData)
        }

      case "delete":
        if (isTemporaryId) {
          return { success: true }
        }
        return await deleteMenuItem(cleanData._id)

      default:
        throw new Error(`Unknown operation: ${operation}`)
    }
  }

  private async syncUserOperation(operation: "create" | "update" | "delete", cleanData: any, isTemporaryId: boolean) {
    // For users, we'll still use fetch since we don't have server actions for them yet
    let endpoint = "/api/users"
    let method = ""
    let body = ""

    switch (operation) {
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
          return { success: true }
        }
        method = "DELETE"
        endpoint = `${endpoint}/${cleanData._id}`
        break

      default:
        throw new Error(`Unknown operation: ${operation}`)
    }

    const requestOptions: RequestInit = {
      method,
      headers: { "Content-Type": "application/json" },
    }

    if (body) {
      requestOptions.body = body
    }

    const response = await fetch(endpoint, requestOptions)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    return await response.json()
  }

  private async updateLocalRecordAfterSync(
    type: "income" | "expense" | "user" | "dueAccount" | "menuItem",
    operation: "create" | "update" | "delete",
    originalData: any,
    result: any,
  ) {
    const storeName = this.getStoreName(type)

    if (operation === "delete") {
      // Remove the record from local storage
      await offlineDB.deleteRecord(storeName, originalData._id)
      return
    }

    // Get the server record from the result
    const serverRecord = result.record || result.user || result.account || result

    // Update local record with server data and mark as synced
    const record: OfflineRecord = {
      id: serverRecord._id,
      type,
      data: serverRecord,
      timestamp: Date.now(),
      synced: true,
      operation,
    }

    await offlineDB.addRecord(storeName, record)

    // Remove the temporary local record if it exists and has a different ID
    const isTemporaryId = originalData._id && originalData._id.toString().startsWith("temp_")
    if (isTemporaryId && originalData._id !== serverRecord._id) {
      try {
        await offlineDB.deleteRecord(storeName, originalData._id)
      } catch (error) {
        console.warn(`Failed to delete temporary ${type} record locally:`, error)
        // Ignore if record doesn't exist
      }
    }
  }

  private getStoreName(type: "income" | "expense" | "user" | "dueAccount" | "menuItem"): string {
    switch (type) {
      case "income":
        return "incomeRecords"
      case "expense":
        return "expenseRecords"
      case "dueAccount":
        return "dueAccounts"
      case "user":
        return "users"
      case "dueAccount":
        return "dueAccounts"
      case "menuItem":
        return "menuItems"
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
      await offlineDB.clearStore("dueAccounts")
      await offlineDB.clearStore("menuItems")
      await offlineDB.clearStore("queuedOperations")
      await offlineDB.clearStore("apiCache")
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
