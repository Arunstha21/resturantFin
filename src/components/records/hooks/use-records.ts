"use client"

import { useState, useCallback, useEffect } from "react"
import { toast } from "sonner"
import { OfflineAPI } from "@/lib/offline/offline-api"
import type { IncomeRecord, ExpenseRecord } from "@/types"

interface UseRecordsReturn {
  // Data
  incomeRecords: IncomeRecord[]
  expenseRecords: ExpenseRecord[]

  // Loading states
  isLoading: boolean
  isRefreshing: boolean

  // Actions
  fetchRecords: () => Promise<void>
  addIncomeRecord: (record: IncomeRecord) => void
  updateIncomeRecord: (id: string, record: Partial<IncomeRecord>) => void
  removeIncomeRecord: (id: string) => void
  addExpenseRecord: (record: ExpenseRecord) => void
  updateExpenseRecord: (id: string, record: Partial<ExpenseRecord>) => void
  removeExpenseRecord: (id: string) => void

  // Handlers
  handleIncomeSuccess: () => Promise<void>
  handleExpenseSuccess: () => Promise<void>
  handleDeleteIncome: (id: string) => Promise<void>
  handleDeleteExpense: (id: string) => Promise<void>
}

export function useRecords(): UseRecordsReturn {
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([])
  const [expenseRecords, setExpenseRecords] = useState<ExpenseRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchRecords = useCallback(async () => {
    const loadingState = incomeRecords.length === 0 && expenseRecords.length === 0

    if (loadingState) {
      setIsLoading(true)
    } else {
      setIsRefreshing(true)
    }

    try {
      console.log("Fetching records...")
      const [incomeData, expenseData] = await Promise.all([
        OfflineAPI.getIncomeRecords(),
        OfflineAPI.getExpenseRecords(),
      ])

      setIncomeRecords(incomeData || [])
      setExpenseRecords(expenseData || [])

      console.log(`Fetched ${incomeData?.length || 0} income records and ${expenseData?.length || 0} expense records`)
    } catch (error) {
      console.error("Error fetching records:", error)
      toast.error("Failed to fetch records")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [incomeRecords.length, expenseRecords.length])

  // Optimistic updates for income records
  const addIncomeRecord = useCallback((record: IncomeRecord) => {
    setIncomeRecords((prev) => [record, ...prev])
  }, [])

  const updateIncomeRecord = useCallback((id: string, updates: Partial<IncomeRecord>) => {
    setIncomeRecords((prev) => prev.map((record) => (record._id === id ? { ...record, ...updates } : record)))
  }, [])

  const removeIncomeRecord = useCallback((id: string) => {
    setIncomeRecords((prev) => prev.filter((record) => record._id !== id))
  }, [])

  // Optimistic updates for expense records
  const addExpenseRecord = useCallback((record: ExpenseRecord) => {
    setExpenseRecords((prev) => [record, ...prev])
  }, [])

  const updateExpenseRecord = useCallback((id: string, updates: Partial<ExpenseRecord>) => {
    setExpenseRecords((prev) => prev.map((record) => (record._id === id ? { ...record, ...updates } : record)))
  }, [])

  const removeExpenseRecord = useCallback((id: string) => {
    setExpenseRecords((prev) => prev.filter((record) => record._id !== id))
  }, [])

  // Success handlers with proper refresh
  const handleIncomeSuccess = useCallback(async () => {
    console.log("Income form success - refreshing data...")
    // Small delay to ensure API has processed the request
    await new Promise((resolve) => setTimeout(resolve, 100))
    await fetchRecords()
  }, [fetchRecords])

  const handleExpenseSuccess = useCallback(async () => {
    console.log("Expense form success - refreshing data...")
    // Small delay to ensure API has processed the request
    await new Promise((resolve) => setTimeout(resolve, 100))
    await fetchRecords()
  }, [fetchRecords])

  // Delete handlers with optimistic updates
  const handleDeleteIncome = useCallback(
    async (id: string) => {
      try {
        // Handle group deletion
        if (id.startsWith("group_")) {
          const dueAccountId = id.replace("group_", "")
          const groupOrders = incomeRecords.filter(
            (record) => record.isDueAccount && record.dueAccountId === dueAccountId,
          )

          // Optimistic update - remove from UI immediately
          setIncomeRecords((prev) =>
            prev.filter((record) => !(record.isDueAccount && record.dueAccountId === dueAccountId)),
          )

          // Delete all orders in the group
          await Promise.all(groupOrders.map((order) => OfflineAPI.deleteIncomeRecord(order._id)))

          toast.success(`${groupOrders.length} orders deleted successfully`)

          // Refresh to ensure consistency
          await fetchRecords()
          return
        }

        // Handle individual order deletion
        const actualId = id.startsWith("child_") ? id.replace("child_", "") : id

        // Optimistic update
        removeIncomeRecord(actualId)

        await OfflineAPI.deleteIncomeRecord(actualId)
        toast.success("Order deleted successfully")

        // Refresh to ensure consistency
        await fetchRecords()
      } catch (error) {
        console.error("Error deleting income record:", error)
        toast.error("Failed to delete order")
        // Revert optimistic update by refreshing
        await fetchRecords()
      }
    },
    [incomeRecords, removeIncomeRecord, fetchRecords],
  )

  const handleDeleteExpense = useCallback(
    async (id: string) => {
      try {
        // Optimistic update
        removeExpenseRecord(id)

        await OfflineAPI.deleteExpenseRecord(id)
        toast.success("Expense deleted successfully")

        // Refresh to ensure consistency
        await fetchRecords()
      } catch (error) {
        console.error("Error deleting expense record:", error)
        toast.error("Failed to delete expense")
        // Revert optimistic update by refreshing
        await fetchRecords()
      }
    },
    [removeExpenseRecord, fetchRecords],
  )

  // Initial fetch
  useEffect(() => {
    fetchRecords()
  }, []) // Only run once on mount

  return {
    // Data
    incomeRecords,
    expenseRecords,

    // Loading states
    isLoading,
    isRefreshing,

    // Actions
    fetchRecords,
    addIncomeRecord,
    updateIncomeRecord,
    removeIncomeRecord,
    addExpenseRecord,
    updateExpenseRecord,
    removeExpenseRecord,

    // Handlers
    handleIncomeSuccess,
    handleExpenseSuccess,
    handleDeleteIncome,
    handleDeleteExpense,
  }
}
