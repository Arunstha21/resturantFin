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

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Dashboard</h1>

          <div className="flex items-center space-x-4">
            <FilterSelect />
          </div>
        </div>

        <div className="space-y-6">
          <Suspense fallback={<StatsCardsSkeleton />}>
            <StatsCardsWrapper filter={filter} />
          </Suspense>

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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <Skeleton className="h-4 w-[100px] mb-2" />
            <Skeleton className="h-8 w-[120px]" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
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
