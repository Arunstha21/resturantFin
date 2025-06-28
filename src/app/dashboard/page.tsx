import { Suspense } from "react"
import { Navbar } from "@/components/layout/navbar"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { FinancialChart } from "@/components/dashboard/financial-chart"
import { getDashboardStats, getChartData } from "@/app/actions/dashboard"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { FilterSelect } from "@/components/dashboard/filter-select"

interface DashboardPageProps {
  searchParams: Promise<{ filter?: string }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams = await searchParams
  const filter = resolvedSearchParams.filter || "month"

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="w-full max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1 sm:hidden">Financial overview and analytics</p>
          </div>
          <div className="flex items-center justify-end sm:justify-start">
            <FilterSelect />
          </div>
        </div>

        {/* Content Grid */}
        <div className="space-y-4 sm:space-y-6">
          {/* Stats Cards */}
          <Suspense fallback={<StatsCardsSkeleton />}>
            <StatsCardsWrapper filter={filter} />
          </Suspense>

          {/* Chart Section */}
          <Suspense fallback={<ChartSkeleton />}>
            <ChartWrapper filter={filter} />
          </Suspense>
        </div>
      </main>
    </div>
  )
}

async function StatsCardsWrapper({ filter }: { filter: string }) {
  const stats = await getDashboardStats(filter)
  return <StatsCards stats={stats} />
}

async function ChartWrapper({ filter }: { filter: string }) {
  const chartData = await getChartData(filter)
  return <FinancialChart data={chartData} />
}

function StatsCardsSkeleton() {
  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="min-h-[100px] sm:min-h-[120px]">
          <CardContent className="p-4 sm:p-6">
            <Skeleton className="h-3 sm:h-4 w-[80px] sm:w-[100px] mb-2" />
            <Skeleton className="h-6 sm:h-8 w-[100px] sm:w-[120px]" />
            <Skeleton className="h-2 sm:h-3 w-[60px] sm:w-[80px] mt-2" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ChartSkeleton() {
  return (
    <Card className="w-full">
      <CardContent className="p-4 sm:p-6">
        <div className="space-y-3 mb-4">
          <Skeleton className="h-5 sm:h-6 w-[150px] sm:w-[200px]" />
          <Skeleton className="h-3 sm:h-4 w-[200px] sm:w-[300px]" />
        </div>
        <Skeleton className="h-[300px] sm:h-[400px] w-full rounded-lg" />
      </CardContent>
    </Card>
  )
}
