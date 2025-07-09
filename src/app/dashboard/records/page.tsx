"use client"

import { useState } from "react"
import { Navbar } from "@/components/layout/navbar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Receipt, CreditCard, WifiOff, RefreshCw } from "lucide-react"
import { useOffline } from "@/hooks/use-offline"
import { useRecords } from "@/components/records/hooks/use-records"
import { RecordsTable } from "@/components/records/components/records-table"

export default function RecordsPage() {
  const [activeTab, setActiveTab] = useState("income")
  const { isOnline, isSyncing, pendingOperations } = useOffline()

  const {
    incomeRecords,
    expenseRecords,
    isLoading,
    isRefreshing,
    fetchRecords,
    handleIncomeSuccess,
    handleExpenseSuccess,
    handleDeleteIncome,
    handleDeleteExpense,
  } = useRecords()

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

          <TabsContent value="income">
            <RecordsTable
              type="income"
              data={incomeRecords}
              isLoading={isLoading}
              isRefreshing={isRefreshing}
              onRefresh={fetchRecords}
              onSuccess={handleIncomeSuccess}
              onDelete={handleDeleteIncome}
            />
          </TabsContent>

          <TabsContent value="expenses">
            <RecordsTable
              type="expense"
              data={expenseRecords}
              isLoading={isLoading}
              isRefreshing={isRefreshing}
              onRefresh={fetchRecords}
              onSuccess={handleExpenseSuccess}
              onDelete={handleDeleteExpense}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
