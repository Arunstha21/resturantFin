import { syncManager } from "./sync-manager"
import { offlineDB } from "./indexeddb"

// Import server actions
import { createIncomeRecord, updateIncomeRecord, deleteIncomeRecord } from "@/app/actions/income-records"
import { createExpenseRecord, updateExpenseRecord, deleteExpenseRecord } from "@/app/actions/expense-records"
import { getDashboardStats } from "@/app/actions/dashboard"

// Enhanced offline-aware API wrapper that uses server actions
export class OfflineAPI {
  // Income Records
  static async createIncomeRecord(data: any): Promise<{ success: boolean; record?: any }> {
    try {
      if (navigator.onLine) {
        console.log("Creating income record online using server action...")
        const result = await createIncomeRecord(data)

        // Cache the successful result
        if (result.record) {
          await syncManager.cacheServerData("income", [result.record])
        }

        return result
      }

      // Fallback to offline mode
      console.log("Creating income record offline...")
      const tempId = `temp_income_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const recordWithId = {
        ...data,
        _id: tempId,
        _offline: true,
        _localId: tempId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await syncManager.queueOperation("income", "create", recordWithId, tempId)

      return { success: true, record: recordWithId }
    } catch (error) {
      console.error("Failed to create income record:", error)

      // If server action fails, fall back to offline mode
      console.log("Server action failed, falling back to offline mode...")
      const tempId = `temp_income_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const recordWithId = {
        ...data,
        _id: tempId,
        _offline: true,
        _localId: tempId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await syncManager.queueOperation("income", "create", recordWithId, tempId)

      return { success: true, record: recordWithId }
    }
  }

  static async updateIncomeRecord(id: string, data: any): Promise<{ success: boolean; record?: any }> {
    try {
      // Check if this is a temporary ID
      const isTemporaryId = id.startsWith("temp_")

      if (navigator.onLine && !isTemporaryId) {
        console.log("Updating income record online using server action...")
        const result = await updateIncomeRecord(id, data)

        // Update cache
        if (result.record) {
          await syncManager.cacheServerData("income", [result.record])
        }

        return result
      }

      // Offline mode or temporary ID (treat as create)
      console.log("Updating income record offline...")
      const recordWithId = {
        ...data,
        _id: id,
        _offline: true,
        updatedAt: new Date().toISOString(),
      }

      // If it's a temporary ID, queue as create, otherwise as update
      const operation = isTemporaryId ? "create" : "update"
      await syncManager.queueOperation("income", operation, recordWithId, id)

      return { success: true, record: recordWithId }
    } catch (error) {
      console.error("Failed to update income record:", error)

      // Fall back to offline mode
      console.log("Server action failed, falling back to offline mode...")
      const recordWithId = {
        ...data,
        _id: id,
        _offline: true,
        updatedAt: new Date().toISOString(),
      }

      const isTemporaryId = id.startsWith("temp_")
      const operation = isTemporaryId ? "create" : "update"
      await syncManager.queueOperation("income", operation, recordWithId, id)

      return { success: true, record: recordWithId }
    }
  }

  static async deleteIncomeRecord(id: string): Promise<{ success: boolean }> {
    try {
      // Check if this is a temporary ID
      const isTemporaryId = id.startsWith("temp_")

      if (navigator.onLine && !isTemporaryId) {
        console.log("Deleting income record online using server action...")
        const result = await deleteIncomeRecord(id)
        return result
      }

      // Offline mode or temporary ID
      console.log("Deleting income record offline...")

      // If it's a temporary ID, just remove it locally
      if (isTemporaryId) {
        const storeName = "incomeRecords"
        await offlineDB.deleteRecord(storeName, id)
        return { success: true }
      }

      await syncManager.queueOperation("income", "delete", { _id: id })

      return { success: true }
    } catch (error) {
      console.error("Failed to delete income record:", error)

      // Fall back to offline mode
      console.log("Server action failed, falling back to offline mode...")
      const isTemporaryId = id.startsWith("temp_")

      if (isTemporaryId) {
        const storeName = "incomeRecords"
        await offlineDB.deleteRecord(storeName, id)
        return { success: true }
      }

      await syncManager.queueOperation("income", "delete", { _id: id })

      return { success: true }
    }
  }

  // Expense Records
  static async createExpenseRecord(data: any): Promise<{ success: boolean; record?: any }> {
    try {
      if (navigator.onLine) {
        console.log("Creating expense record online using server action...")
        const result = await createExpenseRecord(data)

        if (result.record) {
          await syncManager.cacheServerData("expense", [result.record])
        }

        return result
      }

      // Offline mode
      console.log("Creating expense record offline...")
      const tempId = `temp_expense_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const recordWithId = {
        ...data,
        _id: tempId,
        _offline: true,
        _localId: tempId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await syncManager.queueOperation("expense", "create", recordWithId, tempId)

      return { success: true, record: recordWithId }
    } catch (error) {
      console.error("Failed to create expense record:", error)

      // Fall back to offline mode
      console.log("Server action failed, falling back to offline mode...")
      const tempId = `temp_expense_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const recordWithId = {
        ...data,
        _id: tempId,
        _offline: true,
        _localId: tempId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await syncManager.queueOperation("expense", "create", recordWithId, tempId)

      return { success: true, record: recordWithId }
    }
  }

  static async updateExpenseRecord(id: string, data: any): Promise<{ success: boolean; record?: any }> {
    try {
      const isTemporaryId = id.startsWith("temp_")

      if (navigator.onLine && !isTemporaryId) {
        console.log("Updating expense record online using server action...")
        const result = await updateExpenseRecord(id, data)

        if (result.record) {
          await syncManager.cacheServerData("expense", [result.record])
        }

        return result
      }

      // Offline mode
      console.log("Updating expense record offline...")
      const recordWithId = {
        ...data,
        _id: id,
        _offline: true,
        updatedAt: new Date().toISOString(),
      }

      const operation = isTemporaryId ? "create" : "update"
      await syncManager.queueOperation("expense", operation, recordWithId, id)

      return { success: true, record: recordWithId }
    } catch (error) {
      console.error("Failed to update expense record:", error)

      // Fall back to offline mode
      console.log("Server action failed, falling back to offline mode...")
      const recordWithId = {
        ...data,
        _id: id,
        _offline: true,
        updatedAt: new Date().toISOString(),
      }

      const isTemporaryId = id.startsWith("temp_")
      const operation = isTemporaryId ? "create" : "update"
      await syncManager.queueOperation("expense", operation, recordWithId, id)

      return { success: true, record: recordWithId }
    }
  }

  static async deleteExpenseRecord(id: string): Promise<{ success: boolean }> {
    try {
      const isTemporaryId = id.startsWith("temp_")

      if (navigator.onLine && !isTemporaryId) {
        console.log("Deleting expense record online using server action...")
        const result = await deleteExpenseRecord(id)
        return result
      }

      // Offline mode or temporary ID
      console.log("Deleting expense record offline...")

      if (isTemporaryId) {
        const storeName = "expenseRecords"
        await offlineDB.deleteRecord(storeName, id)
        return { success: true }
      }

      await syncManager.queueOperation("expense", "delete", { _id: id })

      return { success: true }
    } catch (error) {
      console.error("Failed to delete expense record:", error)

      // Fall back to offline mode
      console.log("Server action failed, falling back to offline mode...")
      const isTemporaryId = id.startsWith("temp_")

      if (isTemporaryId) {
        const storeName = "expenseRecords"
        await offlineDB.deleteRecord(storeName, id)
        return { success: true }
      }

      await syncManager.queueOperation("expense", "delete", { _id: id })

      return { success: true }
    }
  }

  // Get Records with caching
  static async getRecords(type: "income" | "expense"): Promise<any[]> {
    try {
      // Always try to get fresh data if online
      if (navigator.onLine) {
        console.log(`Fetching ${type} records from server...`)
        const endpoint = type === "income" ? "/api/income-records" : "/api/expense-records"
        const response = await fetch(endpoint)

        if (response.ok) {
          const data = await response.json()
          const records = data.records || []

          // Cache the server data
          await syncManager.cacheServerData(type, records)

          // Merge with local unsynced records
          const localRecords = await syncManager.getLocalRecords(type)
          const unsyncedRecords = localRecords.filter((record) => record._offline)

          // Combine and deduplicate
          const allRecords = [...records, ...unsyncedRecords]
          const uniqueRecords = allRecords.filter(
            (record, index, self) => index === self.findIndex((r) => r._id === record._id),
          )

          console.log(
            `Retrieved ${uniqueRecords.length} ${type} records (${records.length} from server, ${unsyncedRecords.length} local)`,
          )
          return uniqueRecords
        }
      }

      // Fallback to local records only
      console.log(`Serving ${type} records from local storage...`)
      return await syncManager.getLocalRecords(type)
    } catch (error) {
      console.error(`Failed to get ${type} records:`, error)
      // Return local records as fallback
      return await syncManager.getLocalRecords(type)
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

  // Users - keeping the existing implementation since no server actions were mentioned for users
  static async createUser(data: any): Promise<{ success: boolean; user?: any }> {
    try {
      if (navigator.onLine) {
        const response = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })

        if (response.ok) {
          const result = await response.json()

          if (result.user) {
            await syncManager.cacheServerData("user", [result.user])
          }

          return result
        }
      }

      // Offline mode
      const tempId = `temp_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const userWithId = {
        ...data,
        _id: tempId,
        _offline: true,
        _localId: tempId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await syncManager.queueOperation("user", "create", userWithId, tempId)

      return { success: true, user: userWithId }
    } catch (error) {
      console.error("Failed to create user:", error)
      throw error
    }
  }

  static async updateUser(id: string, data: any): Promise<{ success: boolean; user?: any }> {
    try {
      if (navigator.onLine) {
        const response = await fetch(`/api/users/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })

        if (response.ok) {
          const result = await response.json()

          if (result.user) {
            await syncManager.cacheServerData("user", [result.user])
          }

          return result
        }
      }

      // Offline mode
      const userWithId = {
        ...data,
        _id: id,
        _offline: true,
        updatedAt: new Date().toISOString(),
      }

      await syncManager.queueOperation("user", "update", userWithId, id)

      return { success: true, user: userWithId }
    } catch (error) {
      console.error("Failed to update user:", error)
      throw error
    }
  }

  static async deleteUser(id: string): Promise<{ success: boolean }> {
    try {
      if (navigator.onLine) {
        const response = await fetch(`/api/users/${id}`, {
          method: "DELETE",
        })

        if (response.ok) {
          return { success: true }
        }
      }

      // Offline mode
      await syncManager.queueOperation("user", "delete", { _id: id })

      return { success: true }
    } catch (error) {
      console.error("Failed to delete user:", error)
      throw error
    }
  }

  static async getUsers(): Promise<any[]> {
    try {
      if (navigator.onLine) {
        const response = await fetch("/api/users")

        if (response.ok) {
          const data = await response.json()
          const users = data.users || []

          await syncManager.cacheServerData("user", users)

          // Merge with local unsynced users
          const localUsers = await syncManager.getLocalRecords("user")
          const unsyncedUsers = localUsers.filter((user) => user._offline)

          const allUsers = [...users, ...unsyncedUsers]
          const uniqueUsers = allUsers.filter(
            (user, index, self) => index === self.findIndex((u) => u._id === user._id),
          )

          return uniqueUsers
        }
      }

      return await syncManager.getLocalRecords("user")
    } catch (error) {
      console.error("Failed to get users:", error)
      return await syncManager.getLocalRecords("user")
    }
  }
}
