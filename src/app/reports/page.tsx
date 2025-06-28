"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/layout/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency, exportToCSV } from "@/lib/utils"
import { Download, Filter, Receipt, CreditCard, Banknote, Smartphone, Calendar } from "lucide-react"
import type { IncomeRecord, ExpenseRecord } from "@/types"
import { toast } from "sonner"

export default function ReportsPage() {
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([])
  const [expenseRecords, setExpenseRecords] = useState<ExpenseRecord[]>([])
  const [filteredIncomeRecords, setFilteredIncomeRecords] = useState<IncomeRecord[]>([])
  const [filteredExpenseRecords, setFilteredExpenseRecords] = useState<ExpenseRecord[]>([])
  const [dateFilter, setDateFilter] = useState("month")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    fetchRecords()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [incomeRecords, expenseRecords, dateFilter, categoryFilter, startDate, endDate])

  const fetchRecords = async () => {
    try {
      const [incomeResponse, expenseResponse] = await Promise.all([
        fetch("/api/income-records?limit=1000"),
        fetch("/api/expense-records?limit=1000"),
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
  }

  const applyFilters = () => {
    let filteredIncome = [...incomeRecords]
    let filteredExpense = [...expenseRecords]

    // Date filter
    if (dateFilter !== "custom") {
      const now = new Date()
      const filterDate = new Date()

      switch (dateFilter) {
        case "today":
          filterDate.setHours(0, 0, 0, 0)
          filteredIncome = filteredIncome.filter((record) => {
            const recordDate = new Date(record.date)
            recordDate.setHours(0, 0, 0, 0)
            return recordDate.getTime() === filterDate.getTime()
          })
          filteredExpense = filteredExpense.filter((record) => {
            const recordDate = new Date(record.date)
            recordDate.setHours(0, 0, 0, 0)
            return recordDate.getTime() === filterDate.getTime()
          })
          break
        case "week":
          filterDate.setDate(now.getDate() - 7)
          filterDate.setHours(0, 0, 0, 0)
          filteredIncome = filteredIncome.filter((record) => new Date(record.date) >= filterDate)
          filteredExpense = filteredExpense.filter((record) => new Date(record.date) >= filterDate)
          break
        case "month":
          filterDate.setDate(now.getDate() - 30)
          filterDate.setHours(0, 0, 0, 0)
          filteredIncome = filteredIncome.filter((record) => new Date(record.date) >= filterDate)
          filteredExpense = filteredExpense.filter((record) => new Date(record.date) >= filterDate)
          break
      }
    } else if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999) // Include the entire end date

      filteredIncome = filteredIncome.filter((record) => {
        const recordDate = new Date(record.date)
        return recordDate >= start && recordDate <= end
      })
      filteredExpense = filteredExpense.filter((record) => {
        const recordDate = new Date(record.date)
        return recordDate >= start && recordDate <= end
      })
    }

    // Category filter for expenses
    if (categoryFilter) {
      filteredExpense = filteredExpense.filter((record) =>
        record.category.toLowerCase().includes(categoryFilter.toLowerCase()),
      )
    }

    setFilteredIncomeRecords(filteredIncome)
    setFilteredExpenseRecords(filteredExpense)
  }

  const handleExportIncomeCSV = () => {
    const exportData = filteredIncomeRecords.map((record) => ({
      Date: new Date(record.date).toLocaleDateString(),
      "Customer/Table": record.customerName || `Table ${record.tableNumber}` || "Walk-in",
      "Payment Status": record.paymentStatus,
      "Payment Method": record.paymentMethod,
      Items: record.items.length,
      "Total Amount": record.totalAmount,
      Notes: record.notes || "",
    }))

    exportToCSV(exportData, `income-report-${new Date().toISOString().split("T")[0]}.csv`)
    toast.success("Income report exported successfully")
  }

  const handleExportExpenseCSV = () => {
    const exportData = filteredExpenseRecords.map((record) => ({
      Date: new Date(record.date).toLocaleDateString(),
      Category: record.category,
      Description: record.description,
      Vendor: record.vendor || "",
      Amount: record.amount,
      "Receipt Number": record.receiptNumber || "",
      Notes: record.notes || "",
    }))

    exportToCSV(exportData, `expense-report-${new Date().toISOString().split("T")[0]}.csv`)
    toast.success("Expense report exported successfully")
  }

  const calculateSummary = () => {
    const totalIncome = filteredIncomeRecords.reduce((sum, record) => sum + record.totalAmount, 0)
    const totalExpenses = filteredExpenseRecords.reduce((sum, record) => sum + record.amount, 0)

    // Calculate payment method breakdowns
    const cashIncome = filteredIncomeRecords
      .filter((record) => record.paymentMethod === "cash")
      .reduce((sum, record) => sum + record.totalAmount, 0)

    const digitalIncome = filteredIncomeRecords
      .filter((record) => record.paymentMethod === "digital")
      .reduce((sum, record) => sum + record.totalAmount, 0)

    const pendingPayments = filteredIncomeRecords.filter((record) => record.paymentStatus === "pending").length
    const completedPayments = filteredIncomeRecords.filter((record) => record.paymentStatus === "completed").length
    const averageOrderValue = filteredIncomeRecords.length > 0 ? totalIncome / filteredIncomeRecords.length : 0

    return {
      totalIncome,
      cashIncome,
      digitalIncome,
      totalExpenses,
      profit: totalIncome - totalExpenses,
      totalOrders: filteredIncomeRecords.length,
      totalExpenseRecords: filteredExpenseRecords.length,
      pendingPayments,
      completedPayments,
      averageOrderValue,
    }
  }

  const getDateRangeText = () => {
    switch (dateFilter) {
      case "today":
        return "Today"
      case "week":
        return "Last 7 Days"
      case "month":
        return "Last 30 Days"
      case "custom":
        if (startDate && endDate) {
          return `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
        }
        return "Custom Range"
      default:
        return "All Time"
    }
  }

  const summary = calculateSummary()

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Reports & Analytics</h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Showing data for: {getDateRangeText()}
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Income */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Total Income
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalIncome)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {summary.totalOrders} orders • Avg: {formatCurrency(summary.averageOrderValue)}
              </div>
            </CardContent>
          </Card>

          {/* Cash Income */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Banknote className="h-4 w-4" />
                Cash Income
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.cashIncome)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {summary.totalIncome > 0
                  ? `${((summary.cashIncome / summary.totalIncome) * 100).toFixed(1)}% of total`
                  : "0% of total"}
              </div>
            </CardContent>
          </Card>

          {/* Digital Income */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Digital Income
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.digitalIncome)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {summary.totalIncome > 0
                  ? `${((summary.digitalIncome / summary.totalIncome) * 100).toFixed(1)}% of total`
                  : "0% of total"}
              </div>
            </CardContent>
          </Card>

          {/* Total Expenses */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Total Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalExpenses)}</div>
              <div className="text-xs text-muted-foreground mt-1">{summary.totalExpenseRecords} expense records</div>
            </CardContent>
          </Card>

          {/* Net Profit */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(summary.profit)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {summary.totalIncome > 0
                  ? `${((summary.profit / summary.totalIncome) * 100).toFixed(1)}% margin`
                  : "No income recorded"}
              </div>
            </CardContent>
          </Card>

          {/* Payment Status */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Payment Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Completed:</span>
                  <span className="font-medium">{summary.completedPayments}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-orange-600">Pending:</span>
                  <span className="font-medium">{summary.pendingPayments}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method Breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Payment Methods</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <Banknote className="h-3 w-3" />
                    Cash:
                  </span>
                  <span className="font-medium">
                    {filteredIncomeRecords.filter((r) => r.paymentMethod === "cash").length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <Smartphone className="h-3 w-3" />
                    Digital:
                  </span>
                  <span className="font-medium">
                    {filteredIncomeRecords.filter((r) => r.paymentMethod === "digital").length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Average Order Value */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.averageOrderValue)}</div>
              <div className="text-xs text-muted-foreground mt-1">Based on {summary.totalOrders} orders</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Date Range</Label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last 30 Days</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {dateFilter === "custom" && (
                <>
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>Expense Category</Label>
                <Input
                  placeholder="Filter by category..."
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Records */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="income" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Income Records ({filteredIncomeRecords.length})
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Expense Records ({filteredExpenseRecords.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredIncomeRecords.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No income records found for the selected period
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Payment</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredIncomeRecords.slice(0, 5).map((record) => (
                          <TableRow key={record._id}>
                            <TableCell>
                              <Badge
                                variant={record.paymentStatus === "completed" ? "default" : "destructive"}
                                className="text-xs"
                              >
                                {record.paymentStatus}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {record.paymentMethod === "cash" ? (
                                  <Banknote className="h-3 w-3" />
                                ) : (
                                  <Smartphone className="h-3 w-3" />
                                )}
                                <span className="text-xs capitalize">{record.paymentMethod}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-green-600 font-medium">
                              {formatCurrency(record.totalAmount)}
                            </TableCell>
                            <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredExpenseRecords.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No expense records found for the selected period
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Description</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredExpenseRecords.slice(0, 5).map((record) => (
                          <TableRow key={record._id}>
                            <TableCell className="font-medium">{record.description}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">
                                {record.category}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-red-600 font-medium">{formatCurrency(record.amount)}</TableCell>
                            <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="income" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Income Records</h2>
              <Button onClick={handleExportIncomeCSV} disabled={filteredIncomeRecords.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Export Income CSV
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Detailed Income Records</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div>Loading...</div>
                ) : filteredIncomeRecords.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No income records found for the selected period
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer/Table</TableHead>
                        <TableHead>Payment Status</TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredIncomeRecords.map((record) => (
                        <TableRow key={record._id}>
                          <TableCell>{record.customerName || `Table ${record.tableNumber}` || "Walk-in"}</TableCell>
                          <TableCell>
                            <Badge variant={record.paymentStatus === "completed" ? "default" : "destructive"}>
                              {record.paymentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {record.paymentMethod === "cash" ? (
                                <Banknote className="h-4 w-4" />
                              ) : (
                                <Smartphone className="h-4 w-4" />
                              )}
                              <span className="capitalize">{record.paymentMethod}</span>
                            </div>
                          </TableCell>
                          <TableCell>{record.items.length} items</TableCell>
                          <TableCell className="text-green-600 font-medium">
                            {formatCurrency(record.totalAmount)}
                          </TableCell>
                          <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Expense Records</h2>
              <Button onClick={handleExportExpenseCSV} disabled={filteredExpenseRecords.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Export Expense CSV
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Detailed Expense Records</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div>Loading...</div>
                ) : filteredExpenseRecords.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No expense records found for the selected period
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Receipt #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredExpenseRecords.map((record) => (
                        <TableRow key={record._id}>
                          <TableCell className="font-medium">{record.description}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{record.category}</Badge>
                          </TableCell>
                          <TableCell>{record.vendor || "-"}</TableCell>
                          <TableCell className="text-red-600 font-medium">{formatCurrency(record.amount)}</TableCell>
                          <TableCell>{record.receiptNumber || "-"}</TableCell>
                          <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                          <TableCell>{record.notes || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
