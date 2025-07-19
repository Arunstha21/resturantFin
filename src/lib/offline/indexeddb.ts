// Enhanced IndexedDB wrapper for offline storage
export interface OfflineRecord {
  id: string
  type: "income" | "expense" | "user" | "dueAccount" | "menuItem"
  data: any
  timestamp: number
  synced: boolean
  operation: "create" | "update" | "delete"
  localId?: string
}

export interface QueuedOperation {
  id: string
  type: "income" | "expense" | "user" | "dueAccount" | "menuItem"
  operation: "create" | "update" | "delete"
  data: any
  timestamp: number
  retryCount: number
  originalId?: string
}

export interface CachedApiResponse {
  url: string
  data: any
  timestamp: number
  expiry: number
}

class OfflineDB {
  private db: IDBDatabase | null = null
  private readonly dbName = "RestaurantFinDB"
  private readonly version = 4

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => {
        console.error("IndexedDB error:", request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Income records store
        if (!db.objectStoreNames.contains("incomeRecords")) {
          const incomeStore = db.createObjectStore("incomeRecords", { keyPath: "id" })
          incomeStore.createIndex("synced", "synced", { unique: false })
          incomeStore.createIndex("timestamp", "timestamp", { unique: false })
          incomeStore.createIndex("date", "data.date", { unique: false })
        }

        // Expense records store
        if (!db.objectStoreNames.contains("expenseRecords")) {
          const expenseStore = db.createObjectStore("expenseRecords", { keyPath: "id" })
          expenseStore.createIndex("synced", "synced", { unique: false })
          expenseStore.createIndex("timestamp", "timestamp", { unique: false })
          expenseStore.createIndex("date", "data.date", { unique: false })
        }

        // Users store
        if (!db.objectStoreNames.contains("users")) {
          const usersStore = db.createObjectStore("users", { keyPath: "id" })
          usersStore.createIndex("synced", "synced", { unique: false })
          usersStore.createIndex("email", "data.email", { unique: false })
        }

        // Due accounts store
        if (!db.objectStoreNames.contains("dueAccounts")) {
          const dueAccountsStore = db.createObjectStore("dueAccounts", { keyPath: "id" })
          dueAccountsStore.createIndex("synced", "synced", { unique: false })
          dueAccountsStore.createIndex("timestamp", "timestamp", { unique: false })
          dueAccountsStore.createIndex("customerName", "data.customerName", { unique: false })
        }

        // Menu items store
        if (!db.objectStoreNames.contains("menuItems")) {
          const menuItemsStore = db.createObjectStore("menuItems", { keyPath: "id" })
          menuItemsStore.createIndex("synced", "synced", { unique: false })
          menuItemsStore.createIndex("category", "data.category", { unique: false })
          menuItemsStore.createIndex("name", "data.name", { unique: false })
          menuItemsStore.createIndex("isAvailable", "data.isAvailable", { unique: false })
        }

        // Queued operations store
        if (!db.objectStoreNames.contains("queuedOperations")) {
          const queueStore = db.createObjectStore("queuedOperations", { keyPath: "id" })
          queueStore.createIndex("timestamp", "timestamp", { unique: false })
          queueStore.createIndex("type", "type", { unique: false })
          queueStore.createIndex("operation", "operation", { unique: false })
        }

        // API cache store
        if (!db.objectStoreNames.contains("apiCache")) {
          const apiCacheStore = db.createObjectStore("apiCache", { keyPath: "url" })
          apiCacheStore.createIndex("timestamp", "timestamp", { unique: false })
          apiCacheStore.createIndex("expiry", "expiry", { unique: false })
        }

        // Settings store for sync metadata
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "key" })
        }
      }
    })
  }

  async addRecord(storeName: string, record: OfflineRecord): Promise<void> {
    if (!this.db) throw new Error("Database not initialized")

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readwrite")
      const store = transaction.objectStore(storeName)
      const request = store.put(record)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        resolve()
      }
    })
  }

  async getRecord(storeName: string, id: string): Promise<OfflineRecord | null> {
    if (!this.db) throw new Error("Database not initialized")

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readonly")
      const store = transaction.objectStore(storeName)
      const request = store.get(id)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || null)
    })
  }

  async getRecords(storeName: string, synced?: boolean): Promise<OfflineRecord[]> {
    if (!this.db) throw new Error("Database not initialized")

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readonly")
      const store = transaction.objectStore(storeName)

      let request: IDBRequest
      if (synced !== undefined) {
        const index = store.index("synced")
        request = index.getAll(synced ? 1 : 0)
      } else {
        request = store.getAll()
      }

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const records = request.result || []
        resolve(records)
      }
    })
  }

  async deleteRecord(storeName: string, id: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized")

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readwrite")
      const store = transaction.objectStore(storeName)
      const request = store.delete(id)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        resolve()
      }
    })
  }

  async addQueuedOperation(operation: QueuedOperation): Promise<void> {
    return this.addRecord("queuedOperations", operation as any)
  }

  async getQueuedOperations(): Promise<QueuedOperation[]> {
    const operations = (await this.getRecords("queuedOperations") as unknown) as QueuedOperation[]
    return operations.sort((a, b) => a.timestamp - b.timestamp)
  }

  async removeQueuedOperation(id: string): Promise<void> {
    return this.deleteRecord("queuedOperations", id)
  }

  async updateSyncStatus(storeName: string, id: string, synced: boolean): Promise<void> {
    if (!this.db) throw new Error("Database not initialized")

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readwrite")
      const store = transaction.objectStore(storeName)
      const getRequest = store.get(id)

      getRequest.onsuccess = () => {
        const record = getRequest.result
        if (record) {
          record.synced = synced
          const putRequest = store.put(record)
          putRequest.onsuccess = () => {
            resolve()
          }
          putRequest.onerror = () => reject(putRequest.error)
        } else {
          resolve()
        }
      }
      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  async cacheApiResponse(url: string, data: any, ttlMinutes = 30): Promise<void> {
    if (!this.db) throw new Error("Database not initialized")

    const cachedResponse: CachedApiResponse = {
      url,
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttlMinutes * 60 * 1000,
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["apiCache"], "readwrite")
      const store = transaction.objectStore("apiCache")
      const request = store.put(cachedResponse)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        resolve()
      }
    })
  }

  async getCachedApiResponse(url: string): Promise<any | null> {
    if (!this.db) throw new Error("Database not initialized")

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["apiCache"], "readonly")
      const store = transaction.objectStore("apiCache")
      const request = store.get(url)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const cached = request.result
        if (cached && cached.expiry > Date.now()) {
          resolve(cached.data)
        } else {
          if (cached) {
            // Remove expired cache
            this.deleteRecord("apiCache", url)
          }
          resolve(null)
        }
      }
    })
  }

  async clearStore(storeName: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized")

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readwrite")
      const store = transaction.objectStore(storeName)
      const request = store.clear()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        resolve()
      }
    })
  }

  async getSetting(key: string): Promise<any> {
    if (!this.db) throw new Error("Database not initialized")

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["settings"], "readonly")
      const store = transaction.objectStore("settings")
      const request = store.get(key)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result?.value)
    })
  }

  async setSetting(key: string, value: any): Promise<void> {
    if (!this.db) throw new Error("Database not initialized")

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["settings"], "readwrite")
      const store = transaction.objectStore("settings")
      const request = store.put({ key, value })

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getStorageStats(): Promise<{ [key: string]: number }> {
    const stats: { [key: string]: number } = {}

    const stores = ["incomeRecords", "expenseRecords", "users", "queuedOperations", "apiCache", "dueAccounts", "menuItems"]

    for (const store of stores) {
      try {
        const records = await this.getRecords(store)
        stats[store] = records.length
      } catch (error) {
        stats[store] = 0
        console.error(`Error getting records from ${store}:`, error)
      }
    }

    return stats
  }
}

export const offlineDB = new OfflineDB()
