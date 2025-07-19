"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { toast } from "sonner"
import { OfflineAPI } from "@/lib/offline/offline-api"
import type { IncomeRecord, ExpenseRecord } from "@/types"

interface UseRecordsManagerReturn {
  // Data
  incomeRecords: IncomeRecord[]
  expenseRecords: ExpenseRecord[]

  // Loading states
  isLoading: boolean
  isRefreshing: boolean

  // Actions
  refreshData: () => Promise<void>
  forceRefresh: () => Promise<void>

  // Handlers with better debugging
  handleIncomeCreate: () => Promise<void>
  handleIncomeUpdate: () => Promise<void>
  handleIncomeDelete: (id: string) => Promise<void>
  handleExpenseCreate: () => Promise<void>
  handleExpenseUpdate: () => Promise<void>
  handleExpenseDelete: (id: string) => Promise<void>
  fetchAllRecords: () => Promise<void>
}

export function useRecordsManager(): UseRecordsManagerReturn {
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([])
  const [expenseRecords, setExpenseRecords] = useState<ExpenseRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const fetchAllRecords = useCallback(async () => {
    try {
      const [incomeResponse, expenseResponse] = await Promise.all([
        fetch("/api/income-records?limit=5000"),
        fetch("/api/expense-records?limit=5000"),
      ])

      const incomeData = await incomeResponse.json()
      const expenseData = await expenseResponse.json()

      setIncomeRecords(incomeData.records || [])
      setExpenseRecords(expenseData.records || [])
    } catch (error) {
      toast.error("Failed to fetch records")
      console.error("Error fetching records:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Enhanced fetch with better error handling and debugging
  const fetchRecords = useCallback(async () => {

    try {
      const [incomeData, expenseData] = await Promise.all([
        OfflineAPI.getIncomeRecords(),
        OfflineAPI.getExpenseRecords(),
      ])

      setIncomeRecords(incomeData || [])
      setExpenseRecords(expenseData || [])

      return { success: true, incomeCount: incomeData?.length || 0, expenseCount: expenseData?.length || 0 }
    } catch (error) {
      console.error("❌ Error fetching records:", error)
      toast.error("Failed to fetch records")
      return { success: false, error }
    }
  }, [])

  // Initial load
  useEffect(() => {
    const initialLoad = async () => {
      setIsLoading(true)
      await fetchRecords()
      setIsLoading(false)
    }
    initialLoad()
  }, [fetchRecords])

  // Refresh data with debouncing
  const refreshData = useCallback(async () => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }

    setIsRefreshing(true)

    // Add a small delay to ensure API operations complete
    await new Promise((resolve) => setTimeout(resolve, 200))

    await fetchRecords()
    setIsRefreshing(false)
  }, [fetchRecords])

  // Force refresh without debouncing
  const forceRefresh = useCallback(async () => {
    setIsRefreshing(true)

    // Longer delay for force refresh to ensure API consistency
    await new Promise((resolve) => setTimeout(resolve, 500))

    await fetchRecords()
    setIsRefreshing(false)

    console.log("✅ Force refresh completed")
  }, [fetchRecords])

  // Income handlers with enhanced debugging
  const handleIncomeCreate = useCallback(async () => {
    toast.success("Order created successfully!")
    await refreshData()
  }, [refreshData])

  const handleIncomeUpdate = useCallback(async () => {
    toast.success("Order updated successfully!")
    await refreshData()
  }, [refreshData])

  const handleIncomeDelete = useCallback(
    async (id: string) => {
      try {
        // Handle group deletion
        if (id.startsWith("group_")) {
          const dueAccountId = id.replace("group_", "")
          const groupOrders = incomeRecords.filter(
            (record) => record.isDueAccount && record.dueAccountId === dueAccountId,
          )

          await Promise.all(groupOrders.map((order) => OfflineAPI.deleteIncomeRecord(order._id)))
          toast.success(`${groupOrders.length} orders deleted successfully`)
        } else {
          // Handle individual order deletion
          const actualId = id.startsWith("child_") ? id.replace("child_", "") : id
          await OfflineAPI.deleteIncomeRecord(actualId)
          toast.success("Order deleted successfully")
        }

        await refreshData()
      } catch (error) {
        console.error("❌ Error deleting income record:", error)
        toast.error("Failed to delete order")
      }
    },
    [incomeRecords, refreshData],
  )

  // Expense handlers with enhanced debugging
  const handleExpenseCreate = useCallback(async () => {
    toast.success("Expense created successfully!")
    await refreshData()
  }, [refreshData])

  const handleExpenseUpdate = useCallback(async () => {
    toast.success("Expense updated successfully!")
    await refreshData()
  }, [refreshData])

  const handleExpenseDelete = useCallback(
    async (id: string) => {
      try {
        await OfflineAPI.deleteExpenseRecord(id)
        toast.success("Expense deleted successfully")
        await refreshData()
      } catch (error) {
        console.error("❌ Error deleting expense record:", error)
        toast.error("Failed to delete expense")
      }
    },
    [refreshData],
  )

  return {
    // Data
    incomeRecords,
    expenseRecords,

    // Loading states
    isLoading,
    isRefreshing,

    // Actions
    refreshData,
    forceRefresh,

    // Handlers
    handleIncomeCreate,
    handleIncomeUpdate,
    handleIncomeDelete,
    handleExpenseCreate,
    handleExpenseUpdate,
    handleExpenseDelete,
    fetchAllRecords,
  }
}
