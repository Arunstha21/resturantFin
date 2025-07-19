"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  TrendingUp,
  Package,
  ShoppingCart,
  Calendar,
  Eye,
  BarChart3,
  AlertCircle,
  IndianRupee,
  Search,
  Filter,
  Download,
  RefreshCw,
  Trophy,
  Target,
  Clock,
  ArrowUpRight,
  Minus,
} from "lucide-react"
import { getSalesAnalytics, getItemSalesHistory, getItemPriceHistory } from "@/app/actions/sales-analytics"
import { Navbar } from "@/components/layout/navbar"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { useTheme } from "next-themes"

interface SalesData {
  bestSellingItems: Array<{
    _id: string
    itemName: string
    category: string
    totalQuantitySold: number
    totalRevenue: number
    averagePrice: number
    orderCount: number
    lastSold: string
    allPrices: number[]
  }>
  categorySales: Array<{
    category: string
    totalQuantity: number
    totalRevenue: number
    uniqueItems: number
  }>
  dailySales: Array<{
    date: string
    totalOrders: number
    totalRevenue: number
    totalItems: number
    uniqueItemTypes: number
  }>
  overallStats: {
    totalOrders: number
    totalRevenue: number
    averageOrderValue: number
    totalItemsSold: number
    uniqueItemTypes: number
  }
  dateRange: {
    startDate: string
    endDate: string
    filter: string
  }
  debug?: {
    totalRecordsInDB: number
    filteredRecords: number
    processedOrders: number
    filteringDetails?: {
      recordsInDateRange: number
      recordsWithValidPayment: number
      recordsWithItems: number
      recordsWithItemsAndNames: number
      paymentStatusBreakdown: { [key: string]: number }
      dateRangeInDB: { oldest: string | null; newest: string | null }
    }
  }
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]

export default function SalesAnalytics() {
  const { theme } = useTheme()
  const [salesData, setSalesData] = useState<SalesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState("month")
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [itemHistory, setItemHistory] = useState<any[]>([])
  const [priceHistory, setPriceHistory] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)

  const fetchSalesData = async (filter: string) => {
    setLoading(true)
    try {
      const result = await getSalesAnalytics(filter)

      if (result.success) {
        if (!result.data) return setSalesData(null)
        const data = {
          ...result.data,
          dateRange: {
            ...result.data.dateRange,
            startDate:
              typeof result.data.dateRange.startDate === "string"
                ? result.data.dateRange.startDate
                : result.data.dateRange.startDate.toISOString(),
            endDate:
              typeof result.data.dateRange.endDate === "string"
                ? result.data.dateRange.endDate
                : result.data.dateRange.endDate.toISOString(),
          },
          debug: result.data.debug
            ? {
                ...result.data.debug,
                filteringDetails: result.data.debug.filteringDetails
                  ? {
                      ...result.data.debug.filteringDetails,
                      recordsInDateRange:
                        typeof result.data.debug.filteringDetails.recordsInDateRange === "number"
                          ? result.data.debug.filteringDetails.recordsInDateRange
                          : 0,
                      recordsWithValidPayment:
                        typeof result.data.debug.filteringDetails.recordsWithValidPayment === "number"
                          ? result.data.debug.filteringDetails.recordsWithValidPayment
                          : 0,
                      recordsWithItems:
                        typeof result.data.debug.filteringDetails.recordsWithItems === "number"
                          ? result.data.debug.filteringDetails.recordsWithItems
                          : 0,
                      recordsWithItemsAndNames:
                        typeof result.data.debug.filteringDetails.recordsWithItemsAndNames === "number"
                          ? result.data.debug.filteringDetails.recordsWithItemsAndNames
                          : 0,
                      paymentStatusBreakdown: result.data.debug.filteringDetails.paymentStatusBreakdown || {},
                      dateRangeInDB: result.data.debug.filteringDetails.dateRangeInDB || { oldest: null, newest: null },
                    }
                  : undefined,
              }
            : undefined,
        }
        setSalesData(data as SalesData)
      } else {
        console.error("Failed to fetch sales data:", result.error)
        setSalesData(null)
      }
    } catch (error) {
        console.error("Error fetching sales data:", error)
        setSalesData(null)
    } finally {
      setLoading(false)
    }
  }

  const fetchItemHistory = async (itemName: string) => {
    setHistoryLoading(true)
    try {
      const [historyResult, priceResult] = await Promise.all([
        getItemSalesHistory(itemName),
        getItemPriceHistory(itemName),
      ])


      if (historyResult.success) {
        if (!historyResult.data) {
          setItemHistory([])
        } else {
          setItemHistory(historyResult.data)
        }
      } else {
        console.error("Failed to fetch item history:", historyResult.error)
        setItemHistory([])
      }

      if (priceResult.success) {
        if (!priceResult.data) {
          setPriceHistory([])
        } else {
          setPriceHistory(priceResult.data)
        }
      } else {
        console.error("Failed to fetch price history:", priceResult.error)
        setPriceHistory([])
      }
    } catch (error) {
      console.error("Failed to fetch item history:", error)
      setItemHistory([])
      setPriceHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    fetchSalesData(dateFilter)
  }, [dateFilter])

  const handleDateFilterChange = (value: string) => {
    setDateFilter(value)
  }

  const handleViewItemHistory = (itemName: string) => {
    setSelectedItem(itemName)
    setHistoryDialogOpen(true)
    fetchItemHistory(itemName)
  }

  const handleCloseHistory = () => {
    setHistoryDialogOpen(false)
    setSelectedItem(null)
    setItemHistory([])
    setPriceHistory([])
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  const getPriceVariation = (allPrices: number[]) => {
    if (!allPrices || allPrices.length <= 1) return null
    const min = Math.min(...allPrices)
    const max = Math.max(...allPrices)
    return { min, max, hasVariation: min !== max }
  }

  const getFilteredItems = () => {
    if (!salesData) return []

    let filtered = salesData.bestSellingItems

    if (searchTerm) {
      filtered = filtered.filter((item) => item.itemName.toLowerCase().includes(searchTerm.toLowerCase()))
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter((item) => item.category === categoryFilter)
    }

    return filtered
  }

  const getUniqueCategories = () => {
    if (!salesData) return []
    return Array.from(new Set(salesData.bestSellingItems.map((item) => item.category)))
  }

  // Theme-aware chart colors
  const getChartColors = () => {
    const isDark = theme === "dark"
    return {
      grid: isDark ? "#374151" : "#e2e8f0",
      text: isDark ? "#9ca3af" : "#64748b",
      background: isDark ? "#1f2937" : "#ffffff",
      border: isDark ? "#374151" : "#e2e8f0",
    }
  }

  const chartColors = getChartColors()

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="text-foreground font-medium">{`${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.dataKey}: ${
                entry.dataKey === "revenue" ? formatCurrency(entry.value) : entry.value.toLocaleString()
              }`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-lg font-medium text-foreground">Loading sales analytics...</p>
            <p className="text-sm text-muted-foreground">Analyzing your sales data</p>
          </div>
        </div>
      </div>
    )
  }

  if (!salesData) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="text-center py-16">
          <div className="max-w-md mx-auto">
            <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No sales data available</h3>
            <p className="text-muted-foreground mb-6">We couldn&apos;t find any sales data to analyze</p>
            <Button onClick={() => fetchSalesData(dateFilter)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Prepare chart data
  const dailyChartData = salesData.dailySales.map((day) => ({
    date: formatDate(day.date),
    revenue: day.totalRevenue,
    orders: day.totalOrders,
    items: day.totalItems,
  }))

  const categoryChartData = salesData.categorySales.map((category, index) => ({
    name: category.category,
    value: category.totalRevenue,
    color: COLORS[index % COLORS.length],
  }))

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">Sales Analytics</h1>
              <p className="text-lg text-muted-foreground">Comprehensive insights into your business performance</p>
              {salesData.debug && (
                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                  <Badge variant="outline">
                    <BarChart3 className="h-3 w-3 mr-1" />
                    {salesData.debug.totalRecordsInDB} Total Records
                  </Badge>
                  <Badge variant="outline">
                    <Filter className="h-3 w-3 mr-1" />
                    {salesData.debug.filteredRecords} Filtered
                  </Badge>
                  <Badge variant="outline">
                    <Target className="h-3 w-3 mr-1" />
                    {salesData.debug.processedOrders} Processed
                  </Badge>
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={dateFilter} onValueChange={handleDateFilterChange}>
                <SelectTrigger className="w-[180px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button onClick={() => fetchSalesData(dateFilter)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Data Quality Warning */}
        {salesData.debug && salesData.debug.filteredRecords === 0 && (
          <Card className="mb-8 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-1">
                    No data found for selected period
                  </h3>
                  <p className="text-amber-700 dark:text-amber-300 text-sm">
                    Try selecting a different date range or check if you have income records with items in the selected
                    period.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Total Revenue</CardTitle>
              <IndianRupee className="h-5 w-5 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">{formatCurrency(salesData.overallStats.totalRevenue)}</div>
              <div className="flex items-center text-xs opacity-80">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                <span>+12.5% from last period</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Total Orders</CardTitle>
              <ShoppingCart className="h-5 w-5 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">{salesData.overallStats.totalOrders.toLocaleString()}</div>
              <div className="flex items-center text-xs opacity-80">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                <span>+8.2% from last period</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Items Sold</CardTitle>
              <Package className="h-5 w-5 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">{salesData.overallStats.totalItemsSold.toLocaleString()}</div>
              <div className="flex items-center text-xs opacity-80">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                <span>+15.3% from last period</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Unique Items</CardTitle>
              <BarChart3 className="h-5 w-5 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">{salesData.overallStats.uniqueItemTypes}</div>
              <div className="flex items-center text-xs opacity-80">
                <Minus className="h-3 w-3 mr-1" />
                <span>No change</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Avg Order Value</CardTitle>
              <TrendingUp className="h-5 w-5 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">{formatCurrency(salesData.overallStats.averageOrderValue)}</div>
              <div className="flex items-center text-xs opacity-80">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                <span>+3.7% from last period</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Daily Revenue Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Revenue Trend</CardTitle>
              <CardDescription>Revenue and orders over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis dataKey="date" stroke={chartColors.text} fontSize={12} />
                    <YAxis stroke={chartColors.text} fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: "#3b82f6", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Category Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Category</CardTitle>
              <CardDescription>Distribution of sales across categories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value))}
                      contentStyle={{
                        backgroundColor: chartColors.background,
                        border: `1px solid ${chartColors.border}`,
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="best-sellers" className="space-y-6">
          <TabsList>
            <TabsTrigger value="best-sellers">
              <Trophy className="h-4 w-4 mr-2" />
              Best Sellers
            </TabsTrigger>
            <TabsTrigger value="categories">
              <BarChart3 className="h-4 w-4 mr-2" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="trends">
              <TrendingUp className="h-4 w-4 mr-2" />
              Daily Trends
            </TabsTrigger>
          </TabsList>

          <TabsContent value="best-sellers" className="space-y-6">
            {/* Search and Filter */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search items..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[200px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {getUniqueCategories().map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Best Selling Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
                  Best Selling Items
                </CardTitle>
                <CardDescription>
                  Top performing items ranked by quantity sold ({getFilteredItems().length} items)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getFilteredItems().map((item, ) => {
                    const priceVariation = getPriceVariation(item.allPrices)
                    const originalIndex = salesData.bestSellingItems.findIndex((i) => i._id === item._id)

                    return (
                      <div
                        key={item._id}
                        className="group p-2 border rounded-xl hover:border-primary/50 hover:shadow-lg transition-all duration-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-xl text-lg font-bold shadow-lg">
                              {originalIndex + 1}
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                                {item.itemName}
                              </h3>
                              <div className="flex items-center space-x-2 mt-2">
                                <Badge variant="secondary">{item.category}</Badge>
                                <div className="flex items-center text-sm text-muted-foreground">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Last sold: {formatDate(item.lastSold)}
                                </div>
                              </div>
                              {priceVariation?.hasVariation && (
                                <Badge
                                  variant="outline"
                                  className="text-xs border-orange-200 text-orange-700 bg-orange-50 dark:border-orange-800 dark:text-orange-300 dark:bg-orange-950 mt-2"
                                >
                                  Price varies: {formatCurrency(priceVariation.min)} -{" "}
                                  {formatCurrency(priceVariation.max)}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <div className="text-2xl font-bold">{item.totalQuantitySold}</div>
                              <div className="text-sm text-muted-foreground">units sold</div>
                            </div>
                            <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                              {formatCurrency(item.totalRevenue)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {item.orderCount} orders • Avg: {formatCurrency(item.averagePrice)}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewItemHistory(item.itemName)}
                            className="ml-4"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View History
                          </Button>
                        </div>
                      </div>
                    )
                  })}

                  {getFilteredItems().length === 0 && (
                    <div className="text-center py-16">
                      <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">No items found</h3>
                      <p className="text-muted-foreground">
                        {searchTerm || categoryFilter !== "all"
                          ? "Try adjusting your search or filter criteria"
                          : "No sales data found for the selected period"}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-primary" />
                  Sales by Category
                </CardTitle>
                <CardDescription>Performance breakdown by item categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {salesData.categorySales.map((category, index) => (
                    <div
                      key={category.category}
                      className="p-6 border rounded-xl hover:border-primary/50 hover:shadow-lg transition-all duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <div>
                            <h3 className="text-lg font-semibold">{category.category}</h3>
                            <p className="text-sm text-muted-foreground">{category.uniqueItems} unique items</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">{category.totalQuantity}</div>
                          <div className="text-sm text-muted-foreground mb-1">items sold</div>
                          <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                            {formatCurrency(category.totalRevenue)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {salesData.categorySales.length === 0 && (
                    <div className="text-center py-16">
                      <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">No category data found</h3>
                      <p className="text-muted-foreground">No category data found for the selected period</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
                  Daily Sales Trends
                </CardTitle>
                <CardDescription>Daily breakdown of orders and revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {salesData.dailySales.map((day) => (
                    <div
                      key={day.date}
                      className="p-4 border rounded-lg hover:border-primary/50 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Calendar className="h-5 w-5 text-muted-foreground" />
                          <span className="font-semibold">{formatDate(day.date)}</span>
                        </div>
                        <div className="flex items-center space-x-8 text-sm">
                          <div className="text-center">
                            <div className="text-lg font-semibold">{day.totalOrders}</div>
                            <div className="text-xs text-muted-foreground">Orders</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold">{day.totalItems}</div>
                            <div className="text-xs text-muted-foreground">Items</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold">{day.uniqueItemTypes}</div>
                            <div className="text-xs text-muted-foreground">Types</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                              {formatCurrency(day.totalRevenue)}
                            </div>
                            <div className="text-xs text-muted-foreground">Revenue</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {salesData.dailySales.length === 0 && (
                    <div className="text-center py-16">
                      <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">No daily sales data found</h3>
                      <p className="text-muted-foreground">No daily sales data found for the selected period</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Item History Dialog - Fixed */}
        <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Eye className="h-5 w-5 mr-2 text-primary" />
                Sales History: {selectedItem}
              </DialogTitle>
              <DialogDescription>Detailed sales and price history for this item</DialogDescription>
            </DialogHeader>

            <div className="mt-6">
              {historyLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-muted-foreground">Loading history...</p>
                </div>
              ) : (
                <Tabs defaultValue="sales" className="space-y-6">
                  <TabsList>
                    <TabsTrigger value="sales">Sales History ({itemHistory.length})</TabsTrigger>
                    <TabsTrigger value="prices">Price History ({priceHistory.length})</TabsTrigger>
                  </TabsList>

                  <TabsContent value="sales" className="space-y-3 max-h-96 overflow-y-auto">
                    {itemHistory.length > 0 ? (
                      itemHistory.map((sale, index) => (
                        <div
                          key={`${sale.orderId}-${index}`}
                          className="p-4 border rounded-lg hover:border-primary/50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold">{sale.itemName}</div>
                              <div className="text-sm text-muted-foreground mt-1">
                                {formatDate(sale.date)} • {sale.customerName || "Walk-in Customer"}
                              </div>
                              {sale.paymentStatus && (
                                <Badge variant="outline" className="mt-1 text-xs">
                                  {sale.paymentStatus}
                                </Badge>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">
                                {sale.quantity} × {formatCurrency(sale.price)}
                              </div>
                              <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                                Total: {formatCurrency(sale.total)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">No sales history found for this item</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="prices" className="space-y-3 max-h-96 overflow-y-auto">
                    {priceHistory.length > 0 ? (
                      priceHistory.map((priceData, index) => (
                        <div key={index} className="p-4 border rounded-lg hover:border-primary/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-lg font-semibold">{formatCurrency(priceData.price)}</div>
                              <div className="text-sm text-muted-foreground mt-1">
                                {formatDate(priceData.firstSeen)}
                                {priceData.firstSeen !== priceData.lastSeen && ` - ${formatDate(priceData.lastSeen)}`}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">{priceData.totalQuantity} sold</div>
                              <div className="text-sm text-muted-foreground">{priceData.count} orders</div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <IndianRupee className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">No price history found for this item</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </div>

            <div className="flex justify-end mt-6 pt-6 border-t">
              <Button variant="outline" onClick={handleCloseHistory}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
