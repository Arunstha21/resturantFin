"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, Download, TrendingUp, TrendingDown, DollarSign, Receipt, Clock } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { useOffline } from "@/hooks/use-offline"
import { toast } from "sonner"
import type { IncomeRecord, ExpenseRecord } from "@/types"

interface ProfitLossData {
  revenue: {
    total: number
    cash: number
    digital: number
    breakdown: Array<{ category: string; amount: number; quantity?: number; orders?: number; avgPrice?: number }>
  }
  expenses: {
    total: number
    breakdown: Array<{ category: string; amount: number }>
  }
  grossProfit: number
  netProfit: number
  profitMargin: number
  pendingCollections: {
    totalAmount: number
    recordCount: number
    breakdown: Array<{ category: string; amount: number; count: number }>
  }
}

const EXPENSE_CATEGORIES = [
  "Food & Ingredients",
  "Staff Salaries",
  "Rent & Utilities",
  "Equipment & Maintenance",
  "Supplies & Materials",
  "Transportation",
  "Other",
]

export default function ProfitLossPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [dateRange, setDateRange] = useState("thisMonth")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [profitLossData, setProfitLossData] = useState<ProfitLossData | null>(null)
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([])
  const [expenseRecords, setExpenseRecords] = useState<ExpenseRecord[]>([])
  const [completedIncomeRecords, setCompletedIncomeRecords] = useState<IncomeRecord[]>([])

  const { isOnline } = useOffline()

  // Calculate date range based on selection
  const getDateRange = useMemo(() => {
    const now = new Date()
    let start: Date
    let end: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

    switch (dateRange) {
      case "today":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case "yesterday":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59)
        break
      case "thisWeek":
        const dayOfWeek = now.getDay()
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek)
        break
      case "lastWeek":
        const lastWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() - 7)
        const lastWeekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() - 1, 23, 59, 59)
        start = lastWeekStart
        end = lastWeekEnd
        break
      case "thisMonth":
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case "lastMonth":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
        break
      case "thisYear":
        start = new Date(now.getFullYear(), 0, 1)
        break
      case "custom":
        if (startDate && endDate) {
          start = new Date(startDate)
          end = new Date(new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1)
        } else {
          start = new Date(now.getFullYear(), now.getMonth(), 1)
        }
        break
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    return { start, end }
  }, [dateRange, startDate, endDate])

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const [incomeResponse, expenseResponse] = await Promise.all([
          fetch("/api/income-records?limit=10000"),
          fetch("/api/expense-records?limit=10000"),
        ])

        const incomeData = await incomeResponse.json()
        const expenseData = await expenseResponse.json()

        setIncomeRecords(incomeData.records || [])
        setExpenseRecords(expenseData.records || [])
      } catch (error) {
        console.error("Failed to fetch P&L data:", error)
        toast.error("Failed to load data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Calculate P&L data
  const calculatedData = useMemo((): ProfitLossData => {
    const { start, end } = getDateRange

    // Filter records by date range
    const filteredIncome = incomeRecords.filter((record) => {
      const recordDate = new Date(record.date)
      return recordDate >= start && recordDate <= end
    })

    const filteredExpenses = expenseRecords.filter((record) => {
      const recordDate = new Date(record.date)
      return recordDate >= start && recordDate <= end
    })

    // Calculate revenue - ONLY include completed payments
    const completedIncomeRecords = filteredIncome.filter((record) => record.paymentStatus === "completed")
    setCompletedIncomeRecords(completedIncomeRecords)
    const totalRevenue = completedIncomeRecords.reduce((sum, record) => sum + (record.totalAmount || 0), 0)

    const cashRevenue = completedIncomeRecords.reduce((sum, record) => {
      if (record.paymentMethod === "cash") return sum + (record.totalAmount || 0)
      if (record.paymentMethod === "split") return sum + (record.cashAmount || 0)
      return sum
    }, 0)

    const digitalRevenue = completedIncomeRecords.reduce((sum, record) => {
      if (record.paymentMethod === "digital") return sum + (record.totalAmount || 0)
      if (record.paymentMethod === "split") return sum + (record.digitalAmount || 0)
      return sum
    }, 0)

    // Calculate pending amounts separately (not part of revenue)
    const pendingRecords = filteredIncome.filter((record) => record.paymentStatus === "pending")
    const totalPendingAmount = pendingRecords.reduce((sum, record) => sum + (record.totalAmount || 0), 0)

    // Calculate actual revenue breakdown by menu items
    const itemRevenue = new Map<string, { amount: number; quantity: number; orders: number }>()

    completedIncomeRecords.forEach((record) => {
      if (record.items && Array.isArray(record.items)) {
        record.items.forEach((item) => {
          const itemName = item.name?.trim()
          if (itemName) {
            const itemTotal = (item.quantity || 0) * (item.price || 0)
            const existing = itemRevenue.get(itemName) || { amount: 0, quantity: 0, orders: 0 }
            itemRevenue.set(itemName, {
              amount: existing.amount + itemTotal,
              quantity: existing.quantity + (item.quantity || 0),
              orders: existing.orders + 1,
            })
          }
        })
      }
    })

    // Convert to array and sort by revenue amount
    const revenueBreakdown = Array.from(itemRevenue.entries())
      .map(([name, data]) => ({
        category: name,
        amount: data.amount,
        quantity: data.quantity,
        orders: data.orders,
        avgPrice: data.quantity > 0 ? data.amount / data.quantity : 0,
      }))
      .sort((a, b) => b.amount - a.amount)

    // Add tips and discounts as separate line items
    const totalTips = completedIncomeRecords.reduce((sum, record) => sum + (record.tip || 0), 0)
    const totalDiscounts = completedIncomeRecords.reduce((sum, record) => sum + (record.discount || 0), 0)

    if (totalTips > 0) {
      revenueBreakdown.push({
        category: "Tips",
        amount: totalTips,
        quantity: completedIncomeRecords.filter((r) => (r.tip || 0) > 0).length,
        orders: completedIncomeRecords.filter((r) => (r.tip || 0) > 0).length,
        avgPrice: totalTips / completedIncomeRecords.filter((r) => (r.tip || 0) > 0).length || 0,
      })
    }

    if (totalDiscounts > 0) {
      revenueBreakdown.push({
        category: "Discounts Applied",
        amount: -totalDiscounts, // Negative because it reduces revenue
        quantity: completedIncomeRecords.filter((r) => (r.discount || 0) > 0).length,
        orders: completedIncomeRecords.filter((r) => (r.discount || 0) > 0).length,
        avgPrice: -totalDiscounts / completedIncomeRecords.filter((r) => (r.discount || 0) > 0).length || 0,
      })
    }

    // Calculate expenses by category
    const expenseBreakdown = EXPENSE_CATEGORIES.map((category) => {
      const categoryExpenses = filteredExpenses.filter((expense) => expense.category === category)
      const amount = categoryExpenses.reduce((sum, expense) => sum + expense.amount, 0)
      return { category, amount }
    }).filter((item) => item.amount > 0)

    const totalExpenses = expenseBreakdown.reduce((sum, item) => sum + item.amount, 0)

    // Calculate profit metrics
    const grossProfit = totalRevenue - (expenseBreakdown.find((e) => e.category === "Food & Ingredients")?.amount || 0)
    const netProfit = totalRevenue - totalExpenses
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

    // Calculate pending collections breakdown
    const pendingBreakdown = [
      {
        category: "Due Account Orders",
        amount: pendingRecords
          .filter((record) => record.isDueAccount)
          .reduce((sum, record) => sum + (record.totalAmount || 0), 0),
        count: pendingRecords.filter((record) => record.isDueAccount).length,
      },
      {
        category: "Regular Pending Orders",
        amount: pendingRecords
          .filter((record) => !record.isDueAccount)
          .reduce((sum, record) => sum + (record.totalAmount || 0), 0),
        count: pendingRecords.filter((record) => !record.isDueAccount).length,
      },
    ].filter((item) => item.amount > 0)

    return {
      revenue: {
        total: totalRevenue,
        cash: cashRevenue,
        digital: digitalRevenue,
        breakdown: revenueBreakdown,
      },
      expenses: {
        total: totalExpenses,
        breakdown: expenseBreakdown,
      },
      grossProfit,
      netProfit,
      profitMargin,
      pendingCollections: {
        totalAmount: totalPendingAmount,
        recordCount: pendingRecords.length,
        breakdown: pendingBreakdown,
      },
    }
  }, [incomeRecords, expenseRecords, getDateRange])

  useEffect(() => {
    setProfitLossData(calculatedData)
  }, [calculatedData])

  const exportToPDF = () => {
    // This would integrate with a PDF library like jsPDF
    toast.info("PDF export feature coming soon!")
  }

  const getDateRangeLabel = () => {
    const { start, end } = getDateRange
    const formatDate = (date: Date) => date.toLocaleDateString()

    switch (dateRange) {
      case "today":
        return "Today"
      case "yesterday":
        return "Yesterday"
      case "thisWeek":
        return "This Week"
      case "lastWeek":
        return "Last Week"
      case "thisMonth":
        return "This Month"
      case "lastMonth":
        return "Last Month"
      case "thisYear":
        return "This Year"
      case "custom":
        return `${formatDate(start)} - ${formatDate(end)}`
      default:
        return "This Month"
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading P&L data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Profit & Loss Statement</h1>
          <p className="text-muted-foreground">Financial performance for {getDateRangeLabel()}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToPDF} variant="outline" className="touch-manipulation bg-transparent">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Offline indicator */}
      {!isOnline && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-orange-700">
            <span className="text-sm font-medium">Working Offline</span>
          </div>
          <p className="text-xs text-orange-600 mt-1">Data shown is from local storage and may not be up to date.</p>
        </div>
      )}

      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Date Range
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Label>Period</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="thisWeek">This Week</SelectItem>
                  <SelectItem value="lastWeek">Last Week</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="lastMonth">Last Month</SelectItem>
                  <SelectItem value="thisYear">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {dateRange === "custom" && (
              <>
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {profitLossData && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold">{formatCurrency(profitLossData.revenue.total)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
                    <p className="text-2xl font-bold">{formatCurrency(profitLossData.expenses.total)}</p>
                  </div>
                  <Receipt className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Net Profit</p>
                    <p
                      className={`text-2xl font-bold ${profitLossData.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {formatCurrency(profitLossData.netProfit)}
                    </p>
                  </div>
                  {profitLossData.netProfit >= 0 ? (
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  ) : (
                    <TrendingDown className="h-8 w-8 text-red-600" />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Profit Margin</p>
                    <p
                      className={`text-2xl font-bold ${profitLossData.profitMargin >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {profitLossData.profitMargin.toFixed(1)}%
                    </p>
                  </div>
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      profitLossData.profitMargin >= 0 ? "bg-green-100" : "bg-red-100"
                    }`}
                  >
                    <span
                      className={`text-sm font-bold ${
                        profitLossData.profitMargin >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      %
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Revenue</span>
                <Badge variant="outline" className="text-green-600 border-green-200">
                  {formatCurrency(profitLossData.revenue.total)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Payment Method Breakdown */}
              <div>
                <h4 className="font-medium mb-3">Payment Methods (Completed Only)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>Cash Payments</span>
                    </div>
                    <span className="font-medium">{formatCurrency(profitLossData.revenue.cash)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span>Digital Payments</span>
                    </div>
                    <span className="font-medium">{formatCurrency(profitLossData.revenue.digital)}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Revenue Categories */}
              <div>
                <h4 className="font-medium mb-3">Revenue Breakdown by Menu Items</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {profitLossData.revenue.breakdown.map((item, index) => (
                    <div key={index} className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{item.category}</span>
                          <span className={`font-bold ${item.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {formatCurrency(item.amount)}
                          </span>
                        </div>
                        {item.quantity !== undefined && item.orders !== undefined && (
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                            <span>Qty: {item.quantity}</span>
                            <span>Orders: {item.orders}</span>
                            {item.avgPrice !== undefined && <span>Avg: {formatCurrency(item.avgPrice)}</span>}
                            <span>
                              {profitLossData.revenue.total > 0
                                ? `${((Math.abs(item.amount) / profitLossData.revenue.total) * 100).toFixed(1)}%`
                                : "0%"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {profitLossData.revenue.breakdown.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No revenue data available for this period
                    </div>
                  )}
                </div>

                {/* Summary Stats */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-lg font-bold text-primary">
                      {profitLossData.revenue.breakdown.filter((item) => item.amount > 0).length}
                    </div>
                    <div className="text-xs text-muted-foreground">Menu Items Sold</div>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-lg font-bold text-primary">
                      {profitLossData.revenue.breakdown.reduce((sum, item) => sum + (item.quantity || 0), 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">Total Items Sold</div>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-lg font-bold text-primary">{completedIncomeRecords.length}</div>
                    <div className="text-xs text-muted-foreground">Completed Orders</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expenses Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Expenses</span>
                <Badge variant="outline" className="text-red-600 border-red-200">
                  {formatCurrency(profitLossData.expenses.total)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {profitLossData.expenses.breakdown.map((expense, index) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b last:border-b-0">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span>{expense.category}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(expense.amount)}</div>
                      <div className="text-xs text-muted-foreground">
                        {profitLossData.expenses.total > 0
                          ? `${((expense.amount / profitLossData.expenses.total) * 100).toFixed(1)}%`
                          : "0%"}
                      </div>
                    </div>
                  </div>
                ))}
                {profitLossData.expenses.breakdown.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">No expenses recorded for this period</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Profit Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Profit Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2">
                  <span className="font-medium">Total Revenue</span>
                  <span className="font-medium text-green-600">{formatCurrency(profitLossData.revenue.total)}</span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="font-medium">Less: Total Expenses</span>
                  <span className="font-medium text-red-600">({formatCurrency(profitLossData.expenses.total)})</span>
                </div>

                <Separator />

                <div className="flex items-center justify-between py-2">
                  <span className="font-medium">Gross Profit</span>
                  <span
                    className={`font-medium ${profitLossData.grossProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {formatCurrency(profitLossData.grossProfit)}
                  </span>
                </div>

                <Separator />

                <div className="flex items-center justify-between py-3 bg-muted rounded-lg px-4">
                  <span className="text-lg font-bold">Net Profit</span>
                  <span
                    className={`text-lg font-bold ${profitLossData.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {formatCurrency(profitLossData.netProfit)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-primary">{profitLossData.profitMargin.toFixed(1)}%</div>
                    <div className="text-sm text-muted-foreground">Profit Margin</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {profitLossData.revenue.total > 0
                        ? ((profitLossData.expenses.total / profitLossData.revenue.total) * 100).toFixed(1)
                        : "0"}
                      %
                    </div>
                    <div className="text-sm text-muted-foreground">Expense Ratio</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Collections Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Pending Collections (Not Yet Revenue)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-700">
                    <strong>Note:</strong> These amounts are pending collection and are not included in revenue
                    calculations until payment is completed.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-amber-600">
                      {profitLossData.pendingCollections.recordCount}
                    </div>
                    <div className="text-sm text-muted-foreground">Pending Orders</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-amber-600">
                      {formatCurrency(profitLossData.pendingCollections.totalAmount)}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Pending Amount</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-amber-600">
                      {profitLossData.revenue.total > 0
                        ? (
                            (profitLossData.pendingCollections.totalAmount /
                              (profitLossData.revenue.total + profitLossData.pendingCollections.totalAmount)) *
                            100
                          ).toFixed(1)
                        : "0"}
                      %
                    </div>
                    <div className="text-sm text-muted-foreground">% of Total Sales</div>
                  </div>
                </div>

                {profitLossData.pendingCollections.breakdown.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Pending Collections Breakdown</h4>
                    <div className="space-y-2">
                      {profitLossData.pendingCollections.breakdown.map((item, index) => (
                        <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                            <span>{item.category}</span>
                            <Badge variant="outline" className="text-xs">
                              {item.count} orders
                            </Badge>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-amber-600">{formatCurrency(item.amount)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
