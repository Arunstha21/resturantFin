"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency } from "@/lib/utils"
import { TrendingUp, TrendingDown, DollarSign, Receipt, CreditCard, RefreshCw, WifiOff, Database } from "lucide-react"
import type { ChartData, DashboardStats } from "@/types"
import { toast } from "sonner"
import { useOffline } from "@/hooks/use-offline"
import { OfflineAPI } from "@/lib/offline/offline-api"
import { Skeleton } from "@/components/ui/skeleton"
import { getChartData } from "../actions/dashboard"
import { FinancialChart } from "@/components/dashboard/financial-chart"

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
    ordersCount: 0,
    expensesCount: 0,
    averageOrderValue: 0,
    pendingPaymentsCount: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState("month")
  const [isFromCache, setIsFromCache] = useState(false)

  const { isOnline, isSyncing, pendingOperations } = useOffline()

  useEffect(() => {
    fetchDashboardStats()
  }, [dateFilter])

  const fetchDashboardStats = async () => {
    setIsLoading(true)
    try {
      const data = await OfflineAPI.getDashboardStats(dateFilter)

      setStats(data)
      setIsFromCache(!!data._fromCache)
    } catch (error) {
      console.error("Error fetching dashboard stats:", error)
      toast.error("Failed to fetch dashboard data")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    fetchDashboardStats()
  }

  const StatCard = ({
    title,
    value,
    description,
    icon: Icon,
    trend,
    trendValue,
  }: {
    title: string
    value: string | number
    description: string
    icon: any
    trend?: "up" | "down" | "neutral"
    trendValue?: string
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs text-muted-foreground">{description}</p>
          {trend && trendValue && (
            <div
              className={`flex items-center gap-1 text-xs ${
                trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-muted-foreground"
              }`}
            >
              {trend === "up" && <TrendingUp className="h-3 w-3" />}
              {trend === "down" && <TrendingDown className="h-3 w-3" />}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
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
              {isFromCache && (
                <Badge variant="outline" className="text-blue-600 border-blue-200">
                  <Database className="h-3 w-3 mr-1" />
                  Cached Data
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="lastWeek">Last Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="lastMonth">Last Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Offline Notice */}
        {!isOnline && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-orange-700">
              <WifiOff className="h-5 w-5" />
              <span className="font-medium">Working Offline</span>
            </div>
            <p className="text-sm text-orange-600 mt-1">
              Dashboard data is from local storage. Connect to the internet to get the latest updates.
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin mr-3" />
            <span className="text-lg">Loading dashboard data...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total Income"
                value={formatCurrency(stats.totalIncome)}
                description={`From ${stats.ordersCount} orders`}
                icon={DollarSign}
                trend="up"
                trendValue="+12.5%"
              />
              <StatCard
                title="Total Expenses"
                value={formatCurrency(stats.totalExpenses)}
                description={`From ${stats.expensesCount} expenses`}
                icon={CreditCard}
                trend="down"
                trendValue="-2.3%"
              />
              <StatCard
                title="Net Profit"
                value={formatCurrency(stats.netProfit)}
                description={`${((stats.netProfit / (stats.totalIncome || 1)) * 100).toFixed(1)}% margin`}
                icon={TrendingUp}
                trend={stats.netProfit >= 0 ? "up" : "down"}
                trendValue={stats.netProfit >= 0 ? "+5.2%" : "-8.1%"}
              />
              <StatCard
                title="Avg Order Value"
                value={formatCurrency(stats.averageOrderValue)}
                description="Per order average"
                icon={Receipt}
                trend="up"
                trendValue="+3.1%"
              />
            </div>

            {/* Additional Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Orders</span>
                    <span className="font-medium">{stats.ordersCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Pending Payments</span>
                    <Badge variant={stats.pendingPaymentsCount > 0 ? "destructive" : "default"}>
                      {stats.pendingPaymentsCount}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Completed Payments</span>
                    <Badge variant="default">{stats.ordersCount - stats.pendingPaymentsCount}</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Financial Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Revenue</span>
                    <span className="font-medium text-green-600">{formatCurrency(stats.totalIncome)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Costs</span>
                    <span className="font-medium text-red-600">{formatCurrency(stats.totalExpenses)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm font-medium">Net Profit</span>
                    <span className={`font-bold ${stats.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(stats.netProfit)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Profit Margin</span>
                    <span className="font-medium">
                      {stats.totalIncome > 0 ? `${((stats.netProfit / stats.totalIncome) * 100).toFixed(1)}%` : "0%"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Avg Order Value</span>
                    <span className="font-medium">{formatCurrency(stats.averageOrderValue)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Orders per Day</span>
                    <span className="font-medium">
                      {dateFilter === "today"
                        ? stats.ordersCount
                        : dateFilter === "week"
                          ? Math.round(stats.ordersCount / 7)
                          : Math.round(stats.ordersCount / 30)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Financial Chart */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Financial Overview</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <ChartSkeleton />
                ) : (
                  <ChartWrapper filter={dateFilter} />
                )}
              </CardContent>
            </Card>
            

            {/* Data Source Info */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span>
                      Data for: {dateFilter === "today" ? "Today" : dateFilter === "week" ? "This Week" : "This Month"}
                    </span>
                    {isFromCache && (
                      <Badge variant="outline" className="text-xs">
                        <Database className="h-3 w-3 mr-1" />
                        From Cache
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Last updated: {new Date().toLocaleTimeString()}</span>
                    {!isOnline && (
                      <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
                        <WifiOff className="h-3 w-3 mr-1" />
                        Offline
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}

function ChartWrapper({ filter }: { filter: string }) {
  const [data, setData] = useState<ChartData[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const chartData = await getChartData(filter)
        setData(chartData)
      } catch (error) {
        console.error("Error fetching chart data:", error)
        toast.error("Failed to load chart data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [filter])

  if (loading || !data) {
    return <ChartSkeleton />
  }
  return <FinancialChart data={data} />
}

function ChartSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <Skeleton className="h-[400px] w-full" />
      </CardContent>
    </Card>
  )
}

