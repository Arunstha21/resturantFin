"use client"

import { useEffect, useState } from "react"
import { Navbar } from "@/components/layout/navbar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Receipt, CreditCard, WifiOff, RefreshCw } from "lucide-react"
import { useOffline } from "@/hooks/use-offline"
import { useRecordsManager } from "@/components/records/hooks/use-records-manager"
import { RecordsTable } from "@/components/records/components/records-table"
import { IncomeDialog } from "@/components/records/income-record-dialog"
import { ExpenseDialog } from "@/components/records/expense-record-dialog"
import { DebugPanel } from "@/components/records/components/debug-pannel"
import { getSession } from "next-auth/react"

export default function RecordsPage() {
  const [activeTab, setActiveTab] = useState("income")
  const { isOnline, isSyncing, pendingOperations } = useOffline()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    sessionData()
  }, [])

  const sessionData = async () => {
    const session = await getSession()
    setIsAdmin(session?.user?.role === "admin")
  }

  const {
    incomeRecords,
    expenseRecords,
    isLoading,
    isRefreshing,
    refreshData,
    forceRefresh,
    handleIncomeCreate,
    handleIncomeUpdate,
    handleIncomeDelete,
    handleExpenseCreate,
    handleExpenseUpdate,
    handleExpenseDelete,
    fetchAllRecords,
  } = useRecordsManager()

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
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
              {isRefreshing && (
                <Badge variant="outline" className="text-blue-600 border-blue-200">
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Refreshing
                </Badge>
              )}
            </div>
          </div>
          <Button variant="outline" onClick={refreshData} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh All
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="income" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Orders & Income ({incomeRecords.length})
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Expenses ({expenseRecords.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="income">
            <RecordsTable
              type="income"
              data={incomeRecords}
              isLoading={isLoading}
              isRefreshing={isRefreshing}
              onRefresh={refreshData}
              onSuccess={handleIncomeUpdate}
              onDelete={handleIncomeDelete}
              isAdmin={isAdmin}
              CreateDialog={({ onSuccess }) => <IncomeDialog mode="create" onSuccess={handleIncomeCreate} />}
              EditDialog={({ record, onSuccess }) => (
                <IncomeDialog mode="edit" record={record} onSuccess={handleIncomeUpdate} />
              )}
              fetchAllRecords={fetchAllRecords}
            />
          </TabsContent>

          <TabsContent value="expenses">
            <RecordsTable
              type="expense"
              data={expenseRecords}
              isLoading={isLoading}
              isRefreshing={isRefreshing}
              onRefresh={refreshData}
              onSuccess={handleExpenseUpdate}
              onDelete={handleExpenseDelete}
              CreateDialog={({ onSuccess }) => <ExpenseDialog mode="create" onSuccess={handleExpenseCreate} />}
              EditDialog={({ record, onSuccess }) => (
                <ExpenseDialog mode="edit" record={record} onSuccess={handleExpenseUpdate} />
              )}
            />
          </TabsContent>
        </Tabs>

        {/* Debug Panel for development */}
        <DebugPanel
          incomeCount={incomeRecords.length}
          expenseCount={expenseRecords.length}
          isLoading={isLoading}
          isRefreshing={isRefreshing}
          onForceRefresh={forceRefresh}
        />
      </main>
    </div>
  )
}
