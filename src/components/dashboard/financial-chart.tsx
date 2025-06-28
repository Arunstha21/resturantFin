"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Area, AreaChart, XAxis, YAxis, ResponsiveContainer, Legend } from "recharts"
import type { ChartData } from "@/types"

interface FinancialChartProps {
  data: ChartData[]
}

const chartConfig = {
  income: {
    label: "Income",
    color: "hsl(142, 76%, 36%)",
  },
  expenses: {
    label: "Expenses",
    color: "hsl(0, 84%, 60%)",
  },
  profit: {
    label: "Profit",
    color: "hsl(221, 83%, 53%)",
  },
}

export function FinancialChart({ data }: FinancialChartProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`
    }
    return `$${value.toFixed(0)}`
  }

  const formatDate = (value: string) => {
    const date = new Date(value)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    // For mobile, show shorter date format
    if (window.innerWidth < 768) {
      if (diffDays <= 7) {
        return date.toLocaleDateString("en-US", { weekday: "short" })
      }
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    }

    // For desktop, show full date
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-lg sm:text-xl">Financial Trends</CardTitle>
            <CardDescription className="text-sm">Income, expenses, and profit over time</CardDescription>
          </div>
          {/* Mobile Legend */}
          <div className="flex flex-wrap gap-4 sm:hidden">
            {Object.entries(chartConfig).map(([key, config]) => (
              <div key={key} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: config.color }} />
                <span className="text-xs font-medium">{config.label}</span>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2 sm:p-6">
        <ChartContainer config={chartConfig} className="h-[300px] sm:h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{
                top: 10,
                right: 10,
                left: 0,
                bottom: 0,
              }}
            >
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
                minTickGap={30}
              />
              <YAxis
                tickFormatter={formatCurrency}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
                width={50}
              />

              {/* Desktop Legend */}
              <Legend
                wrapperStyle={{
                  paddingTop: "20px",
                  fontSize: "14px",
                }}
                className="hidden sm:block"
              />

              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(label) =>
                      new Date(label).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })
                    }
                    formatter={(value, name) => [
                      `$${Number(value).toLocaleString()}`,
                      chartConfig[name as keyof typeof chartConfig]?.label || name,
                    ]}
                    className="w-auto min-w-[200px]"
                  />
                }
              />

              <Area
                type="monotone"
                dataKey="income"
                stackId="1"
                stroke={chartConfig.income.color}
                fill={chartConfig.income.color}
                fillOpacity={0.6}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stackId="2"
                stroke={chartConfig.expenses.color}
                fill={chartConfig.expenses.color}
                fillOpacity={0.6}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="profit"
                stackId="3"
                stroke={chartConfig.profit.color}
                fill={chartConfig.profit.color}
                fillOpacity={0.6}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
