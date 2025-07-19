import { getDashboardStats } from "@/app/actions/dashboard"
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
      // Try to get from server first if online
      if (syncManager.getOnlineStatus()) {
        try {
          const response = await fetch("/api/income-records")
          if (response.ok) {
            const data = await response.json()
            // Cache the server data
            await syncManager.cacheServerData("income", data.records || [])
            return data.records || []
          }
        } catch (error) {
          console.log("Server fetch failed, using local data:", error)
        }
      }

      // Fallback to local data
      return await syncManager.getLocalRecords("income")
    } catch (error) {
      console.error("Failed to get income records:", error)
      return []
    }
  }


  static async createIncomeRecord(data: Partial<IncomeRecord>): Promise<{ success: boolean; record?: IncomeRecord }> {
    try {
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
      await syncManager.queueOperation("income", "delete", { _id: id }, id)
      return { success: true }
    } catch (error) {
      console.error("Failed to delete income record:", error)
      return { success: false }
    }
  }

  // Expense Records
  static async getExpenseRecords(): Promise<ExpenseRecord[]> {
    try {
      // Try to get from server first if online
      if (syncManager.getOnlineStatus()) {
        try {
          const response = await fetch("/api/expense-records")
          if (response.ok) {
            const data = await response.json()
            // Cache the server data
            await syncManager.cacheServerData("expense", data.records || [])
            return data.records || []
          }
        } catch (error) {
          console.log("Server fetch failed, using local data:", error)
        }
      }

      // Fallback to local data
      return await syncManager.getLocalRecords("expense")
    } catch (error) {
      console.error("Failed to get expense records:", error)
      return []
    }
  }

  static async createExpenseRecord(
    data: Partial<ExpenseRecord>,
  ): Promise<{ success: boolean; record?: ExpenseRecord }> {
    try {
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
      // Try to get fresh data from server if online
      if (navigator.onLine) {
        try {
          const response = await fetch("/api/due-accounts")
          if (response.ok) {
            const serverData = await response.json()
            // Cache the server data
            await syncManager.cacheServerData("dueAccount", serverData.accounts || [])
            return serverData.accounts || []
          }
        } catch (error) {
          console.warn("Failed to fetch from server, using local data:", error)
        }
      }

      // Fallback to local data
      const localRecords = await syncManager.getLocalRecords("dueAccount")
      return localRecords
    } catch (error) {
      console.error("Failed to get due accounts:", error)
      return []
    }
  }

  static async createDueAccount(data: any): Promise<{ success: boolean; record?: any }> {
    try {
      // Generate a temporary ID for offline use
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const recordData = {
        ...data,
        _id: tempId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      if (navigator.onLine) {
        const result = await createDueAccount(recordData)
        if (result.record) {
          await syncManager.cacheServerData("dueAccount", [result.record])
          return { success: true, record: result.record }
        }
        return { success: false }
      }

      // Queue for offline sync and update local cache immediately
      await syncManager.queueOperation("dueAccount", "create", recordData)
      await this.updateLocalDueAccountCache("create", recordData)
      return { success: true, record: recordData }
    } catch (error) {
      console.error("Failed to create due account:", error)
      return { success: false }
    }
  }

  static async updateDueAccount(id: string, data: any): Promise<{ success: boolean; record?: any }> {
    try {
      const recordData = {
        ...data,
        _id: id,
        updatedAt: new Date().toISOString(),
      }

      if (navigator.onLine) {
        const result = await updateDueAccount(id, recordData)
        if (result.record) {
          await syncManager.cacheServerData("dueAccount", [result.record])
          return { success: true, record: result.record }
        }
        return { success: false }
      }

      // Queue for offline sync and update local cache immediately
      await syncManager.queueOperation("dueAccount", "update", recordData, id)
      await this.updateLocalDueAccountCache("update", recordData)
      return { success: true, record: recordData }
    } catch (error) {
      console.error("Failed to update due account:", error)
      return { success: false }
    }
  }

  static async deleteDueAccount(id: string): Promise<{ success: boolean }> {
    try {
      if (navigator.onLine) {
        await deleteDueAccount(id)
        return { success: true }
      }

      // Queue for offline sync and update local cache immediately
      await syncManager.queueOperation("dueAccount", "delete", { _id: id }, id)
      await this.updateLocalDueAccountCache("delete", { _id: id })
      return { success: true }
    } catch (error) {
      console.error("Failed to delete due account:", error)
      return { success: false }
    }
  }

  // Helper method to update local due account cache
  private static async updateLocalDueAccountCache(operation: "create" | "update" | "delete", record: any) {
    try {
      const storeName = "dueAccounts"

      if (operation === "delete") {
        await offlineDB.deleteRecord(storeName, record._id)
      } else {
        const offlineRecord = {
          id: record._id,
          type: "dueAccount" as const,
          data: record,
          timestamp: Date.now(),
          synced: navigator.onLine, // Mark as synced if we're online
          operation,
        }
        await offlineDB.addRecord(storeName, offlineRecord)
      }

      console.log(`Local due account cache updated: ${operation} for record ${record._id}`)
    } catch (error) {
      console.error("Failed to update local due account cache:", error)
    }
  }

  // Dashboard data using server action
  static async getDashboardStats(dateFilter = "month"): Promise<any> {
    try {
      // Check cache first
      const cacheKey = `/api/dashboard?filter=${dateFilter}`
      const cachedData = await offlineDB.getCachedApiResponse(cacheKey)

      if (cachedData && navigator.onLine) {
        // Return cached data but fetch fresh data in background
        this.fetchDashboardStatsBackground(dateFilter)
        return cachedData
      }

      if (cachedData) {
        return cachedData
      }

      if (navigator.onLine) {
        console.log("Fetching dashboard stats using server action...")
        const data = await getDashboardStats(dateFilter)

        // Cache the response for 5 minutes
        await offlineDB.cacheApiResponse(cacheKey, data, 5)

        return data
      }

      // Fallback: calculate from local data
      return await this.calculateDashboardStatsFromLocal(dateFilter)
    } catch (error) {
      console.error("Failed to get dashboard stats:", error)
      return await this.calculateDashboardStatsFromLocal(dateFilter)
    }
  }

  private static async fetchDashboardStatsBackground(dateFilter: string) {
    try {
      const data = await getDashboardStats(dateFilter)
      const cacheKey = `/api/dashboard?filter=${dateFilter}`
      await offlineDB.cacheApiResponse(cacheKey, data, 5)
    } catch (error) {
        console.error("Failed to fetch dashboard stats in background:", error)
      // Silent fail for background fetch
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

  // Menu Items
  static async getMenuItems(category?: string, availableOnly?: boolean): Promise<any[]> {
    try {
      // Try to get from server first if online
      if (syncManager.getOnlineStatus()) {
        try {
          const params = new URLSearchParams()
          if (category) params.append("category", category)
          if (availableOnly) params.append("available", "true")

          const response = await fetch(`/api/menu-items?${params.toString()}`)
          if (response.ok) {
            const data = await response.json()
            // Cache the server data
            await syncManager.cacheServerData("menuItem", data.menuItems || [])
            return data.menuItems || []
          }
        } catch (error) {
          console.log("Server fetch failed, using local data:", error)
        }
      }

      // Fallback to local data
      const localItems = await syncManager.getLocalRecords("menuItem")

      return localItems
    } catch (error) {
      console.error("Failed to get menu items:", error)
      return []
    }
  }

  static async createMenuItem(data: any): Promise<{ success: boolean; record?: any }> {
    try {
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const recordData = {
        ...data,
        _id: tempId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      if (navigator.onLine) {
        const result = await createMenuItem(recordData)
        if (result.record) {
          await syncManager.cacheServerData("menuItem", [result.record])
          return { success: true, record: result.record }
        }
        return { success: false }
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
      const recordData = {
        ...data,
        _id: id,
        updatedAt: new Date(),
      }

      if (navigator.onLine) {
        const result = await updateMenuItem(id, recordData)
        if (result.record) {
          await syncManager.cacheServerData("menuItem", [result.record])
          return { success: true, record: result.record }
        }
        return { success: false }
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
        if (navigator.onLine) {
        await deleteMenuItem(id)
        return { success: false }
      }
      await syncManager.queueOperation("menuItem", "delete", { _id: id }, id)
      return { success: true }
    } catch (error) {
      console.error("Failed to delete menu item:", error)
      return { success: false }
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
