"use client"

import { useState, useEffect, useCallback } from "react"
import { Navbar } from "@/components/layout/navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { formatCurrency } from "@/lib/utils"
import { OfflineAPI } from "@/lib/offline/offline-api"
import {
  Users,
  ChevronDown,
  ChevronUp,
  Search,
  Calendar,
  Receipt,
  ExternalLink,
  RefreshCw,
  WifiOff,
  Edit,
  Trash2,
} from "lucide-react"
import type { DueAccount, DueAccountSummary } from "@/types"
import { toast } from "sonner"
import { useOffline } from "@/hooks/use-offline"
import { DueAccountDialog } from "@/components/due-accounts/due-account-dialog"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTrigger,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { IncomeDialog } from "@/components/records/income-record-dialog"

export default function DueAccountsPage() {
  const [dueAccounts, setDueAccounts] = useState<DueAccount[]>([])
  const [dueAccountSummary, setDueAccountSummary] = useState<DueAccountSummary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set())
  const [mounted, setMounted] = useState(false)

  const { isOnline, isSyncing, pendingOperations } = useOffline()

  useEffect(() => {
    setMounted(true)
    fetchDueAccounts()
  }, [])

  const fetchDueAccounts = useCallback(async () => {
    setIsLoading(true)
    try {
      console.log("Fetching due accounts...")
      const data = await OfflineAPI.getDueAccounts()
      console.log("Due accounts fetched:", data)

      const accounts = Array.isArray(data) ? data : []
      const processedAccounts = accounts.map((account: any) => ({
        ...account,
        _id: account._id || account.id || "",
        customerPhone: account.customerPhone || "",
        customerName: account.customerName || "",
        totalDueAmount: account.totalDueAmount || 0,
        pendingOrdersCount: account.pendingOrdersCount || 0,
        orders: Array.isArray(account.orders) ? account.orders : [],
        lastOrderDate: account.lastOrderDate || new Date().toISOString(),
        isActive: account.isActive !== false,
      }))
      setDueAccounts(accounts)
      setDueAccountSummary(processedAccounts)
      console.log("Due accounts state updated:", processedAccounts)
    } catch (error) {
      toast.error("Failed to fetch due accounts")
      console.error("Error fetching due accounts:", error)
      setDueAccounts([])
      setDueAccountSummary([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleAccountSuccess = useCallback(async () => {
    console.log("Account operation completed, refreshing data...")
    // Add a small delay to ensure the operation is completed
    setTimeout(async () => {
      await fetchDueAccounts()
    }, 100)
  }, [fetchDueAccounts])

  const handleDeleteAccount = async (accountId: string, accountName: string) => {
    try {
      console.log("Deleting account:", accountId)
      await OfflineAPI.deleteDueAccount(accountId)

      const successMessage = isOnline
        ? `Customer account "${accountName}" deleted successfully!`
        : `Customer account "${accountName}" deleted offline - will sync when online`
      toast.success(successMessage)

      // Immediately update the local state to remove the deleted account
      setDueAccountSummary((prev) => prev.filter((account) => account._id !== accountId))

      // Also refresh from API to ensure consistency
      setTimeout(async () => {
        await fetchDueAccounts()
      }, 100)
    } catch (error) {
      console.error("Error deleting due account:", error)
      toast.error("Failed to delete customer account")
    }
  }

  const handleDeleteOrder = async (orderId: string) => {
    try {
      console.log("Deleting order:", orderId)
      await OfflineAPI.deleteIncomeRecord(orderId)

      const successMessage = isOnline ? "Order deleted successfully!" : "Order deleted offline - will sync when online"
      toast.success(successMessage)

      // Refresh the due accounts to reflect the changes
      setTimeout(async () => {
        await fetchDueAccounts()
      }, 100)
    } catch (error) {
      console.error("Error deleting order:", error)
      toast.error("Failed to delete order")
    }
  }

  const handleOrderSuccess = useCallback(async () => {
    console.log("Order operation completed, refreshing data...")
    // Add a small delay to ensure the operation is completed
    setTimeout(async () => {
      await fetchDueAccounts()
    }, 100)
  }, [fetchDueAccounts])

  const toggleAccountExpansion = (accountId: string) => {
    const newExpanded = new Set(expandedAccounts)
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId)
    } else {
      newExpanded.add(accountId)
    }
    setExpandedAccounts(newExpanded)
  }

  const copyPublicLink = (accountId: string) => {
    if (typeof window !== "undefined") {
      const publicUrl = `${window.location.origin}/public/due-accounts/${accountId}`
      navigator.clipboard.writeText(publicUrl)
      toast.success("Public link copied to clipboard!")
    }
  }

  const handleRefresh = useCallback(async () => {
    console.log("Manual refresh triggered")
    await fetchDueAccounts()
  }, [fetchDueAccounts])

  // Don't render until mounted to prevent hydration issues
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin mr-3" />
            <span className="text-lg">Loading...</span>
          </div>
        </main>
      </div>
    )
  }

  const safeAccounts = Array.isArray(dueAccountSummary) ? dueAccountSummary : []
  const filteredAccounts = safeAccounts.filter(
    (account) => account.customerName && account.customerName.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const totalDueAmount = filteredAccounts.reduce((sum, account) => sum + (account.totalDueAmount || 0), 0)
  const accountsWithDues = filteredAccounts.filter((account) => (account.totalDueAmount || 0) > 0)

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Due Accounts</h1>
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
          <DueAccountDialog onSuccess={handleAccountSuccess} mode="create" />
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredAccounts.length}</div>
              <p className="text-xs text-muted-foreground">{accountsWithDues.length} with outstanding dues</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Due Amount</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(totalDueAmount)}</div>
              <p className="text-xs text-muted-foreground">Outstanding balance</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {filteredAccounts.reduce((sum, account) => sum + (account.pendingOrdersCount || 0), 0)}
              </div>
              <p className="text-xs text-muted-foreground">Unpaid orders</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Due Accounts List */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin mr-3" />
            <span className="text-lg">Loading due accounts...</span>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Due Accounts Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? "No customers match your search." : "Create your first customer due account."}
              </p>
              {!searchTerm && <DueAccountDialog onSuccess={handleAccountSuccess} mode="create" />}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredAccounts.map((account) => (
              <Card key={account._id}>
                <Collapsible
                  open={expandedAccounts.has(account._id)}
                  onOpenChange={() => toggleAccountExpansion(account._id)}
                >
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <CardTitle className="text-lg">{account.customerName}</CardTitle>
                            <div className="text-sm text-muted-foreground">
                              {account.customerPhone && <span>Phone: {account.customerPhone}</span>}
                            </div>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-sm text-muted-foreground">
                                {account.orders && account.orders.length > 0
                                  ? `Last order: ${new Date(account.lastOrderDate).toLocaleDateString()}`
                                  : "No orders yet"}
                              </span>
                              {(account.pendingOrdersCount || 0) > 0 ? (
                                <Badge variant="outline" className="text-orange-600 border-orange-200">
                                  {account.pendingOrdersCount} pending orders
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-green-600 border-green-200">
                                  No pending orders
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div
                              className={`text-xl font-bold ${(account.totalDueAmount || 0) > 0 ? "text-red-600" : "text-green-600"}`}
                            >
                              {formatCurrency(account.totalDueAmount || 0)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {(account.totalDueAmount || 0) > 0 ? "Total Due" : "No Dues"}
                            </div>
                          </div>

                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            {/* Edit Account Button */}
                            <DueAccountDialog
                              account={dueAccounts.find((a) => a._id === account._id)}
                              onSuccess={handleAccountSuccess}
                              mode="edit"
                              trigger={
                                <Button variant="outline" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              }
                            />

                            {/* Delete Account Button - Only show if no pending orders */}
                            {(account.pendingOrdersCount || 0) === 0 && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Customer Account</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete the customer account for &quot;{account.customerName}&quot;?
                                      This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteAccount(account._id, account.customerName)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete Account
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}

                            {/* Public Link Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                copyPublicLink(account._id)
                              }}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>

                            {/* Expand/Collapse Icon */}
                            {expandedAccounts.has(account._id) ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                          <h4 className="font-medium">Pending Orders</h4>
                          <span className="text-sm text-muted-foreground">
                            {account.orders ? account.orders.length : 0} orders
                          </span>
                        </div>

                        {!account.orders || account.orders.length === 0 ? (
                          <p className="text-center text-muted-foreground py-4">No pending orders</p>
                        ) : (
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {account.orders.map((order) => (
                              <div
                                key={order._id}
                                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium">{new Date(order.date).toLocaleDateString()}</span>
                                    {order.tableNumber && (
                                      <Badge variant="secondary" className="text-xs">
                                        Table {order.tableNumber}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {order.items ? order.items.length : 0} items
                                    {order.notes && ` • ${order.notes}`}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <div className="text-right">
                                    <div className="font-medium text-red-600">
                                      {formatCurrency(order.totalAmount || 0)}
                                    </div>
                                    <Badge
                                      variant={order.paymentStatus === "completed" ? "default" : "destructive"}
                                      className="text-xs"
                                    >
                                      {order.paymentStatus || "pending"}
                                    </Badge>
                                  </div>

                                  {/* Order Actions */}
                                  <div className="flex items-center gap-1">
                                    {/* Edit Order Button */}
                                    <IncomeDialog
                                      record={order}
                                      onSuccess={handleOrderSuccess}
                                      mode="edit"
                                    />

                                    {/* Delete Order Button */}
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="outline" size="sm">
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete Order</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to delete this order? This action cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleDeleteOrder(order._id)}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          >
                                            Delete Order
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
