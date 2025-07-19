import { offlineDB, type QueuedOperation, type OfflineRecord } from "./indexeddb"
import { toast } from "sonner"

export class SyncManager {
  private isOnline = typeof navigator !== "undefined" ? navigator.onLine : true
  private syncInProgress = false
  private syncCallbacks: (() => void)[] = []
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map()
  private onlineStatusUpdateTimeout: NodeJS.Timeout | null = null
  private batchTimeout: NodeJS.Timeout | null = null
  private pendingBatch: Map<string, QueuedOperation> = new Map()

  // Optimized intervals for mobile performance
  private readonly ONLINE_CHECK_INTERVAL = 180000 // 3 minutes when online
  private readonly OFFLINE_CHECK_INTERVAL = 90000 // 1.5 minutes when offline
  private readonly BATCH_DELAY = 3000 // 3 seconds to batch operations (increased for mobile)

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

      // Only sync on startup if there are pending operations and we're online
      if (this.isOnline) {
        const pendingCount = await this.getPendingOperationsCount()
        if (pendingCount > 0) {
          // Delay sync to avoid blocking UI on startup
          setTimeout(() => this.triggerSync(), 5000)
        }
      }
    } catch (error) {
      console.error("Failed to initialize offline database:", error)
    }
  }

  private setupEventListeners() {
    // Optimized network event listeners
    window.addEventListener("online", () => {
      console.log("Network: Connected")
      this.isOnline = true
      // Immediate sync when coming back online
      setTimeout(() => this.triggerSync(), 2000)
    })

    window.addEventListener("offline", () => {
      console.log("Network: Disconnected")
      this.isOnline = false
      toast.info("Working offline - changes will sync when online")
    })

    // Mobile-specific optimizations
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && this.isOnline && !this.syncInProgress) {
        // App became visible, check for pending operations
        setTimeout(() => this.checkAndSync(), 3000)
      }
    })

    // Listen for service worker messages
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data.type === "SYNC_QUEUED_OPERATIONS") {
          this.triggerSync()
        }
      })
    }

    // Reduced frequency polling for mobile battery optimization
    setInterval(
      () => {
        if (this.isOnline && !this.syncInProgress) {
          this.checkAndSync()
        }
      },
      this.isOnline ? this.ONLINE_CHECK_INTERVAL : this.OFFLINE_CHECK_INTERVAL,
    )
  }

  setOnlineStatus(online: boolean) {
    const wasOnline = this.isOnline
    this.isOnline = online

    // Debounce status updates to prevent rapid firing
    if (this.onlineStatusUpdateTimeout) {
      clearTimeout(this.onlineStatusUpdateTimeout)
    }

    this.onlineStatusUpdateTimeout = setTimeout(() => {
      if (!wasOnline && online) {
        console.log("Internet connectivity restored - triggering sync...")
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
    const recordKey = `${type}_${originalId || data._id}`

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

    // Handle delete operations immediately - don't batch them
    if (operation === "delete") {
      console.log("Processing delete operation immediately:", queuedOp)
      await this.updateLocalRecord(type, operation, data, id)
      await offlineDB.addQueuedOperation(queuedOp)

      // Trigger sync immediately if online
      if (this.isOnline) {
        setTimeout(() => this.triggerSync(), 1000)
      }
      return id
    }

    // Add to pending batch for create/update operations
    this.pendingBatch.set(recordKey, queuedOp)
    await this.updateLocalRecord(type, operation, data, id)
    this.scheduleBatchSync()

    return id
  }

  async markRecordAsDeleted(
    type: "income" | "expense" | "user" | "dueAccount" | "menuItem",
    recordId: string,
  ): Promise<void> {
    const storeName = this.getStoreName(type)

    try {
      console.log(`Marking ${type} record as deleted locally (server delete already completed): ${recordId}`)

      const deletedRecord: OfflineRecord = {
        id: recordId,
        type,
        data: {
          _id: recordId,
          _deleted: true,
          _serverDeleted: true,
        },
        timestamp: Date.now(),
        synced: true,
        operation: "delete",
      }

      await offlineDB.addRecord(storeName, deletedRecord)

      // Remove any pending batch operations for this record
      const batchKey = `${type}_${recordId}`
      if (this.pendingBatch.has(batchKey)) {
        this.pendingBatch.delete(batchKey)
        console.log(`Removed pending batch operation for server-deleted record: ${recordId}`)
      }

      // Remove any queued operations for this record
      const existingOperations = await offlineDB.getQueuedOperations()
      const relatedOperations = existingOperations.filter(
        (op) => op.type === type && (op.originalId === recordId || op.data._id === recordId),
      )

      for (const op of relatedOperations) {
        await offlineDB.removeQueuedOperation(op.id)
        console.log(`Removed queued operation for server-deleted record: ${recordId}`)
      }

      console.log(`Successfully marked ${type} record as deleted locally: ${recordId}`)
    } catch (error) {
      console.error(`Failed to mark ${type} record as deleted locally:`, error)
    }
  }

  private async consolidatePendingOperations(
    type: "income" | "expense" | "user" | "dueAccount" | "menuItem",
    recordId: string,
    newOperation: "create" | "update" | "delete",
    newData: any,
  ) {
    try {
      // Check if record is already marked as server-deleted
      const storeName = this.getStoreName(type)
      try {
        const existingRecord = await offlineDB.getRecord(storeName, recordId)
        if (existingRecord && existingRecord.data._serverDeleted) {
          console.log(`Skipping operation for server-deleted record: ${recordId}`)
          return
        }
      } catch (error) {
        console.warn(`No existing record found for ${type} ${recordId}, proceeding with consolidation`)
      }

      // Check pending batch first
      const batchKey = `${type}_${recordId}`
      const pendingOp = this.pendingBatch.get(batchKey)

      if (pendingOp) {
        if (newOperation === "delete") {
          pendingOp.operation = "delete"
          pendingOp.data = newData
        } else if (pendingOp.operation === "create" && newOperation === "update") {
          pendingOp.data = { ...pendingOp.data, ...newData }
        } else {
          pendingOp.operation = newOperation
          pendingOp.data = newData
          pendingOp.timestamp = Date.now()
        }

        this.pendingBatch.set(batchKey, pendingOp)
        return
      }

      // Check queued operations
      const existingOperations = await offlineDB.getQueuedOperations()
      const relatedOperations = existingOperations.filter(
        (op) => op.type === type && (op.originalId === recordId || op.data._id === recordId),
      )

      if (relatedOperations.length === 0) return

      console.log(`Consolidating ${relatedOperations.length} operations for ${type} ${recordId}`)

      // Remove all existing operations for this record
      for (const op of relatedOperations) {
        await offlineDB.removeQueuedOperation(op.id)
      }

      // Determine the final operation
      let finalOperation = newOperation
      let finalData = { ...newData }

      const hasCreate = relatedOperations.some((op) => op.operation === "create")
      if (hasCreate && newOperation === "update") {
        finalOperation = "create"
        const createOp = relatedOperations.find((op) => op.operation === "create")
        if (createOp) {
          finalData = { ...createOp.data, ...newData }
        }
      }

      if (newOperation === "delete") {
        finalOperation = "delete"
        finalData = newData
      }

      // Add to pending batch
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

      this.pendingBatch.set(`${type}_${recordId}`, consolidatedOp)
      console.log("Consolidated operation created:", consolidatedOp)
    } catch (error) {
      console.error("Failed to consolidate operations:", error)
    }
  }

  private scheduleBatchSync() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
    }

    this.batchTimeout = setTimeout(async () => {
      if (this.pendingBatch.size > 0) {
        // Move batched operations to queue
        for (const operation of Array.from(this.pendingBatch.values())) {
          await offlineDB.addQueuedOperation(operation)
        }

        console.log(`Batched ${this.pendingBatch.size} operations`)
        this.pendingBatch.clear()

        // Trigger sync if online
        if (this.isOnline) {
          this.triggerSync()
        }
      }
    }, this.BATCH_DELAY)
  }

  private async updateLocalRecord(
    type: "income" | "expense" | "user" | "dueAccount" | "menuItem",
    operation: "create" | "update" | "delete",
    data: any,
    queueId: string,
  ) {
    const storeName = this.getStoreName(type)

    if (operation === "delete") {
      try {
        console.log(`Marking ${type} record as deleted locally:`, data._id)

        const deletedRecord: OfflineRecord = {
          id: data._id,
          type,
          data: {
            ...data,
            _deleted: true,
            _localId: queueId,
          },
          timestamp: Date.now(),
          synced: false,
          operation: "delete",
          localId: queueId,
        }

        await offlineDB.addRecord(storeName, deletedRecord)

        // Remove any pending batch operations for this record
        const batchKey = `${type}_${data._id}`
        if (this.pendingBatch.has(batchKey)) {
          this.pendingBatch.delete(batchKey)
          console.log(`Removed pending batch operation for deleted record: ${data._id}`)
        }

        console.log(`Successfully marked ${type} record as deleted locally: ${data._id}`)
      } catch (error) {
        console.error(`Failed to mark ${type} record as deleted locally:`, error)
      }
      return
    }

    // For create/update operations
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

    try {
      const existingRecord = await offlineDB.getRecord(storeName, record.id)
      if (existingRecord) {
        record.data = { ...existingRecord.data, ...data, _offline: true }
      }
    } catch (error) {
      console.warn(`Failed to get existing ${type} record locally:`, error)
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

        // Skip deleted records
        if (record.data._deleted) {
          recordMap.delete(id)
          return
        }

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
      const existingRecords = await offlineDB.getRecords(storeName, false)
      const unsyncedRecords = existingRecords.filter((record) => !record.synced)
      const deletedRecords = unsyncedRecords.filter((record) => record.operation === "delete")

      // Clear existing synced records
      const syncedRecords = await offlineDB.getRecords(storeName, true)
      for (const record of syncedRecords) {
        await offlineDB.deleteRecord(storeName, record.id)
      }

      // Add new server data, skip records marked as deleted locally
      const deletedIds = new Set(deletedRecords.map((record) => record.data._id))

      for (const item of data) {
        if (deletedIds.has(item._id)) {
          console.log(`Skipping server data for locally deleted record: ${item._id}`)
          continue
        }

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

      // Only show success toast for manual syncs or if there were operations
      const pendingCount = await this.getPendingOperationsCount()
      if (pendingCount === 0) {
        toast.success("Data synced successfully")
      }
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

    if (operations.length === 0) return

    // Prioritize delete operations
    const deleteOperations = operations.filter((op) => op.operation === "delete")
    const otherOperations = operations.filter((op) => op.operation !== "delete")

    if (deleteOperations.length > 0) {
      console.log(`Processing ${deleteOperations.length} delete operations first`)
      await this.processOperations(deleteOperations)
    }

    if (otherOperations.length > 0) {
      console.log(`Processing ${otherOperations.length} other operations`)
      const operationsByType = new Map<string, QueuedOperation[]>()

      otherOperations.forEach((op) => {
        if (!operationsByType.has(op.type)) {
          operationsByType.set(op.type, [])
        }
        operationsByType.get(op.type)!.push(op)
      })

      const syncPromises = Array.from(operationsByType.entries()).map(([type, typeOps]) =>
        this.syncOperationsOfType(type, typeOps),
      )

      await Promise.allSettled(syncPromises)
    }
  }

  private async processOperations(operations: QueuedOperation[]) {
    const BATCH_SIZE = 3 // Reduced batch size for mobile

    for (let i = 0; i < operations.length; i += BATCH_SIZE) {
      const batch = operations.slice(i, i + BATCH_SIZE)

      const batchPromises = batch.map(async (operation) => {
        try {
          await this.syncSingleOperation(operation)
          await offlineDB.removeQueuedOperation(operation.id)
          console.log(`Synced ${operation.type} ${operation.operation}`)
        } catch (error) {
          console.error(`Failed to sync ${operation.type}:`, error)
          await this.handleSyncError(operation, error)
        }
      })

      await Promise.allSettled(batchPromises)
    }
  }

  private async syncOperationsOfType(type: string, operations: QueuedOperation[]) {
    const BATCH_SIZE = 3 // Reduced batch size for mobile

    for (let i = 0; i < operations.length; i += BATCH_SIZE) {
      const batch = operations.slice(i, i + BATCH_SIZE)

      const batchPromises = batch.map(async (operation) => {
        try {
          await this.syncSingleOperation(operation)
          await offlineDB.removeQueuedOperation(operation.id)
          console.log(`Synced ${operation.type} ${operation.operation}`)
        } catch (error) {
          console.error(`Failed to sync ${operation.type}:`, error)
          await this.handleSyncError(operation, error)
        }
      })

      await Promise.allSettled(batchPromises)
    }
  }

  private async handleSyncError(operation: QueuedOperation, error: any) {
    const isClientError = error instanceof Error && error.message.includes("HTTP 4")

    if (isClientError) {
      console.log(`Client error for operation ${operation.id}, removing from queue`)
      await offlineDB.removeQueuedOperation(operation.id)
      toast.error(`Sync failed: ${error.message}`)
      return
    }

    operation.retryCount++
    if (operation.retryCount < 3) {
      await offlineDB.addQueuedOperation(operation)

      const retryDelay = Math.min(2000 * Math.pow(2, operation.retryCount), 15000) // Reduced delays for mobile
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

  private async syncSingleOperation(operation: QueuedOperation) {
    const { type, operation: op, data } = operation
    const cleanData = { ...data }
    delete cleanData._offline
    delete cleanData._localId
    delete cleanData._timestamp

    const isTemporaryId = cleanData._id && cleanData._id.toString().startsWith("temp_")

    let result: any

    try {
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

      if (!result || !result.success) {
        throw new Error(`Server action failed: ${result?.error || "Unknown error"}`)
      }

      console.log(`Successfully synced ${op} ${type} via server action`)
      await this.updateLocalRecordAfterSync(type, op, data, result)
    } catch (error) {
      console.error(`Failed to sync ${op} ${type}:`, error)
      throw error
    }
  }

  private async syncIncomeOperation(operation: "create" | "update" | "delete", cleanData: any, isTemporaryId: boolean) {
    const { createIncomeRecord, updateIncomeRecord, deleteIncomeRecord } = await import("@/app/actions/income-records")

    switch (operation) {
      case "create":
        if (isTemporaryId) {
          delete cleanData._id
        }
        console.log(`Creating income record via server action:`, cleanData)
        return await createIncomeRecord(cleanData)

      case "update":
        if (isTemporaryId) {
          delete cleanData._id
          console.log(`Creating income record (was temp update) via server action:`, cleanData)
          return await createIncomeRecord(cleanData)
        } else {
          console.log(`Updating income record via server action:`, cleanData._id, cleanData)
          return await updateIncomeRecord(cleanData._id, cleanData)
        }

      case "delete":
        if (isTemporaryId) {
          console.log(`Skipping delete of temporary income record: ${cleanData._id}`)
          return { success: true }
        }
        console.log(`Deleting income record via server action:`, cleanData._id)
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
    const { createExpenseRecord, updateExpenseRecord, deleteExpenseRecord } = await import(
      "@/app/actions/expense-records"
    )

    switch (operation) {
      case "create":
        if (isTemporaryId) {
          delete cleanData._id
        }
        console.log(`Creating expense record via server action:`, cleanData)
        return await createExpenseRecord(cleanData)

      case "update":
        if (isTemporaryId) {
          delete cleanData._id
          console.log(`Creating expense record (was temp update) via server action:`, cleanData)
          return await createExpenseRecord(cleanData)
        } else {
          console.log(`Updating expense record via server action:`, cleanData._id, cleanData)
          return await updateExpenseRecord(cleanData._id, cleanData)
        }

      case "delete":
        if (isTemporaryId) {
          console.log(`Skipping delete of temporary expense record: ${cleanData._id}`)
          return { success: true }
        }
        console.log(`Deleting expense record via server action:`, cleanData._id)
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
    const { createDueAccount, updateDueAccount, deleteDueAccount } = await import("@/app/actions/due-accounts")

    switch (operation) {
      case "create":
        if (isTemporaryId) {
          delete cleanData._id
        }
        console.log(`Creating due account via server action:`, cleanData)
        return await createDueAccount(cleanData)

      case "update":
        if (isTemporaryId) {
          delete cleanData._id
          console.log(`Creating due account (was temp update) via server action:`, cleanData)
          return await createDueAccount(cleanData)
        } else {
          console.log(`Updating due account via server action:`, cleanData._id, cleanData)
          return await updateDueAccount(cleanData._id, cleanData)
        }

      case "delete":
        if (isTemporaryId) {
          console.log(`Skipping delete of temporary due account: ${cleanData._id}`)
          return { success: true }
        }
        console.log(`Deleting due account via server action:`, cleanData._id)
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
    const { createMenuItem, updateMenuItem, deleteMenuItem } = await import("@/app/actions/menu-items")

    switch (operation) {
      case "create":
        if (isTemporaryId) {
          delete cleanData._id
        }
        console.log(`Creating menu item via server action:`, cleanData)
        return await createMenuItem(cleanData)

      case "update":
        if (isTemporaryId) {
          delete cleanData._id
          console.log(`Creating menu item (was temp update) via server action:`, cleanData)
          return await createMenuItem(cleanData)
        } else {
          console.log(`Updating menu item via server action:`, cleanData._id, cleanData)
          return await updateMenuItem(cleanData._id, cleanData)
        }

      case "delete":
        if (isTemporaryId) {
          console.log(`Skipping delete of temporary menu item: ${cleanData._id}`)
          return { success: true }
        }
        console.log(`Deleting menu item via server action:`, cleanData._id)
        return await deleteMenuItem(cleanData._id)

      default:
        throw new Error(`Unknown operation: ${operation}`)
    }
  }

  private async syncUserOperation(operation: "create" | "update" | "delete", cleanData: any, isTemporaryId: boolean) {
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
          console.log(`Skipping delete of temporary user record: ${cleanData._id}`)
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

    console.log(`Syncing ${operation} user via API:`, { endpoint, method, data: cleanData, isTemporaryId })

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
      await offlineDB.deleteRecord(storeName, originalData._id)
      console.log(`Permanently removed ${type} record after successful server sync: ${originalData._id}`)
      return
    }

    const serverRecord = result.record || result.user || result.account || result

    const record: OfflineRecord = {
      id: serverRecord._id,
      type,
      data: serverRecord,
      timestamp: Date.now(),
      synced: true,
      operation,
    }

    await offlineDB.addRecord(storeName, record)

    const isTemporaryId = originalData._id && originalData._id.toString().startsWith("temp_")
    if (isTemporaryId && originalData._id !== serverRecord._id) {
      try {
        await offlineDB.deleteRecord(storeName, originalData._id)
      } catch (error) {
        console.warn(`Failed to delete temporary ${type} record locally:`, error)
      }
    }
  }

  private getStoreName(type: "income" | "expense" | "user" | "dueAccount" | "menuItem"): string {
    switch (type) {
      case "income":
        return "incomeRecords"
      case "expense":
        return "expenseRecords"
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
      this.pendingBatch.clear()
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
      return operations.length + this.pendingBatch.size
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
