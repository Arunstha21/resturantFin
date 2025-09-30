"use client"

import { useState, useEffect, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { OfflineAPI } from "@/lib/offline/offline-api"
import { Receipt, CreditCard, WifiOff, RefreshCw } from "lucide-react"
import { useOffline } from "@/hooks/use-offline"
import { toast } from "sonner"
import type { IncomeRecord, ExpenseRecord } from "@/types"
import { IncomeRecordsTable } from "@/components/records/table/income-record-table"
import { ExpenseRecordsTable } from "@/components/records/table/expense-record-table"
import Loading from "./loading"

export default function RecordsPage() {
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([])
  const [expenseRecords, setExpenseRecords] = useState<ExpenseRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("income")

  const { isOnline, isSyncing, pendingOperations } = useOffline()

  const fetchRecords = useCallback(async () => {
    setIsLoading(true)
    try {
      const [incomeData, expenseData] = await Promise.all([
        OfflineAPI.getIncomeRecords(),
        OfflineAPI.getExpenseRecords(),
      ])
      setIncomeRecords(incomeData || [])
      setExpenseRecords(expenseData || [])
    } catch (error) {
      toast.error("Failed to fetch records")
      console.error("Error fetching records:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  const handleFormSuccess = useCallback(async () => {
    await fetchRecords()
  }, [fetchRecords])

  const [hydrated, setHydrated] = useState(false)
useEffect(() => setHydrated(true), [])

if (!hydrated) {
  return <Loading />
}

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Financial Records</h1>
            {/* Status indicators */}
            <div className="flex items-center gap-2 mt-2">
              {!isOnline && (
                <Badge variant="outline" className="text-orange-600 border-orange-200">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Offline Mode
                </Badge>
              )}
              {isSyncing && (
                <Badge variant="outline" className="text-blue-600 border-blue-200">
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Syncing
                </Badge>
              )}
              {pendingOperations > 0 && (
                <Badge variant="outline" className="text-orange-600 border-orange-200">
                  {pendingOperations} Pending Sync
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="income" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Orders & Income
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Expenses
            </TabsTrigger>
          </TabsList>

          <TabsContent value="income" className="space-y-6">
            <IncomeRecordsTable
              records={incomeRecords}
              isLoading={isLoading}
              onRefresh={fetchRecords}
              onFormSuccess={handleFormSuccess}
              isOnline={isOnline}
            />
          </TabsContent>

          <TabsContent value="expenses" className="space-y-6">
            <ExpenseRecordsTable
              records={expenseRecords}
              isLoading={isLoading}
              onRefresh={fetchRecords}
              onFormSuccess={handleFormSuccess}
              isOnline={isOnline}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
