import { syncManager } from "./sync-manager"
import type { IncomeRecord, ExpenseRecord } from "@/types"
import { offlineDB } from "./indexeddb"

// Import server actions
import { createDueAccount, deleteDueAccount, updateDueAccount } from "@/app/actions/due-accounts"
import { createMenuItem, deleteMenuItem, updateMenuItem } from "@/app/actions/menu-items"

// Enhanced offline-aware API wrapper that uses server actions
export class OfflineAPI {
  // Income Records
  static async getIncomeRecords(): Promise<IncomeRecord[]> {
    try {
      // Always return local data first for immediate UI response
      const localRecords = await syncManager.getLocalRecords("income")

      // If online, fetch from server in background
      if (syncManager.getOnlineStatus()) {
        this.backgroundFetchIncomeRecords()
      }

      return localRecords
    } catch (error) {
      console.error("Failed to get income records:", error)
      return []
    }
  }

  // Background fetch to update local cache without blocking UI
  private static async backgroundFetchIncomeRecords() {
    try {
      const response = await fetch("/api/income-records")
      if (response.ok) {
        const data = await response.json()
        await syncManager.cacheServerData("income", data.records || [])
      }
    } catch (error) {
      // Silent fail for background fetch
      console.error("Background fetch failed for income records:", error)
    }
  }

  static async createIncomeRecord(data: Partial<IncomeRecord>): Promise<{ success: boolean; record?: IncomeRecord }> {
    try {
      // If online, try server first for immediate consistency
      if (navigator.onLine) {
        try {
          const { createIncomeRecord } = await import("@/app/actions/income-records")
          const result = await createIncomeRecord(data as any)

          if (result.success) {
            // Cache the server result locally
            await syncManager.cacheServerData("income", [result.record])
            return result
          }
        } catch (error) {
          console.log("Server call failed, falling back to offline mode:", error)
        }
      }

      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const recordData = {
        ...data,
        _id: tempId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await syncManager.queueOperation("income", "create", recordData)

      return {
        success: true,
        record: recordData as IncomeRecord,
      }
    } catch (error) {
      console.error("Failed to create income record:", error)
      return { success: false }
    }
  }

  static async updateIncomeRecord(
    id: string,
    data: Partial<IncomeRecord>,
  ): Promise<{ success: boolean; record?: IncomeRecord }> {
    try {
      // If online, try server first
      if (navigator.onLine && !id.startsWith("temp_")) {
        try {
          const { updateIncomeRecord } = await import("@/app/actions/income-records")
          const result = await updateIncomeRecord(id, data as any)

          if (result.success) {
            await syncManager.cacheServerData("income", [result.record])
            return result
          }
        } catch (error) {
          console.log("Server update failed, falling back to offline mode:", error)
        }
      }

      const recordData = {
        ...data,
        _id: id,
        updatedAt: new Date(),
      }

      await syncManager.queueOperation("income", "update", recordData, id)

      return {
        success: true,
        record: recordData as IncomeRecord,
      }
    } catch (error) {
      console.error("Failed to update income record:", error)
      return { success: false }
    }
  }

  static async deleteIncomeRecord(id: string): Promise<{ success: boolean }> {
    try {
      console.log(`Deleting income record: ${id}`)

      // If online and not a temporary ID, try server first
      if (navigator.onLine && !id.startsWith("temp_")) {
        try {
          const { deleteIncomeRecord } = await import("@/app/actions/income-records")
          const result = await deleteIncomeRecord(id)

          if (result.success) {
            // Server delete succeeded - mark as deleted locally but don't queue for sync
            await syncManager.markRecordAsDeleted("income", id)
            return { success: true }
          }
        } catch (error) {
          console.log("Server delete failed, falling back to offline mode:", error)
        }
      }

      // Queue for offline sync only if server delete failed or we're offline
      await syncManager.queueOperation("income", "delete", { _id: id }, id)
      return { success: true }
    } catch (error) {
      console.error("Failed to delete income record:", error)
      return { success: false }
    }
  }

  // Expense Records - similar optimizations
  static async getExpenseRecords(): Promise<ExpenseRecord[]> {
    try {
      // Always return local data first
      const localRecords = await syncManager.getLocalRecords("expense")

      // If online, fetch from server in background
      if (syncManager.getOnlineStatus()) {
        this.backgroundFetchExpenseRecords()
      }

      return localRecords
    } catch (error) {
      console.error("Failed to get expense records:", error)
      return []
    }
  }

  private static async backgroundFetchExpenseRecords() {
    try {
      const response = await fetch("/api/expense-records")
      if (response.ok) {
        const data = await response.json()
        await syncManager.cacheServerData("expense", data.records || [])
      }
    } catch (error) {
      // Silent fail for background fetch
      console.error("Background fetch failed for expense records:", error)
    }
  }

  static async createExpenseRecord(
    data: Partial<ExpenseRecord>,
  ): Promise<{ success: boolean; record?: ExpenseRecord }> {
    try {
      // If online, try server first
      if (navigator.onLine) {
        try {
          const { createExpenseRecord } = await import("@/app/actions/expense-records")
          const result = await createExpenseRecord(data as any)

          if (result.success) {
            await syncManager.cacheServerData("expense", [result.record])
            return result
          }
        } catch (error) {
          console.log("Server call failed, falling back to offline mode:", error)
        }
      }

      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const recordData = {
        ...data,
        _id: tempId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await syncManager.queueOperation("expense", "create", recordData)

      return {
        success: true,
        record: recordData as ExpenseRecord,
      }
    } catch (error) {
      console.error("Failed to create expense record:", error)
      return { success: false }
    }
  }

  static async updateExpenseRecord(
    id: string,
    data: Partial<ExpenseRecord>,
  ): Promise<{ success: boolean; record?: ExpenseRecord }> {
    try {
      // If online and not a temporary ID, try server first
      if (navigator.onLine && !id.startsWith("temp_")) {
        try {
          const { updateExpenseRecord } = await import("@/app/actions/expense-records")
          const result = await updateExpenseRecord(id, data as any)

          if (result.success) {
            await syncManager.cacheServerData("expense", [result.record])
            return result
          }
        } catch (error) {
          console.log("Server update failed, falling back to offline mode:", error)
        }
      }

      const recordData = {
        ...data,
        _id: id,
        updatedAt: new Date(),
      }

      await syncManager.queueOperation("expense", "update", recordData, id)

      return {
        success: true,
        record: recordData as ExpenseRecord,
      }
    } catch (error) {
      console.error("Failed to update expense record:", error)
      return { success: false }
    }
  }

  static async deleteExpenseRecord(id: string): Promise<{ success: boolean }> {
    try {
      // If online and not a temporary ID, try server first
      if (navigator.onLine && !id.startsWith("temp_")) {
        try {
          const { deleteExpenseRecord } = await import("@/app/actions/expense-records")
          const result = await deleteExpenseRecord(id)
          if (result.success) {
            // Server delete succeeded - mark as deleted locally but don't queue for sync
            await syncManager.markRecordAsDeleted("expense", id)
            return { success: true }
          }
        } catch (error) {
          console.log("Server delete failed, falling back to offline mode:", error)
        }
      }

      // Queue for offline sync only if server delete failed or we're offline
      await syncManager.queueOperation("expense", "delete", { _id: id }, id)
      return { success: true }
    } catch (error) {
      console.error("Failed to delete expense record:", error)
      return { success: false }
    }
  }

  // Due Accounts
  static async getDueAccounts(): Promise<any[]> {
    try {
      // Always return local data first
      const localRecords = await syncManager.getLocalRecords("dueAccount")

      // If online, fetch from server in background
      if (navigator.onLine) {
        this.backgroundFetchDueAccounts()
      }

      return localRecords
    } catch (error) {
      console.error("Failed to get due accounts:", error)
      return []
    }
  }

  private static async backgroundFetchDueAccounts() {
    try {
      const response = await fetch("/api/due-accounts")
      if (response.ok) {
        const data = await response.json()
        await syncManager.cacheServerData("dueAccount", data.accounts || [])
      }
    } catch (error) {
      // Silent fail for background fetch
      console.error("Background fetch failed for due accounts:", error)
    }
  }

  static async createDueAccount(data: any): Promise<{ success: boolean; record?: any }> {
    try {
      // If online, try server first
      if (navigator.onLine) {
        try {
          const result = await createDueAccount(data)
          if (result.record) {
            await syncManager.cacheServerData("dueAccount", [result.record])
            return { success: true, record: result.record }
          }
        } catch (error) {
          console.log("Server call failed, falling back to offline mode:", error)
        }
      }

      // Generate a temporary ID for offline use
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const recordData = {
        ...data,
        _id: tempId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Queue for offline sync and update local cache immediately
      await syncManager.queueOperation("dueAccount", "create", recordData)
      return { success: true, record: recordData }
    } catch (error) {
      console.error("Failed to create due account:", error)
      return { success: false }
    }
  }

  static async updateDueAccount(id: string, data: any): Promise<{ success: boolean; record?: any }> {
    try {
      // If online and not a temporary ID, try server first
      if (navigator.onLine && !id.startsWith("temp_")) {
        try {
          const result = await updateDueAccount(id, data)
          if (result.record) {
            await syncManager.cacheServerData("dueAccount", [result.record])
            return { success: true, record: result.record }
          }
        } catch (error) {
          console.log("Server update failed, falling back to offline mode:", error)
        }
      }

      const recordData = {
        ...data,
        _id: id,
        updatedAt: new Date().toISOString(),
      }

      // Queue for offline sync
      await syncManager.queueOperation("dueAccount", "update", recordData, id)
      return { success: true, record: recordData }
    } catch (error) {
      console.error("Failed to update due account:", error)
      return { success: false }
    }
  }

  static async deleteDueAccount(id: string): Promise<{ success: boolean }> {
    try {
      // If online and not a temporary ID, try server first
      if (navigator.onLine && !id.startsWith("temp_")) {
        try {
          await deleteDueAccount(id)
          return { success: true }
        } catch (error) {
          console.log("Server delete failed, falling back to offline mode:", error)
        }
      }

      // Queue for offline sync
      await syncManager.queueOperation("dueAccount", "delete", { _id: id }, id)
      return { success: true }
    } catch (error) {
      console.error("Failed to delete due account:", error)
      return { success: false }
    }
  }

  // Menu Items - similar optimizations
  static async getMenuItems(category?: string, availableOnly?: boolean): Promise<any[]> {
    try {
      // Always return local data first
      const localItems = await syncManager.getLocalRecords("menuItem")

      // Filter locally
      let filteredItems = localItems
      if (category) {
        filteredItems = filteredItems.filter((item) => item.category === category)
      }
      if (availableOnly) {
        filteredItems = filteredItems.filter((item) => item.isAvailable)
      }

      // If online, fetch from server in background
      if (navigator.onLine) {
        this.backgroundFetchMenuItems(category, availableOnly)
      }

      return filteredItems
    } catch (error) {
      console.error("Failed to get menu items:", error)
      return []
    }
  }

  private static async backgroundFetchMenuItems(category?: string, availableOnly?: boolean) {
    try {
      const params = new URLSearchParams()
      if (category) params.append("category", category)
      if (availableOnly) params.append("available", "true")

      const response = await fetch(`/api/menu-items?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        await syncManager.cacheServerData("menuItem", data.menuItems || [])
      }
    } catch (error) {
      // Silent fail for background fetch
      console.error("Background fetch failed for menu items:", error)
    }
  }

  static async createMenuItem(data: any): Promise<{ success: boolean; record?: any }> {
    try {
      // If online, try server first
      if (navigator.onLine) {
        try {
          const result = await createMenuItem(data)
          if (result.record) {
            await syncManager.cacheServerData("menuItem", [result.record])
            return { success: true, record: result.record }
          }
        } catch (error) {
          console.log("Server call failed, falling back to offline mode:", error)
        }
      }

      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const recordData = {
        ...data,
        _id: tempId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await syncManager.queueOperation("menuItem", "create", recordData)

      return {
        success: true,
        record: recordData,
      }
    } catch (error) {
      console.error("Failed to create menu item:", error)
      return { success: false }
    }
  }

  static async updateMenuItem(id: string, data: any): Promise<{ success: boolean; record?: any }> {
    try {
      // If online and not a temporary ID, try server first
      if (navigator.onLine && !id.startsWith("temp_")) {
        try {
          const result = await updateMenuItem(id, data)
          if (result.record) {
            await syncManager.cacheServerData("menuItem", [result.record])
            return { success: true, record: result.record }
          }
        } catch (error) {
          console.log("Server update failed, falling back to offline mode:", error)
        }
      }

      const recordData = {
        ...data,
        _id: id,
        updatedAt: new Date(),
      }

      await syncManager.queueOperation("menuItem", "update", recordData, id)

      return {
        success: true,
        record: recordData,
      }
    } catch (error) {
      console.error("Failed to update menu item:", error)
      return { success: false }
    }
  }

  static async deleteMenuItem(id: string): Promise<{ success: boolean }> {
    try {
      // If online and not a temporary ID, try server first
      if (navigator.onLine && !id.startsWith("temp_")) {
        try {
          await deleteMenuItem(id)
          return { success: true }
        } catch (error) {
          console.log("Server delete failed, falling back to offline mode:", error)
        }
      }

      await syncManager.queueOperation("menuItem", "delete", { _id: id }, id)
      return { success: true }
    } catch (error) {
      console.error("Failed to delete menu item:", error)
      return { success: false }
    }
  }

  // Dashboard data using server action
  static async getDashboardStats(dateFilter = "month"): Promise<any> {
    try {
      // Check cache first
      const cacheKey = `/api/dashboard?filter=${dateFilter}`
      const cachedData = await offlineDB.getCachedApiResponse(cacheKey)

      if (cachedData) {
        // Return cached data immediately
        // If online, fetch fresh data in background
        if (navigator.onLine) {
          this.backgroundFetchDashboardStats(dateFilter)
        }
        return cachedData
      }

      if (navigator.onLine) {
        try {
          const { getDashboardStats } = await import("@/app/actions/dashboard")
          const data = await getDashboardStats(dateFilter)

          // Cache the response for 5 minutes
          await offlineDB.cacheApiResponse(cacheKey, data, 5)

          return data
        } catch (error) {
          console.error("Failed to fetch dashboard stats:", error)
        }
      }

      // Fallback: calculate from local data
      return await this.calculateDashboardStatsFromLocal(dateFilter)
    } catch (error) {
      console.error("Failed to get dashboard stats:", error)
      return await this.calculateDashboardStatsFromLocal(dateFilter)
    }
  }

  private static async backgroundFetchDashboardStats(dateFilter: string) {
    try {
      const { getDashboardStats } = await import("@/app/actions/dashboard")
      const data = await getDashboardStats(dateFilter)
      const cacheKey = `/api/dashboard?filter=${dateFilter}`
      await offlineDB.cacheApiResponse(cacheKey, data, 5)
    } catch (error) {
      // Silent fail for background fetch
      console.error("Background fetch failed for dashboard stats:", error)
    }
  }

  private static async calculateDashboardStatsFromLocal(dateFilter: string): Promise<any> {
    try {
      const incomeRecords = await syncManager.getLocalRecords("income")
      const expenseRecords = await syncManager.getLocalRecords("expense")

      // Filter by date
      const now = new Date()
      let startDate: Date

      switch (dateFilter) {
        case "today":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case "month":
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
      }

      const filteredIncome = incomeRecords.filter((record) => new Date(record.date) >= startDate)
      const filteredExpenses = expenseRecords.filter((record) => new Date(record.date) >= startDate)

      const totalIncome = filteredIncome.reduce((sum, record) => sum + (record.totalAmount || 0), 0)
      const totalExpenses = filteredExpenses.reduce((sum, record) => sum + (record.amount || 0), 0)
      const pendingPaymentsCount = filteredIncome.filter((record) => record.paymentStatus === "pending").length

      return {
        totalIncome,
        totalExpenses,
        netProfit: totalIncome - totalExpenses,
        ordersCount: filteredIncome.length,
        expensesCount: filteredExpenses.length,
        averageOrderValue: filteredIncome.length > 0 ? totalIncome / filteredIncome.length : 0,
        pendingPaymentsCount,
        _fromCache: true,
      }
    } catch (error) {
      console.error("Failed to calculate dashboard stats from local data:", error)
      return {
        totalIncome: 0,
        totalExpenses: 0,
        netProfit: 0,
        ordersCount: 0,
        expensesCount: 0,
        averageOrderValue: 0,
        pendingPaymentsCount: 0,
        _fromCache: true,
      }
    }
  }

  // Sync status
  static getSyncStatus() {
    return {
      isOnline: syncManager.getOnlineStatus(),
      isSyncing: syncManager.getSyncStatus(),
    }
  }

  static async getPendingOperationsCount(): Promise<number> {
    return await syncManager.getPendingOperationsCount()
  }

  static async getStorageStats() {
    return await syncManager.getStorageStats()
  }

  static async clearLocalData() {
    return await syncManager.clearLocalData()
  }

  static onSyncComplete(callback: () => void) {
    syncManager.onSyncComplete(callback)
  }

  static triggerSync() {
    return syncManager.triggerSync()
  }
}
