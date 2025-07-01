import { getDashboardStats } from "@/app/actions/dashboard"
import { syncManager } from "./sync-manager"
import type { IncomeRecord, ExpenseRecord, User, DueAccount } from "@/types"
import { offlineDB } from "./indexeddb"

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
  static async getDueAccounts(): Promise<DueAccount[]> {
    try {
      // Try to get from server first if online
      if (syncManager.getOnlineStatus()) {
        try {
          const response = await fetch("/api/due-accounts")
          if (response.ok) {
            const data = await response.json()
            // Cache the server data
            await syncManager.cacheServerData("dueAccount", data.accounts || [])
            return data.accounts || []
          }
        } catch (error) {
          console.log("Server fetch failed, using local data:", error)
        }
      }

      // Fallback to local data
      return await syncManager.getLocalRecords("dueAccount")
    } catch (error) {
      console.error("Failed to get due accounts:", error)
      return []
    }
  }

  static async createDueAccount(data: Partial<DueAccount>): Promise<{ success: boolean; account?: DueAccount }> {
    try {
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const accountData = {
        ...data,
        _id: tempId,
        totalDueAmount: 0,
        totalOrders: 0,
        pendingOrders: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await syncManager.queueOperation("dueAccount", "create", accountData)

      return {
        success: true,
        account: accountData as DueAccount,
      }
    } catch (error) {
      console.error("Failed to create due account:", error)
      return { success: false }
    }
  }

  static async updateDueAccount(
    id: string,
    data: Partial<DueAccount>,
  ): Promise<{ success: boolean; account?: DueAccount }> {
    try {
      const accountData = {
        ...data,
        _id: id,
        updatedAt: new Date(),
      }

      await syncManager.queueOperation("dueAccount", "update", accountData, id)

      return {
        success: true,
        account: accountData as DueAccount,
      }
    } catch (error) {
      console.error("Failed to update due account:", error)
      return { success: false }
    }
  }

  static async deleteDueAccount(id: string): Promise<{ success: boolean }> {
    try {
      await syncManager.queueOperation("dueAccount", "delete", { _id: id }, id)
      return { success: true }
    } catch (error) {
      console.error("Failed to delete due account:", error)
      return { success: false }
    }
  }

  // Users
  static async getUsers(): Promise<User[]> {
    try {
      // Try to get from server first if online
      if (syncManager.getOnlineStatus()) {
        try {
          const response = await fetch("/api/users")
          if (response.ok) {
            const data = await response.json()
            // Cache the server data
            await syncManager.cacheServerData("user", data.users || [])
            return data.users || []
          }
        } catch (error) {
          console.log("Server fetch failed, using local data:", error)
        }
      }

      // Fallback to local data
      return await syncManager.getLocalRecords("user")
    } catch (error) {
      console.error("Failed to get users:", error)
      return []
    }
  }

  static async createUser(data: Partial<User>): Promise<{ success: boolean; user?: User }> {
    try {
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const userData = {
        ...data,
        _id: tempId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await syncManager.queueOperation("user", "create", userData)

      return {
        success: true,
        user: userData as User,
      }
    } catch (error) {
      console.error("Failed to create user:", error)
      return { success: false }
    }
  }

  static async updateUser(id: string, data: Partial<User>): Promise<{ success: boolean; user?: User }> {
    try {
      const userData = {
        ...data,
        _id: id,
        updatedAt: new Date(),
      }

      await syncManager.queueOperation("user", "update", userData, id)

      return {
        success: true,
        user: userData as User,
      }
    } catch (error) {
      console.error("Failed to update user:", error)
      return { success: false }
    }
  }

  static async deleteUser(id: string): Promise<{ success: boolean }> {
    try {
      await syncManager.queueOperation("user", "delete", { _id: id }, id)
      return { success: true }
    } catch (error) {
      console.error("Failed to delete user:", error)
      return { success: false }
    }
  }

  // Dashboard data
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
